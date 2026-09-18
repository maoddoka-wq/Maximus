<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\AuthUser;
use App\Models\AuthSession;
use App\Services\InstallationSyncService;
use App\Support\ApplicationIdentity;
use App\Support\InstallationSyncState;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Env;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class InstallationResilienceTest extends TestCase
{
    use RefreshDatabase;

    private string $isolatedStorage;
    private mixed $previousBuild;

    public function createApplication()
    {
        $app = parent::createApplication();
        $app['config']->set('database.default', 'sqlite');
        $app['config']->set('database.connections.sqlite.database', ':memory:');
        $app['config']->set('database.connections.sqlite.url', null);
        $app['config']->set('cache.default', 'array');
        return $app;
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->isolatedStorage = sys_get_temp_dir().'/maximus-sync-test-'.bin2hex(random_bytes(10));
        $this->app->useStoragePath($this->isolatedStorage);
        $this->previousBuild = Env::get('MAXIMUS_BUILD_VERSION');
        Env::getRepository()->set('MAXIMUS_BUILD_VERSION', 'test-build');
        config([
            'maximus.deployment_mode' => 'dedicated',
            'maximus.installation_company_id' => 'sync-company',
            'maximus.installation_id' => 'sync-installation',
            'maximus.expected_application_version' => 'test-build',
            'maximus.central_url' => 'https://central.example.test',
            'maximus.installation_token' => 'test-only-not-a-secret',
        ]);
        Http::preventStrayRequests();
    }

    protected function tearDown(): void
    {
        if ($this->previousBuild === null) {
            Env::getRepository()->clear('MAXIMUS_BUILD_VERSION');
        } else {
            Env::getRepository()->set('MAXIMUS_BUILD_VERSION', $this->previousBuild);
        }
        File::deleteDirectory($this->isolatedStorage);
        parent::tearDown();
    }

    public function test_network_failure_keeps_last_valid_configuration_and_mapping(): void
    {
        $sync = app(InstallationSyncService::class);
        $company = $sync->apply($this->payload(), true);
        $before = $company->getAttributes();
        $success = InstallationSyncState::summary()['lastSuccessAt'];
        Http::fake(fn () => throw new \Illuminate\Http\Client\ConnectionException('Do not publish tokens or upstream exception details'));
        try {
            $sync->fetch();
            $this->fail('Network error should be reported.');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('injoignable', $exception->getMessage());
        }
        $this->assertSame($before, $company->fresh()->getAttributes());
        $this->assertSame($success, InstallationSyncState::summary()['lastSuccessAt']);
        $this->assertNotNull(InstallationSyncState::summary()['lastAttemptAt']);
        $this->assertSame('unreachable', InstallationSyncState::summary()['state']);
        $this->assertSame($this->payload()['erpAccess'], InstallationSyncState::erpAccess());
        $this->assertStringNotContainsString('upstream exception', json_encode(InstallationSyncState::summary()));
        $this->assertStringNotContainsString('test-only-not-a-secret', implode('', array_map('file_get_contents', glob($this->isolatedStorage.'/app/installation-sync/*.json'))));
    }

    public function test_company_and_installation_identity_are_checked_before_any_write(): void
    {
        $sync = app(InstallationSyncService::class);
        $sync->apply($this->payload(), true);
        foreach (['company', 'installation'] as $key) {
            $bad = $this->payload();
            $bad[$key]['id'] = 'wrong-identity';
            $bad['erpAccess'] = ['canonicalUrl' => 'https://wrong.example.test', 'allowedHosts' => ['wrong.example.test']];
            try {
                $sync->apply($bad);
                $this->fail('Identity mismatch should be rejected.');
            } catch (\RuntimeException $exception) {
                $this->assertStringContainsString('Identité', $exception->getMessage());
            }
        }
        $this->assertFalse(Company::query()->whereKey('wrong-identity')->exists());
        $this->assertSame($this->payload()['erpAccess'], InstallationSyncState::erpAccess());
    }

    public function test_sync_preserves_local_logo_bytes_and_login_preferences_and_updates_brand(): void
    {
        $sync = app(InstallationSyncService::class);
        $company = $sync->apply($this->payload(), true);
        $company->update([
            'profile_photo' => '/api/company-profile-images/sync-company/local.png',
            'profile_photo_data' => base64_encode('local-test-logo'),
            'profile_photo_mime' => 'image/png',
            'login_custom_allowed' => true,
            'login_mode' => 'CUSTOM',
        ]);
        $payload = $this->payload();
        $payload['company']['profilePhoto'] = 'http://169.254.169.254/private';
        $payload['company']['primaryColor'] = '#123456';
        $sync->apply($payload);
        $company->refresh();
        $this->assertSame('#123456', $company->primary_color);
        $this->assertSame('/api/company-profile-images/sync-company/local.png', $company->profile_photo);
        $this->assertSame(base64_encode('local-test-logo'), $company->profile_photo_data);
        $this->assertSame('CUSTOM', $company->login_mode);
        $this->assertTrue($company->login_custom_allowed);
        $sync->apply($payload);
        $this->assertSame(1, DB::table('maximus_company_modules')->where('company_id', 'sync-company')->count());
        Http::assertNothingSent();
    }

    public function test_new_installation_ignores_central_only_photo_path_instead_of_creating_a_broken_local_image(): void
    {
        $payload = $this->payload();
        $payload['company']['profilePhoto'] = '/api/company-profile-images/sync-company/central-only.png';
        $company = app(InstallationSyncService::class)->apply($payload, true);
        $this->assertNull($company->profile_photo);
        Http::assertNothingSent();
    }

    public function test_repeated_setup_keeps_existing_admin_password_sessions_and_brand_without_central_call(): void
    {
        $company = app(InstallationSyncService::class)->apply($this->payload(), true);
        $company->update(['primary_color' => '#112233', 'name' => 'My Local Brand']);
        $admin = AuthUser::create([
            'id' => 'company-admin:sync-company', 'email' => 'admin@example.test',
            'password_hash' => 'existing-password-hash-must-not-change', 'display_name' => 'Local Admin',
            'role' => 'company_admin', 'company_id' => 'sync-company', 'status' => 'ACTIF',
        ]);
        AuthSession::create([
            'id' => 'existing-session', 'user_id' => $admin->id,
            'token_hash' => hash('sha256', 'test-session'), 'expires_at' => now()->addHour(),
        ]);
        $this->artisan('maximus:install-company', ['--no-interaction' => true])->assertSuccessful();
        $this->assertSame('existing-password-hash-must-not-change', $admin->fresh()->password_hash);
        $this->assertTrue(AuthSession::whereKey('existing-session')->exists());
        $this->assertSame('#112233', $company->fresh()->primary_color);
        $this->assertSame('My Local Brand', $company->fresh()->name);
        Http::assertNothingSent();
    }

    public function test_pending_fetch_does_not_replace_brand_or_publish_unapplied_mapping(): void
    {
        $sync = app(InstallationSyncService::class);
        $company = $sync->apply($this->payload(), true);
        $company->update(['primary_color' => '#112233', 'name' => 'My Local Brand']);
        $payload = $this->payload();
        $payload['company']['name'] = 'Not yet applied';
        $payload['erpAccess'] = ['canonicalUrl' => null, 'allowedHosts' => []];
        Http::fake(['*' => Http::response($payload)]);
        $sync->fetch();
        $this->assertSame('syncing', InstallationSyncState::summary()['state']);
        $this->assertSame('#112233', $company->fresh()->primary_color);
        $this->assertSame('My Local Brand', $company->fresh()->name);
        $this->assertSame($this->payload()['erpAccess'], InstallationSyncState::erpAccess());
    }

    public function test_periodic_sync_allows_commit_drift_but_initial_proof_and_protocol_remain_strict(): void
    {
        $sync = app(InstallationSyncService::class);
        $payload = $this->payload();
        $payload['applicationVersion'] = 'different-commit';
        try {
            $sync->apply($payload);
            $this->fail('First sync must prove the exact build.');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('bootstrap', $exception->getMessage());
        }
        $sync->apply($this->payload(), true);
        $sync->apply($payload);
        $this->assertNotNull(InstallationSyncState::summary()['versionWarning']);
        $this->assertSame('synced', InstallationSyncState::summary()['state']);
        $payload['syncProtocolVersion'] = ApplicationIdentity::SYNC_PROTOCOL_VERSION + 1;
        try {
            $sync->apply($payload);
            $this->fail('Protocol mismatch must be rejected.');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('protocole', $exception->getMessage());
        }
        $this->assertSame('rejected', InstallationSyncState::summary()['state']);
    }

    public function test_database_failure_does_not_publish_new_access_mapping(): void
    {
        $sync = app(InstallationSyncService::class);
        $company = $sync->apply($this->payload(), true);
        $payload = $this->payload();
        $payload['company']['name'] = 'Must not persist';
        $payload['modules']['ids'] = ['not-a-published-module'];
        $payload['erpAccess'] = ['canonicalUrl' => 'https://new.example.test', 'allowedHosts' => ['new.example.test']];
        try {
            $sync->apply($payload);
            $this->fail('Invalid module should reject transaction.');
        } catch (\RuntimeException) {
            $this->assertSame('Sync Company', $company->fresh()->name);
            $this->assertSame($this->payload()['erpAccess'], InstallationSyncState::erpAccess());
        }
    }

    public function test_revocation_is_distinct_from_unreachable_and_does_not_delete_local_data(): void
    {
        $sync = app(InstallationSyncService::class);
        $sync->apply($this->payload(), true);
        Http::fake(['*' => Http::sequence()->push([], 503)->push([], 401)->push(['code' => 'INSTALLATION_REVOKED'], 403)]);
        foreach (['unreachable', 'authentication_rejected', 'revoked'] as $state) {
            try {
                $sync->fetch();
                $this->fail('HTTP failure should be observable.');
            } catch (\RuntimeException) {
                $this->assertSame($state, InstallationSyncState::summary()['state']);
                $this->assertSame('ACTIF', Company::findOrFail('sync-company')->status);
                $this->assertSame($this->payload()['erpAccess'], InstallationSyncState::erpAccess());
            }
        }
    }

    public function test_mapping_cannot_leak_to_another_installation_scope(): void
    {
        app(InstallationSyncService::class)->apply($this->payload(), true);
        config(['maximus.installation_id' => 'another-installation']);
        $this->assertSame(['canonicalUrl' => null, 'allowedHosts' => []], InstallationSyncState::erpAccess());
        $this->assertSame('never_synced', InstallationSyncState::summary()['state']);
        config(['maximus.installation_id' => 'sync-installation', 'maximus.deployment_mode' => 'on_premise']);
        $this->assertSame(['canonicalUrl' => null, 'allowedHosts' => []], InstallationSyncState::erpAccess());
        $this->assertSame('never_synced', InstallationSyncState::summary()['state']);
    }

    private function payload(): array
    {
        return [
            'configurationVersion' => 7,
            'applicationVersion' => 'test-build',
            'syncProtocolVersion' => ApplicationIdentity::SYNC_PROTOCOL_VERSION,
            'installation' => ['id' => 'sync-installation', 'companyId' => 'sync-company', 'mode' => 'dedicated'],
            'company' => ['id' => 'sync-company', 'name' => 'Sync Company', 'manager' => 'Local Admin', 'email' => 'local@example.test'],
            'modules' => ['ids' => ['commerce']],
            'catalog' => [],
            'domains' => [],
            'erpAccess' => ['canonicalUrl' => 'https://erp.example.test', 'allowedHosts' => ['erp.example.test']],
        ];
    }
}