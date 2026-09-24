<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Models\Company;
use App\Services\InstallationAddressVerifier;
use App\Support\MaximusAuth;
use App\Support\MaximusPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class InstallationAccessTest extends TestCase
{
    use RefreshDatabase;

    private string $adminToken;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'app.url' => 'http://localhost', 'maximus.central_public_url' => 'https://central.example.com',
            'maximus.deployment_mode' => 'central', 'maximus.installation_company_id' => null,
            'maximus.installation_id' => null, 'maximus.preview_hosts' => ['explicit-preview.example.com'],
        ]);
        foreach (['access-company', 'other-company'] as $id) {
            Company::query()->create([
                'id' => $id, 'name' => $id, 'manager' => 'Direction', 'email' => $id.'@example.com',
                'phone' => '', 'country' => 'Sénégal', 'sector' => 'Commerce', 'status' => 'ACTIF',
                'requested_modules' => ['commerce'], 'requested_module_pack_ids' => [],
                'requested_module_features' => [], 'requested_module_permissions' => [],
            ]);
        }
        $this->installation('install-a', 'access-company', 'on_premise');
        $this->installation('install-b', 'access-company', 'dedicated');
        $this->installation('install-other', 'other-company', 'dedicated');
        $user = AuthUser::query()->create([
            'id' => 'access-admin', 'email' => 'access-admin@example.com',
            'password_hash' => MaximusPassword::hash('Admin123!'), 'display_name' => 'MAXIMUS',
            'phone' => '', 'role' => 'maximus_admin', 'company_id' => null, 'employee_id' => null,
            'sector_ids' => [], 'permissions' => [], 'status' => 'ACTIF',
        ]);
        $this->adminToken = MaximusAuth::issueSession($user);
        $this->withCredentials()->withUnencryptedCookie(MaximusAuth::COOKIE, $this->adminToken);
    }

    private function installation(string $id, string $company, string $mode): void
    {
        DB::table('maximus_installations')->insert([
            'id' => $id, 'company_id' => $company, 'mode' => $mode, 'status' => 'READY',
            'token_hash' => hash('sha256', 'token-'.$id), 'configuration_version' => 1,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function path(string $installation = 'install-a'): string
    {
        return '/api/companies/access-company/installation-access/'.$installation.'/addresses';
    }

    public function test_lists_multiple_installations_and_requires_central_admin(): void
    {
        $this->getJson('/api/companies/access-company/installation-access')->assertOk()
            ->assertJsonCount(2, 'installations')->assertJsonPath('centralLoginUrl', 'https://central.example.com/');
        AuthUser::where('id', 'access-admin')->update(['role' => 'company_admin', 'company_id' => 'access-company']);
        $this->getJson('/api/companies/access-company/installation-access')->assertForbidden();
        config(['maximus.deployment_mode' => 'dedicated', 'maximus.installation_company_id' => 'access-company']);
        $this->getJson('/api/companies/access-company/installation-access')->assertNotFound();
    }

    public function test_company_admin_can_update_profile_from_a_dedicated_installation(): void
    {
        $admin = AuthUser::query()->create([
            'id' => 'dedicated-company-admin',
            'email' => 'admin@access-company.example.com',
            'password_hash' => MaximusPassword::hash('Admin123!'),
            'display_name' => 'Administrateur entreprise',
            'phone' => '',
            'role' => 'company_admin',
            'company_id' => 'access-company',
            'employee_id' => null,
            'sector_ids' => [],
            'permissions' => [],
            'status' => 'ACTIF',
        ]);
        $token = MaximusAuth::issueSession($admin);
        config([
            'maximus.deployment_mode' => 'dedicated',
            'maximus.installation_company_id' => 'access-company',
            'maximus.installation_id' => 'install-b',
        ]);

        $this->withUnencryptedCookie(MaximusAuth::COOKIE, $token)
            ->patchJson('/api/companies/access-company', [
                'name' => 'Entreprise dédiée modifiée',
                'manager' => 'Direction locale',
                'email' => 'direction@access-company.example.com',
                'phone' => '+221 77 000 00 00',
                'country' => 'Sénégal',
                'sector' => 'Commerce',
                'primaryColor' => '#123456',
                'accentColor' => '#ABCDEF',
                'sidebarColor' => '#101820',
            ])
            ->assertOk()
            ->assertJsonPath('company.name', 'Entreprise dédiée modifiée')
            ->assertJsonPath('company.primaryColor', '#123456');

        $this->assertDatabaseHas('companies', [
            'id' => 'access-company',
            'name' => 'Entreprise dédiée modifiée',
            'email' => 'direction@access-company.example.com',
        ]);
    }

    public function test_local_activation_keeps_alias_and_protects_primary_without_network(): void
    {
        $verifier = new class extends InstallationAddressVerifier {
            protected function dnsRecords(string $hostname, int $type): array
            {
                throw new \LogicException('Local validation must never query DNS.');
            }
            protected function fetchIdentity(string $url, string $hostname, string $ip): array
            {
                throw new \LogicException('Local validation must never probe HTTP.');
            }
        };
        $this->app->instance(InstallationAddressVerifier::class, $verifier);
        $first = $this->postJson($this->path(), ['url' => 'http://192.168.10.5:8080/'])->assertCreated()
            ->assertJsonPath('address.validationMethod', 'local')->assertJsonPath('address.verificationName', null)->json('address.id');
        $second = $this->postJson($this->path(), ['url' => 'http://erp.lan'])->assertCreated()->json('address.id');
        $this->postJson($this->path().'/'.$first.'/activate')->assertOk()->assertJsonPath('address.status', 'ACTIVE')
            ->assertJsonPath('address.verifiedAt', null);
        $this->deleteJson($this->path().'/'.$first)->assertConflict();
        $this->postJson($this->path().'/'.$second.'/activate')->assertOk()->assertJsonPath('address.isPrimary', true);
        $this->assertDatabaseHas('maximus_installation_addresses', ['id' => $first, 'status' => 'ACTIVE', 'is_primary' => false]);
        $this->assertDatabaseHas('maximus_installations', ['id' => 'install-a', 'endpoint_url' => 'http://erp.lan', 'configuration_version' => 3]);
        $this->deleteJson($this->path().'/'.$first)->assertOk();
    }

    public function test_revoked_primary_can_be_deleted_and_public_hostname_reassigned(): void
    {
        $id = $this->postJson($this->path('install-b'), ['url' => 'https://reusable.example.com'])->assertCreated()->json('address.id');
        DB::table('maximus_installation_addresses')->where('id', $id)->update(['is_primary' => true, 'status' => 'ACTIVE']);
        DB::table('maximus_installations')->where('id', 'install-b')->update(['endpoint_url' => 'https://reusable.example.com']);
        $this->deleteJson($this->path('install-b').'/'.$id)->assertConflict();
        $this->deleteJson('/api/companies/access-company/installations/install-b')->assertOk();
        $this->deleteJson('/api/companies/other-company/installation-access/install-b/addresses/'.$id)->assertNotFound();
        $this->deleteJson($this->path('install-b').'/'.$id)->assertOk();
        $this->assertDatabaseMissing('maximus_installation_addresses', ['id' => $id]);
        $this->assertDatabaseHas('maximus_installations', [
            'id' => 'install-b', 'endpoint_url' => null, 'configuration_version' => 2, 'status' => 'REVOKED',
        ]);
        $this->postJson('/api/companies/other-company/installation-access/install-other/addresses', [
            'url' => 'https://reusable.example.com',
        ])->assertCreated();
        $this->assertSame(0, DB::table('maximus_installation_addresses')->where('installation_id', 'install-b')->where('is_primary', true)->count());
    }

    public function test_local_origins_are_scoped_by_installation_and_normalized_url_with_port(): void
    {
        DB::table('maximus_installations')->where('id', 'install-other')->update(['mode' => 'on_premise']);
        $otherPath = '/api/companies/other-company/installation-access/install-other/addresses';
        foreach (['http://127.0.0.1:8080', 'http://192.168.1.100', 'http://erp.lan', 'http://localhost:8080', 'http://[::1]:8080'] as $url) {
            $this->postJson($this->path(), ['url' => $url])->assertCreated()->assertJsonPath('address.validationMethod', 'local');
            $id = $this->postJson($otherPath, ['url' => $url])->assertCreated()->json('address.id');
            $this->postJson($otherPath.'/'.$id.'/activate')->assertOk()->assertJsonPath('address.verifiedAt', null);
        }
        $this->postJson($this->path(), ['url' => 'http://ERP.LAN.:80/'])->assertUnprocessable();
        $this->postJson($this->path(), ['url' => 'http://erp.lan:8080'])->assertCreated();
        $this->postJson($this->path(), ['url' => 'https://erp.lan'])->assertCreated();
        $this->postJson($this->path(), ['url' => 'https://erp.lan:443/'])->assertUnprocessable();
        foreach (['http://public.example.com', 'http://192.0.2.1', 'http://0.0.0.0', 'http://224.0.0.1', 'http://erp.lan:0'] as $url) {
            $this->postJson($this->path(), ['url' => $url])->assertUnprocessable();
        }
        $this->postJson($this->path(), ['url' => 'https://public.example.com'])->assertCreated()
            ->assertJsonPath('address.validationMethod', 'public');
        $this->postJson($otherPath, ['url' => 'https://public.example.com'])->assertUnprocessable();
        $this->postJson('/api/ecommerce/domains?companyId=kora', ['domain' => 'public.example.com'])->assertUnprocessable();
    }

    public function test_loopback_aliases_are_only_trusted_when_app_url_is_loopback(): void
    {
        config([
            'app.url' => 'http://localhost:8080', 'maximus.deployment_mode' => 'on_premise',
            'maximus.installation_company_id' => 'access-company', 'maximus.installation_id' => 'install-a',
        ]);
        foreach (['localhost', '127.0.0.1', '[::1]'] as $host) {
            $this->getJson('http://'.$host.':8080/api/installation')->assertOk()->assertJsonPath('entrypoint', 'company')->assertJsonPath('ready', true);
        }
        $this->getJson('http://192.168.1.100:8080/api/installation')->assertOk()->assertJsonPath('entrypoint', 'unknown');
        config(['app.url' => 'http://[::1]:8080']);
        $this->getJson('http://127.0.0.1:8080/api/installation')->assertOk()->assertJsonPath('entrypoint', 'company');
        config(['app.url' => 'https://erp.example.com']);
        foreach (['localhost', '127.0.0.1', '[::1]'] as $host) {
            $this->getJson('http://'.$host.':8080/api/installation')->assertOk()->assertJsonPath('entrypoint', 'unknown')->assertJsonPath('ready', false);
        }
    }

    public function test_ownership_collisions_normalization_and_url_safety(): void
    {
        $id = $this->postJson($this->path('install-b'), ['url' => 'https://ERP.Example.com./'])->assertCreated()
            ->assertJsonPath('address.hostname', 'erp.example.com')->json('address.id');
        $this->postJson($this->path(), ['url' => 'https://erp.example.com'])->assertUnprocessable();
        $this->postJson('/api/ecommerce/domains?companyId=kora', ['domain' => 'ERP.EXAMPLE.COM.'])->assertUnprocessable();
        $this->postJson($this->path('install-other'), ['url' => 'https://other.example.com'])->assertNotFound();
        $this->postJson($this->path().'/'.$id.'/activate')->assertNotFound();
        foreach (['http://erp.example.com', 'https://127.0.0.1', 'https://2130706433', 'https://user:pass@erp.example.com', 'https://erp.example.com/a', 'https://erp.example.com?x=1', 'https://erp.example.com:8443', 'https://central.example.com'] as $url) {
            $this->postJson($this->path('install-b'), ['url' => $url])->assertUnprocessable();
        }
        DB::table('ecommerce_domains')->insert([
            'id' => 'shop-domain', 'company_id' => 'other-company', 'domain' => 'shop.example.com',
            'target_host' => 'central.example.com', 'verification_token' => 'txt', 'status' => 'PENDING',
            'last_error' => '', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->postJson($this->path(), ['url' => 'https://shop.example.com'])->assertUnprocessable();
    }

    public function test_dns_private_ip_and_wrong_installation_fail_before_activation(): void
    {
        $id = $this->postJson($this->path('install-b'), ['url' => 'https://erp.example.com'])->assertCreated()->json('address.id');
        $address = DB::table('maximus_installation_addresses')->where('id', $id)->first();
        $verifier = new class($address->verification_value) extends InstallationAddressVerifier {
            public string $ip = '127.0.0.1';
            public bool $called = false;
            public function __construct(private string $txt) {}
            protected function dnsRecords(string $hostname, int $type): array
            {
                return $type === DNS_TXT ? [['txt' => $this->txt]] : [['ip' => $this->ip]];
            }
            protected function fetchIdentity(string $url, string $hostname, string $ip): array
            {
                $this->called = true;
                return ['installationId' => 'install-other', 'company' => ['id' => 'other-company'], 'mode' => 'dedicated'];
            }
        };
        $this->app->instance(InstallationAddressVerifier::class, $verifier);
        $this->postJson($this->path('install-b').'/'.$id.'/activate')->assertUnprocessable()->assertJsonPath('address.status', 'ERROR');
        $this->assertFalse($verifier->called);
        foreach (['10.0.0.1', '169.254.169.254', '100.64.0.1', '::1', '::ffff:127.0.0.1', '2002:7f00:1::', '192.0.2.1'] as $ip) {
            $verifier->ip = $ip;
            $this->postJson($this->path('install-b').'/'.$id.'/activate')->assertUnprocessable();
            $this->assertFalse($verifier->called);
        }
        $verifier->ip = '93.184.216.34';
        $this->postJson($this->path('install-b').'/'.$id.'/verify')->assertUnprocessable();
        $this->assertTrue($verifier->called);
        $this->assertDatabaseHas('maximus_installation_addresses', ['id' => $id, 'is_primary' => false, 'status' => 'ERROR']);
    }

    public function test_public_verification_and_activation_require_identity_and_txt(): void
    {
        $id = $this->postJson($this->path('install-b'), ['url' => 'https://erp.example.com'])->assertCreated()->json('address.id');
        $address = DB::table('maximus_installation_addresses')->where('id', $id)->first();
        $verifier = new class($address->verification_value) extends InstallationAddressVerifier {
            public bool $hasProof = true;
            public function __construct(private string $txt) {}
            protected function dnsRecords(string $hostname, int $type): array
            {
                return $type === DNS_TXT ? ($this->hasProof ? [['txt' => $this->txt]] : []) : [['ip' => '93.184.216.34']];
            }
            protected function fetchIdentity(string $url, string $hostname, string $ip): array
            {
                return ['installationId' => 'install-b', 'company' => ['id' => 'access-company'], 'mode' => 'dedicated'];
            }
        };
        $this->app->instance(InstallationAddressVerifier::class, $verifier);
        $this->postJson($this->path('install-b').'/'.$id.'/verify')->assertOk()->assertJsonPath('address.status', 'VERIFIED');
        $this->postJson($this->path('install-b').'/'.$id.'/activate')->assertOk()->assertJsonPath('address.status', 'ACTIVE');
        $verifier->hasProof = false;
        $this->postJson($this->path('install-b').'/'.$id.'/activate')->assertUnprocessable()->assertJsonPath('address.status', 'ERROR');
    }

    public function test_host_resolution_is_explicit_and_installation_bound(): void
    {
        $this->getJson('http://localhost/api/installation')->assertOk()->assertJsonPath('entrypoint', 'central');
        $this->getJson('https://explicit-preview.example.com/api/installation')->assertOk()->assertJsonPath('entrypoint', 'central');
        $this->getJson('https://arbitrary.example.com/api/installation')->assertOk()->assertJsonPath('entrypoint', 'unknown')->assertJsonPath('loginUrl', null);
        $this->postJson('https://arbitrary.example.com/api/auth/login', [])->assertForbidden();
        $id = $this->postJson($this->path(), ['url' => 'http://erp.lan'])->assertCreated()->json('address.id');
        $this->postJson($this->path().'/'.$id.'/activate')->assertOk();
        config(['maximus.deployment_mode' => 'on_premise', 'maximus.installation_company_id' => 'access-company', 'maximus.installation_id' => 'install-a']);
        $this->getJson('http://erp.lan/api/installation')->assertOk()->assertJsonPath('entrypoint', 'company')->assertJsonPath('installationId', 'install-a')
            ->assertJsonPath('canonicalUrl', 'http://erp.lan');
        config(['maximus.installation_id' => 'install-b']);
        $this->getJson('http://erp.lan/api/installation')->assertOk()->assertJsonPath('entrypoint', 'unknown');
        config(['maximus.deployment_mode' => 'typo']);
        $this->getJson('http://localhost/api/installation')->assertOk()->assertJsonPath('entrypoint', 'unknown')->assertJsonPath('ready', false);
        $this->postJson('/api/auth/login', [])->assertForbidden();
    }

    public function test_only_active_shop_domains_are_classified_as_shop(): void
    {
        DB::table('ecommerce_domains')->insert([
            'id' => 'public-shop-domain', 'company_id' => 'other-company', 'domain' => 'shop.example.com',
            'target_host' => 'central.example.com', 'verification_token' => 'txt', 'status' => 'PENDING',
            'last_error' => '', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->getJson('https://shop.example.com/api/installation')->assertOk()->assertJsonPath('entrypoint', 'unknown');
        DB::table('ecommerce_domains')->where('id', 'public-shop-domain')->update(['status' => 'ACTIVE']);
        $this->getJson('https://shop.example.com/api/installation')->assertOk()->assertJsonPath('entrypoint', 'shop')
            ->assertJsonPath('ready', true)->assertJsonPath('canonicalUrl', null)
            ->assertJsonPath('adminLoginEnabled', false)->assertJsonPath('registrationEnabled', false);
        config(['maximus.deployment_mode' => 'dedicated', 'maximus.installation_company_id' => 'access-company']);
        $this->getJson('https://shop.example.com/api/installation')->assertOk()->assertJsonPath('entrypoint', 'unknown');
        config(['maximus.installation_company_id' => 'other-company']);
        $this->getJson('https://shop.example.com/api/installation')->assertOk()->assertJsonPath('entrypoint', 'shop')
            ->assertJsonPath('ready', true)->assertJsonPath('adminLoginEnabled', false)->assertJsonPath('registrationEnabled', false);
        Company::where('id', 'other-company')->update(['status' => 'INACTIF']);
        $this->getJson('https://shop.example.com/api/installation')->assertOk()->assertJsonPath('entrypoint', 'shop')
            ->assertJsonPath('ready', false);
    }

    public function test_https_probe_pins_dns_verifies_tls_and_rejects_redirects(): void
    {
        $this->assertTrue(extension_loaded('curl'), 'Secure production verifier requires cURL.');
        $verifier = new class extends InstallationAddressVerifier {
            public function probe(): array
            {
                return $this->fetchIdentity('https://erp.example.com', 'erp.example.com', '93.184.216.34');
            }
        };
        Http::preventStrayRequests();
        Http::fake(function ($request, $options) {
            $this->assertSame('https://erp.example.com/api/installation', $request->url());
            $this->assertTrue($options['verify']);
            $this->assertFalse($options['allow_redirects']);
            $this->assertSame('', $options['proxy']);
            $this->assertSame(['erp.example.com:443:93.184.216.34'], $options['curl'][CURLOPT_RESOLVE]);
            $this->assertSame(CURLPROTO_HTTPS, $options['curl'][CURLOPT_PROTOCOLS]);
            return Http::response('', 302, ['Location' => 'http://169.254.169.254/']);
        });
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('redirections interdites');
        $verifier->probe();
    }

    public function test_scoped_token_renewal_revoke_and_sync_configuration(): void
    {
        $this->postJson('/api/companies/access-company/installation', ['mode' => 'dedicated'])->assertConflict();
        $this->postJson('/api/companies/access-company/installation', ['mode' => 'dedicated', 'createNew' => true])->assertCreated();
        $this->postJson('/api/companies/access-company/installations/install-other', ['mode' => 'dedicated'])->assertNotFound();
        $this->deleteJson('/api/companies/access-company/installations/install-b')->assertOk();
        $this->assertDatabaseHas('maximus_installations', ['id' => 'install-a', 'revoked_at' => null]);
        $this->postJson($this->path('install-b'), ['url' => 'https://new.example.com'])->assertConflict();
        $id = $this->postJson($this->path(), ['url' => 'http://erp.lan'])->assertCreated()->json('address.id');
        $this->postJson($this->path().'/'.$id.'/activate')->assertOk();
        $this->withHeader('Authorization', 'Bearer token-install-a')->getJson('/api/installation-sync/configuration')
            ->assertOk()->assertJsonPath('erpAccess.canonicalUrl', 'http://erp.lan')
            ->assertJsonPath('erpAccess.allowedHosts.0', 'erp.lan')
            ->assertJsonPath('company.primaryColor', '#F2B705');
    }

    public function test_sync_configuration_includes_an_active_module_added_after_registration(): void
    {
        Company::query()->whereKey('access-company')->update(['requested_modules' => []]);
        DB::table('maximus_company_modules')->updateOrInsert(
            ['company_id' => 'access-company', 'module_id' => 'paie'],
            [
                'id' => 'company-module-access-company-paie',
                'status' => 'ACTIF',
                'feature_ids' => json_encode([]),
                'configuration' => json_encode([]),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );

        $this->withHeader('Authorization', 'Bearer token-install-a')
            ->getJson('/api/installation-sync/configuration')
            ->assertOk()
            ->assertJsonPath('modules.ids.0', 'paie');
    }

    public function test_payment_authorization_changes_are_versioned_and_included_in_sync_configuration(): void
    {
        $this->patchJson('/api/companies/access-company/payment-settings', [
            'enabled' => false,
            'providers' => ['DIAMANOPAY'],
        ])->assertOk()
            ->assertJsonPath('enabled', false)
            ->assertJsonPath('providers.0', 'DIAMANOPAY');

        $this->assertDatabaseHas('maximus_installations', ['id' => 'install-a', 'configuration_version' => 2]);
        $this->assertDatabaseHas('maximus_installations', ['id' => 'install-b', 'configuration_version' => 2]);
        $this->assertDatabaseHas('maximus_installations', ['id' => 'install-other', 'configuration_version' => 1]);

        $this->withHeader('Authorization', 'Bearer token-install-a')
            ->getJson('/api/installation-sync/configuration')
            ->assertOk()
            ->assertJsonPath('paymentAccess.companyId', 'access-company')
            ->assertJsonPath('paymentAccess.status', 'INACTIF')
            ->assertJsonPath('paymentAccess.enabled', false)
            ->assertJsonPath('paymentAccess.providers.0', 'DIAMANOPAY');
    }

    public function test_known_revoked_token_has_explicit_code_but_unknown_token_does_not(): void
    {
        DB::table('maximus_installations')->where('id', 'install-a')->update(['revoked_at' => now()]);
        DB::table('maximus_installations')->where('id', 'install-b')->update(['status' => 'REVOKED']);
        foreach (['install-a', 'install-b'] as $id) {
            $response = $this->withHeader('Authorization', 'Bearer token-'.$id)
                ->getJson('/api/installation-sync/configuration')->assertUnauthorized()
                ->assertJsonPath('code', 'INSTALLATION_REVOKED');
            $this->assertStringNotContainsString('token-'.$id, $response->getContent());
            $this->assertStringNotContainsString(hash('sha256', 'token-'.$id), $response->getContent());
        }
        $this->withHeader('Authorization', 'Bearer unknown-token')
            ->getJson('/api/installation-sync/configuration')->assertUnauthorized()->assertJsonMissingPath('code');
        $this->withHeader('Authorization', 'Bearer token-install-other')
            ->getJson('/api/installation-sync/configuration')->assertOk()->assertJsonPath('installation.id', 'install-other');
    }

    public function test_dedicated_and_on_premise_admins_can_manage_only_their_local_logo(): void
    {
        Storage::fake('public');
        foreach (['dedicated', 'on_premise'] as $mode) {
            AuthUser::where('id', 'access-admin')->update(['role' => 'company_admin', 'company_id' => 'access-company']);
            config([
                'maximus.deployment_mode' => $mode, 'maximus.installation_company_id' => 'access-company',
                'maximus.installation_id' => $mode === 'dedicated' ? 'install-b' : 'install-a',
            ]);
            $url = '/api/companies/access-company/profile-photo';
            $upload = $this->post($url, ['photo' => UploadedFile::fake()->image('local-logo.png')])->assertOk();
            $photo = $upload->json('company.profilePhoto');
            $this->assertNotEmpty(Company::findOrFail('access-company')->profile_photo_data);
            $this->get($photo)->assertOk()->assertHeader('Content-Type', 'image/png');
            $this->getJson('/api/installation')->assertOk()->assertJsonPath('company.profilePhoto', $photo);
            $this->get('/api/company-profile-images/other-company/other.png')->assertNotFound();
            $this->post('/api/companies/other-company/profile-photo', [
                'photo' => UploadedFile::fake()->image('forbidden.png'),
            ])->assertForbidden();
            $this->deleteJson('/api/companies/other-company/profile-photo')->assertForbidden();
            AuthUser::where('id', 'access-admin')->update(['role' => 'employee']);
            $this->post($url, ['photo' => UploadedFile::fake()->image('employee.png')])->assertForbidden();
            $this->deleteJson($url)->assertForbidden();
            $this->assertSame($photo, Company::findOrFail('access-company')->profile_photo);
            AuthUser::where('id', 'access-admin')->update(['role' => 'company_admin', 'company_id' => 'other-company']);
            $this->deleteJson($url)->assertUnauthorized(); // Installation session guard rejects another tenant.
            AuthUser::where('id', 'access-admin')->update(['company_id' => 'access-company']);
            $this->deleteJson($url)->assertOk()->assertJsonPath('company.profilePhoto', null);
            $this->assertDatabaseHas('companies', [
                'id' => 'access-company', 'profile_photo' => null, 'profile_photo_data' => null, 'profile_photo_mime' => null,
            ]);
        }
    }

    private function cutoverUser(string $role = 'company_admin'): AuthUser
    {
        Company::where('id', 'access-company')->update([
            'login_slug' => 'access-company', 'login_mode' => 'CUSTOM', 'login_custom_allowed' => true,
        ]);
        return AuthUser::query()->create([
            'id' => 'cutover-'.$role, 'email' => 'cutover-'.$role.'@example.com',
            'password_hash' => MaximusPassword::hash('Admin123!'), 'display_name' => 'Équipe entreprise',
            'phone' => '', 'role' => $role, 'company_id' => 'access-company', 'employee_id' => null,
            'sector_ids' => [], 'permissions' => [], 'status' => 'ACTIF',
        ]);
    }

    public function test_enabling_custom_login_activates_the_branded_link_and_login(): void
    {
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);
        $response = $this->patchJson('/api/companies/access-company/login-settings', [
            'customAllowed' => true,
        ])->assertOk();

        $response->assertJsonPath('settings.customAllowed', true)
            ->assertJsonPath('settings.mode', 'CUSTOM')
            ->assertJsonPath('settings.url', '/entreprise/access-company/connexion')
            ->assertJsonPath('company.loginUrl', '/entreprise/access-company/connexion');

        $user = $this->cutoverUser();
        $this->postJson('/api/auth/company-login/access-company', [
            'email' => $user->email,
            'password' => 'Admin123!',
        ])->assertOk()->assertJsonPath('user.companyId', 'access-company');
    }

    public function test_cutover_is_explicit_blocks_both_central_logins_and_sessions_and_can_be_rolled_back(): void
    {
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);
        $user = $this->cutoverUser();
        $oldSession = MaximusAuth::issueSession($user);
        $credentials = ['email' => $user->email, 'password' => 'Admin123!'];
        $generic = '/api/auth/login';
        $slug = '/api/auth/company-login/access-company';
        $select = '/api/companies/access-company/installation-access/install-a/use-as-primary';
        $this->getJson('/api/companies/access-company/installation-access')->assertOk()->assertJsonPath('primaryInstallationId', null);
        $id = $this->postJson($this->path(), ['url' => 'http://erp.lan'])->assertCreated()->json('address.id');
        $this->postJson($this->path().'/'.$id.'/activate')->assertOk();
        // A personalized company always uses its branded login, even before dedicated cutover.
        $this->postJson($generic, $credentials)->assertForbidden()
            ->assertJsonPath('code', 'COMPANY_CUSTOM_LOGIN')
            ->assertJsonMissingPath('loginUrl')
            ->assertJsonPath('error', 'Connexion refusée : cette entreprise utilise une page de connexion personnalisée. Utilisez le lien personnalisé communiqué par MAXIMUS ou par son administrateur.');
        $this->postJson($slug, $credentials)->assertOk();
        $this->postJson($select, ['confirmedReady' => true])->assertOk()->assertJsonPath('primaryInstallationId', 'install-a');
        $this->getJson('/api/companies/access-company/installation-access')->assertOk()->assertJsonPath('primaryInstallationId', 'install-a');
        $this->assertFalse(MaximusAuth::canAuthenticate($user));
        $this->postJson($generic, ['email' => $user->email, 'password' => 'Wrong123!'])->assertUnauthorized()->assertJsonMissingPath('code');
        foreach ([$generic, $slug] as $route) {
            $this->postJson($route, $credentials)->assertForbidden()->assertJsonPath('code', 'COMPANY_DEDICATED_ACCESS')
                ->assertJsonPath('loginUrl', 'http://erp.lan/')->assertCookieMissing(MaximusAuth::COOKIE)->assertHeaderMissing('Location');
        }
        $this->withUnencryptedCookie(MaximusAuth::COOKIE, $oldSession);
        $this->getJson('/api/auth/session')->assertForbidden()->assertJsonPath('code', 'COMPANY_DEDICATED_ACCESS');
        $this->getJson('/api/app-state/bootstrap')->assertForbidden()->assertJsonPath('code', 'COMPANY_DEDICATED_ACCESS');
        $this->assertDatabaseHas('auth_sessions', ['token_hash' => MaximusAuth::hashToken($oldSession)]);
        foreach (['on_premise', 'dedicated'] as $mode) {
            config(['maximus.deployment_mode' => $mode, 'maximus.installation_company_id' => 'access-company', 'maximus.installation_id' => 'install-a']);
            $this->postJson($generic, $credentials)->assertOk();
            $this->postJson($slug, $credentials)->assertOk();
            $this->getJson('/api/auth/session')->assertOk()->assertJsonPath('user.companyId', 'access-company');
        }
        config(['maximus.deployment_mode' => 'central', 'maximus.installation_company_id' => null, 'maximus.installation_id' => null]);
        $this->withUnencryptedCookie(MaximusAuth::COOKIE, $this->adminToken);
        $this->getJson('/api/auth/session')->assertOk()->assertJsonPath('user.role', 'maximus_admin');
        $this->deleteJson('/api/companies/access-company/installation-access/primary')->assertOk()->assertJsonPath('primaryInstallationId', null);
        $this->postJson($generic, $credentials)->assertForbidden()
            ->assertJsonPath('code', 'COMPANY_CUSTOM_LOGIN');
        $this->postJson($slug, $credentials)->assertOk();
        $this->withUnencryptedCookie(MaximusAuth::COOKIE, $oldSession)->getJson('/api/auth/session')->assertOk()->assertJsonPath('user.companyId', 'access-company');
        $this->assertDatabaseHas('auth_users', ['id' => $user->id, 'status' => 'ACTIF']);
    }

    public function test_primary_selection_requires_admin_scope_readiness_and_active_primary_address(): void
    {
        $select = '/api/companies/access-company/installation-access/install-a/use-as-primary';
        $this->postJson($select, [])->assertUnprocessable();
        $this->postJson($select, ['confirmedReady' => false])->assertUnprocessable();
        $this->postJson($select, ['confirmedReady' => 1])->assertUnprocessable();
        $this->postJson($select, ['confirmedReady' => true])->assertConflict();
        $this->postJson('/api/companies/access-company/installation-access/install-other/use-as-primary', ['confirmedReady' => true])->assertNotFound();
        $id = $this->postJson($this->path(), ['url' => 'http://erp.lan'])->assertCreated()->json('address.id');
        $this->postJson($select, ['confirmedReady' => true])->assertConflict();
        $this->postJson($this->path().'/'.$id.'/activate')->assertOk();
        Company::where('id', 'access-company')->update(['status' => 'INACTIF']);
        $this->postJson($select, ['confirmedReady' => true])->assertConflict();
        Company::where('id', 'access-company')->update(['status' => 'ACTIF']);
        $companyAdmin = $this->cutoverUser();
        $this->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($companyAdmin));
        $this->postJson($select, ['confirmedReady' => true])->assertForbidden();
        $this->deleteJson('/api/companies/access-company/installation-access/primary')->assertForbidden();
        $this->withUnencryptedCookie(MaximusAuth::COOKIE, $this->adminToken);
        $this->deleteJson('/api/companies/access-company/installations/install-a')->assertOk();
        $this->postJson($select, ['confirmedReady' => true])->assertConflict();
        $this->assertDatabaseHas('companies', ['id' => 'access-company', 'erp_installation_id' => null]);
    }

    public function test_cutover_never_falls_back_on_revocation_or_unavailable_address_and_employees_remain_blocked(): void
    {
        $user = $this->cutoverUser('employee');
        $session = MaximusAuth::issueSession($user);
        $id = $this->postJson($this->path(), ['url' => 'http://erp.lan'])->assertCreated()->json('address.id');
        $this->postJson($this->path().'/'.$id.'/activate')->assertOk();
        $this->postJson('/api/companies/access-company/installation-access/install-a/use-as-primary', ['confirmedReady' => true])->assertOk();
        // Broken or unsafe saved addresses suppress the link, never the cutover policy.
        foreach ([
            ['status' => 'ERROR'],
            ['status' => 'ACTIVE', 'url' => 'https://attacker.example.com'],
            ['status' => 'ACTIVE', 'url' => 'javascript:alert(1)'],
        ] as $change) {
            DB::table('maximus_installation_addresses')->where('id', $id)->update($change);
            $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'Admin123!'])
                ->assertForbidden()->assertJsonPath('code', 'COMPANY_DEDICATED_ACCESS')->assertJsonPath('loginUrl', null);
        }
        $this->deleteJson('/api/companies/access-company/installations/install-a')->assertOk();
        $this->deleteJson($this->path().'/'.$id)->assertOk();
        $this->withUnencryptedCookie(MaximusAuth::COOKIE, $session)->getJson('/api/auth/session')
            ->assertForbidden()->assertJsonPath('code', 'COMPANY_DEDICATED_ACCESS')->assertJsonPath('loginUrl', null);
        $this->assertDatabaseHas('companies', ['id' => 'access-company', 'erp_installation_id' => 'install-a']);
        $this->assertFalse(MaximusAuth::canAuthenticate($user));
    }
}