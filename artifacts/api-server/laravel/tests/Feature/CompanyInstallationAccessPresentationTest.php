<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Models\Company;
use App\Support\CompanyInstallationAccess;
use App\Support\MaximusAuth;
use App\Support\MaximusPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CompanyInstallationAccessPresentationTest extends TestCase
{
    use RefreshDatabase;

    private string $adminToken;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'maximus.deployment_mode' => 'central',
            'maximus.installation_company_id' => null,
            'maximus.installation_id' => null,
            'maximus.central_public_url' => 'https://central.example.com',
        ]);

        foreach (['company-a', 'company-b'] as $id) {
            Company::query()->create([
                'id' => $id,
                'name' => strtoupper($id),
                'manager' => 'Direction',
                'email' => $id.'@example.com',
                'phone' => '',
                'country' => 'Sénégal',
                'sector' => 'Commerce',
                'status' => 'ACTIF',
                'requested_modules' => ['commerce'],
                'requested_module_pack_ids' => [],
                'requested_module_features' => [],
                'requested_module_permissions' => [],
            ]);
        }

        $admin = AuthUser::query()->create([
            'id' => 'presentation-admin',
            'email' => 'presentation-admin@example.com',
            'password_hash' => MaximusPassword::hash('Admin123!'),
            'display_name' => 'MAXIMUS',
            'phone' => '',
            'role' => 'maximus_admin',
            'company_id' => null,
            'employee_id' => null,
            'sector_ids' => [],
            'permissions' => [],
            'status' => 'ACTIF',
        ]);
        $this->adminToken = MaximusAuth::issueSession($admin);
        $this->withCredentials()->withUnencryptedCookie(MaximusAuth::COOKIE, $this->adminToken);
    }

    public function test_newly_issued_installation_is_ready_but_only_presented_as_prepared_without_cutover(): void
    {
        $issued = $this->postJson('/api/companies/company-a/installation', [
            'mode' => 'dedicated',
            'createNew' => true,
        ])->assertCreated();

        $this->assertSame('READY', $issued->json('installation.status'));
        $this->assertSame([
            'state' => 'prepared',
            'installationId' => null,
            'mode' => null,
            'endpointUrl' => null,
        ], CompanyInstallationAccess::forCompany('company-a'));

        $this->getJson('/api/companies/company-a/installation-access')
            ->assertOk()
            ->assertJsonPath('presentation.state', 'prepared')
            ->assertJsonPath('presentation.installationId', null)
            ->assertJsonPath('presentation.endpointUrl', null);
    }

    public function test_primary_dedicated_installation_promotes_only_its_approved_active_address(): void
    {
        $this->insertInstallation('install-a', 'company-a', 'dedicated', 'CONNECTED');
        $this->insertAddress('address-a', 'install-a', 'https://erp.company-a.example');
        DB::table('companies')->where('id', 'company-a')->update(['erp_installation_id' => 'install-a']);

        $expected = [
            'state' => 'primary',
            'installationId' => 'install-a',
            'mode' => 'dedicated',
            'endpointUrl' => 'https://erp.company-a.example',
        ];
        $this->assertSame($expected, CompanyInstallationAccess::forCompany('company-a'));

        $this->getJson('/api/companies/company-a/installation-access')
            ->assertOk()
            ->assertJsonPath('presentation', $expected);
        $this->patchJson('/api/companies/company-a', [
            'name' => 'COMPANY-A',
            'manager' => 'Direction',
            'email' => 'company-a@example.com',
            'phone' => '',
            'country' => 'Sénégal',
            'sector' => 'Commerce',
        ])->assertOk()->assertJsonPath('company.installationAccess', $expected);
    }

    public function test_revoked_missing_and_cross_company_primary_pointers_are_unavailable_without_link_fallback(): void
    {
        $this->insertInstallation('install-a', 'company-a', 'dedicated', 'REVOKED', now());
        $this->insertAddress('address-a', 'install-a', 'https://revoked.example');
        DB::table('companies')->where('id', 'company-a')->update(['erp_installation_id' => 'install-a']);

        $this->assertUnavailable('company-a', 'install-a', 'dedicated');

        DB::table('companies')->where('id', 'company-a')->update(['erp_installation_id' => 'missing-installation']);
        $this->assertUnavailable('company-a', 'missing-installation', null);

        $this->insertInstallation('install-b', 'company-b', 'on_premise', 'READY');
        $this->insertAddress('address-b', 'install-b', 'http://erp.company-b.lan');
        DB::table('companies')->where('id', 'company-a')->update(['erp_installation_id' => 'install-b']);
        $this->assertUnavailable('company-a', 'install-b', null);
    }

    public function test_workspace_forgery_is_replaced_by_authoritative_installation_state(): void
    {
        $this->insertInstallation('install-a', 'company-a', 'dedicated', 'READY');
        DB::table('maximus_app_states')->insert([
            'scope' => 'workspace',
            'payload' => json_encode([
                'companies' => [[
                    'id' => 'company-a',
                    'name' => 'COMPANY-A',
                    'manager' => 'Direction',
                    'email' => 'company-a@example.com',
                    'phone' => '',
                    'country' => 'Sénégal',
                    'sector' => 'Commerce',
                    'status' => 'ACTIF',
                    'requestedModules' => ['commerce'],
                    'allowedModules' => ['commerce'],
                    'refusedModules' => [],
                    'createdAt' => now()->toISOString(),
                    'installationAccess' => [
                        'state' => 'primary',
                        'installationId' => 'forged',
                        'mode' => 'dedicated',
                        'endpointUrl' => 'https://attacker.example',
                    ],
                ]],
                'employees' => [],
                'roles' => [],
                'orgNodes' => [],
            ], JSON_THROW_ON_ERROR),
            'version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->getJson('/api/app-state/bootstrap')
            ->assertOk()
            ->assertJsonPath('data.companies.0.installationAccess.state', 'prepared')
            ->assertJsonPath('data.companies.0.installationAccess.installationId', null)
            ->assertJsonPath('data.companies.0.installationAccess.endpointUrl', null)
            ->assertJsonMissing(['attacker.example', 'forged']);
    }

    private function assertUnavailable(string $companyId, string $installationId, ?string $mode): void
    {
        $expected = [
            'state' => 'unavailable',
            'installationId' => $installationId,
            'mode' => $mode,
            'endpointUrl' => null,
        ];
        $this->assertSame($expected, CompanyInstallationAccess::forCompany($companyId));
        $this->getJson("/api/companies/{$companyId}/installation-access")
            ->assertOk()
            ->assertJsonPath('presentation', $expected)
            ->assertJsonPath('presentation.endpointUrl', null)
            ->assertJsonMissingPath('presentation.centralLoginUrl');
    }

    private function insertInstallation(
        string $id,
        string $companyId,
        string $mode,
        string $status,
        mixed $revokedAt = null,
    ): void {
        DB::table('maximus_installations')->insert([
            'id' => $id,
            'company_id' => $companyId,
            'mode' => $mode,
            'status' => $status,
            'token_hash' => hash('sha256', 'token-'.$id),
            'configuration_version' => 1,
            'revoked_at' => $revokedAt,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function insertAddress(string $id, string $installationId, string $url): void
    {
        DB::table('maximus_installation_addresses')->insert([
            'id' => $id,
            'installation_id' => $installationId,
            'url' => $url,
            'hostname' => (string) parse_url($url, PHP_URL_HOST),
            'status' => 'ACTIVE',
            'is_primary' => true,
            'validation_method' => str_starts_with($url, 'https://') ? 'public' : 'local',
            'verified_at' => str_starts_with($url, 'https://') ? now() : null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}