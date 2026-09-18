<?php

namespace Tests\Feature;

use App\Models\AuthSession;
use App\Models\AuthUser;
use App\Models\Company;
use App\Support\MaximusPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class RecoverInstallationAdminTest extends TestCase
{
    use RefreshDatabase;

    public function createApplication()
    {
        $app = parent::createApplication();
        $app['config']->set('database.default', 'sqlite');
        $app['config']->set('database.connections.sqlite.database', ':memory:');
        $app['config']->set('database.connections.sqlite.url', null);
        return $app;
    }

    protected function setUp(): void
    {
        parent::setUp();
        config(['maximus.deployment_mode' => 'on_premise', 'maximus.installation_company_id' => 'recovery-company']);
        Http::preventStrayRequests();
        Company::create([
            'id' => 'recovery-company', 'name' => 'Recovery Company', 'manager' => 'Local Admin',
            'email' => 'company@example.test', 'status' => 'ACTIF',
        ]);
    }

    public function test_offline_recovery_changes_only_scoped_admin_and_revokes_sessions(): void
    {
        $admin = $this->user('local-admin', 'admin@example.test', 'company_admin', 'recovery-company');
        $global = $this->user('global-admin', 'global@example.test', 'maximus_admin', null);
        $this->createAuthSession('local-session', $admin->id);
        $this->createAuthSession('global-session', $global->id);
        $oldGlobalHash = $global->password_hash;
        $this->artisan('maximus:recover-admin')
            ->expectsQuestion('Email de l’administrateur entreprise local', $admin->email)
            ->expectsQuestion('Nouveau mot de passe (12 à 72 octets)', 'Test-only-recovery-123!')
            ->expectsQuestion('Confirmer le nouveau mot de passe', 'Test-only-recovery-123!')
            ->assertSuccessful();
        $this->assertTrue(MaximusPassword::check('Test-only-recovery-123!', $admin->fresh()->password_hash));
        $this->assertSame($oldGlobalHash, $global->fresh()->password_hash);
        $this->assertFalse(AuthSession::whereKey('local-session')->exists());
        $this->assertTrue(AuthSession::whereKey('global-session')->exists());
        Http::assertNothingSent();
    }

    public function test_recovery_refuses_global_and_other_company_admin_accounts(): void
    {
        $global = $this->user('global-admin', 'global@example.test', 'maximus_admin', null);
        Company::create(['id' => 'other-company', 'name' => 'Other', 'manager' => 'Other', 'email' => 'other@example.test', 'status' => 'ACTIF']);
        $other = $this->user('other-admin', 'other@example.test', 'company_admin', 'other-company');
        foreach ([$global, $other] as $user) {
            $oldHash = $user->password_hash;
            $this->artisan('maximus:recover-admin')
                ->expectsQuestion('Email de l’administrateur entreprise local', $user->email)
                ->assertFailed();
            $this->assertSame($oldHash, $user->fresh()->password_hash);
        }
        $this->assertSame(2, AuthUser::count());
        Http::assertNothingSent();
    }

    public function test_central_and_noninteractive_execution_are_refused(): void
    {
        $this->artisan('maximus:recover-admin', ['--no-interaction' => true])->assertFailed();
        config(['maximus.deployment_mode' => 'central']);
        $this->artisan('maximus:recover-admin')->assertFailed();
        $this->assertSame(0, AuthUser::count());
        Http::assertNothingSent();
    }

    public function test_mismatched_confirmation_does_not_change_password_or_sessions(): void
    {
        $admin = $this->user('local-admin', 'admin@example.test', 'company_admin', 'recovery-company');
        $this->createAuthSession('local-session', $admin->id);
        $oldHash = $admin->password_hash;
        $this->artisan('maximus:recover-admin')
            ->expectsQuestion('Email de l’administrateur entreprise local', $admin->email)
            ->expectsQuestion('Nouveau mot de passe (12 à 72 octets)', 'Test-only-recovery-123!')
            ->expectsQuestion('Confirmer le nouveau mot de passe', 'Different-test-password!')
            ->assertFailed();
        $this->assertSame($oldHash, $admin->fresh()->password_hash);
        $this->assertTrue(AuthSession::whereKey('local-session')->exists());
    }

    private function user(string $id, string $email, string $role, ?string $companyId): AuthUser
    {
        return AuthUser::create([
            'id' => $id, 'email' => $email, 'password_hash' => MaximusPassword::hash('Test-only-original-123!'),
            'display_name' => 'Test Admin', 'role' => $role, 'company_id' => $companyId,
            'sector_ids' => [], 'permissions' => [], 'status' => 'ACTIF',
        ]);
    }

    private function createAuthSession(string $id, string $userId): void
    {
        AuthSession::create(['id' => $id, 'user_id' => $userId, 'token_hash' => hash('sha256', $id), 'expires_at' => now()->addHour()]);
    }
}