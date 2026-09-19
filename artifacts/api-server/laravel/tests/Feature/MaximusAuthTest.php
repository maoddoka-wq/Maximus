<?php

namespace Tests\Feature;

use App\Models\AuthSession;
use App\Models\AuthUser;
use App\Models\Company;
use App\Support\MaximusAuth;
use App\Support\MaximusPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MaximusAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_endpoint_is_available(): void
    {
        $this->getJson('/api/healthz')
            ->assertOk()
            ->assertJson(['ok' => true]);
    }

    public function test_laravel_accepts_the_existing_maximus_scrypt_format(): void
    {
        $this->assertTrue(MaximusPassword::check(
            'Admin123!',
            '00112233445566778899aabbccddeeff:7d58074f125b628bb6ab7efe859197b97dfdd595cf3e2a94157706bbee17271cd456d4234ecded4d1e199891d780bbc6df38b9cee2bf4a7e719bb15bc78c128b',
        ));

        $hash = MaximusPassword::hash('Admin123!', '00112233445566778899aabbccddeeff');

        $this->assertTrue(MaximusPassword::check('Admin123!', $hash));
        $this->assertFalse(MaximusPassword::check('wrong-password', $hash));
    }

    public function test_login_creates_a_compatible_session_cookie(): void
    {
        AuthUser::query()->create([
            'id' => 'maximus-admin',
            'email' => 'admin@maximus.demo',
            'password_hash' => MaximusPassword::hash('Admin123!', '00112233445566778899aabbccddeeff'),
            'display_name' => 'Administration MAXIMUS',
            'role' => 'maximus_admin',
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);

        $login = $this->postJson('/api/auth/login', [
            'email' => 'ADMIN@MAXIMUS.DEMO',
            'password' => 'Admin123!',
        ]);

        $login
            ->assertOk()
            ->assertJsonPath('user.role', 'maximus_admin')
            ->assertJsonPath('user.displayName', 'Administration MAXIMUS')
            ->assertCookie('maximus_session');

        $cookie = $login->getCookie('maximus_session', false)->getValue();
        $storedSession = AuthSession::query()->first();
        $this->assertNotNull($storedSession);
        $this->assertSame($storedSession->token_hash, MaximusAuth::hashToken($cookie));
        $session = $this
            ->withCredentials()
            ->withUnencryptedCookie('maximus_session', $cookie)
            ->getJson('/api/auth/session');

        $session
            ->assertOk()
            ->assertJsonPath('user.role', 'maximus_admin')
            ->assertJsonPath('user.displayName', 'Administration MAXIMUS');
    }

    public function test_company_admin_can_provision_an_employee_who_logs_in_immediately(): void
    {
        $admin = AuthUser::query()->create([
            'id' => 'provisioning-admin',
            'email' => 'provisioning@kora.demo',
            'password_hash' => MaximusPassword::hash('Admin123!', 'aabbccddeeff00112233445566778899'),
            'display_name' => 'Admin Kora',
            'role' => 'company_admin',
            'company_id' => 'kora',
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);
        $token = MaximusAuth::issueSession($admin);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $token)
            ->postJson('/api/auth/accounts', [
                'id' => 'employee-created-now',
                'email' => 'created.now@kora.demo',
                'displayName' => 'Employé créé',
                'companyId' => 'kora',
                'employeeId' => 'employee-created-now',
                'sectorIds' => ['kora-service-vente'],
                'role' => 'employee',
                'permissions' => ['presences' => ['voir', 'créer']],
                'password' => 'CreatedNow2026!',
            ])
            ->assertCreated()
            ->assertJson(['ok' => true]);

        $this->postJson('/api/auth/login', [
            'email' => 'created.now@kora.demo',
            'password' => 'CreatedNow2026!',
        ])
            ->assertOk()
            ->assertJsonPath('user.employeeId', 'employee-created-now')
            ->assertJsonPath('user.role', 'employee')
            ->assertJsonPath('user.permissions.presences.0', 'voir');
    }

    public function test_maximus_can_provision_an_approved_company_admin_who_logs_in_immediately(): void
    {
        $admin = AuthUser::query()->create([
            'id' => 'maximus-approver',
            'email' => 'approver@maximus.demo',
            'password_hash' => MaximusPassword::hash('Admin123!', '00112233445566778899aabbccddeeff'),
            'display_name' => 'Administration MAXIMUS',
            'role' => 'maximus_admin',
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);
        $token = MaximusAuth::issueSession($admin);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $token)
            ->postJson('/api/auth/company-admins', [
                'id' => 'company-admin:new-company',
                'email' => 'admin@new-company.test',
                'displayName' => 'Responsable Nouvelle Entreprise',
                'companyId' => 'new-company',
                'password' => 'CompanyAdmin2026!',
            ])
            ->assertCreated()
            ->assertJson(['ok' => true]);

        $this->postJson('/api/auth/login', [
            'email' => 'ADMIN@NEW-COMPANY.TEST',
            'password' => 'CompanyAdmin2026!',
        ])
            ->assertOk()
            ->assertJsonPath('user.role', 'company_admin')
            ->assertJsonPath('user.companyId', 'new-company')
            ->assertJsonPath('user.displayName', 'Responsable Nouvelle Entreprise');
    }

    public function test_sector_manager_cannot_provision_an_account_across_sector_boundaries(): void
    {
        $manager = AuthUser::query()->create([
            'id' => 'sector-manager-boundary',
            'email' => 'sector-manager-boundary@kora.demo',
            'password_hash' => MaximusPassword::hash('Admin123!', '00112233445566778899aabbccddeeff'),
            'display_name' => 'Manager secteur',
            'role' => 'sector_manager',
            'company_id' => 'kora',
            'sector_ids' => ['secteur-a'],
            'status' => 'ACTIF',
        ]);
        $token = MaximusAuth::issueSession($manager);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $token)
            ->postJson('/api/auth/accounts', [
                'id' => 'employee-cross-sector',
                'email' => 'employee-cross-sector@kora.demo',
                'displayName' => 'Employé hors périmètre',
                'companyId' => 'kora',
                'employeeId' => 'employee-cross-sector',
                'sectorIds' => ['secteur-a', 'secteur-b'],
                'role' => 'employee',
                'password' => 'CreatedNow2026!',
            ])
            ->assertForbidden();
    }

    public function test_sector_manager_cannot_update_an_existing_account_outside_its_scope(): void
    {
        $existing = AuthUser::query()->create([
            'id' => 'existing-outside-sector',
            'email' => 'existing-outside-sector@kora.demo',
            'password_hash' => MaximusPassword::hash('Existing123!', '00112233445566778899aabbccddeeff'),
            'display_name' => 'Employé hors secteur',
            'role' => 'employee',
            'company_id' => 'kora',
            'employee_id' => 'employee-outside-sector',
            'sector_ids' => ['secteur-b'],
            'status' => 'ACTIF',
        ]);
        $manager = AuthUser::query()->create([
            'id' => 'sector-manager-existing-boundary',
            'email' => 'sector-manager-existing-boundary@kora.demo',
            'password_hash' => MaximusPassword::hash('Admin123!', '00112233445566778899aabbccddeeff'),
            'display_name' => 'Manager secteur',
            'role' => 'sector_manager',
            'company_id' => 'kora',
            'sector_ids' => ['secteur-a'],
            'status' => 'ACTIF',
        ]);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($manager))
            ->postJson('/api/auth/accounts', [
                'id' => 'attempted-outside-sector',
                'email' => 'changed-outside-sector@kora.demo',
                'displayName' => 'Modification interdite',
                'companyId' => 'kora',
                'employeeId' => $existing->employee_id,
                'sectorIds' => ['secteur-a'],
                'role' => 'employee',
            ])
            ->assertForbidden();

        $this->assertDatabaseHas('auth_users', [
            'id' => $existing->id,
            'email' => 'existing-outside-sector@kora.demo',
            'display_name' => 'Employé hors secteur',
        ]);
    }

    public function test_account_scope_change_revokes_existing_sessions(): void
    {
        $employee = AuthUser::query()->create([
            'id' => 'account-scope-change',
            'email' => 'account-scope-change@kora.demo',
            'password_hash' => MaximusPassword::hash('Existing123!', '00112233445566778899aabbccddeeff'),
            'display_name' => 'Employé à requalifier',
            'role' => 'employee',
            'company_id' => 'kora',
            'employee_id' => 'employee-scope-change',
            'sector_ids' => ['secteur-a'],
            'status' => 'ACTIF',
        ]);
        $manager = AuthUser::query()->create([
            'id' => 'company-admin-scope-change',
            'email' => 'company-admin-scope-change@kora.demo',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Admin Kora',
            'role' => 'company_admin',
            'company_id' => 'kora',
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);
        AuthSession::query()->create([
            'id' => 'scope-change-session',
            'user_id' => $employee->id,
            'token_hash' => hash('sha256', 'scope-change-token'),
            'expires_at' => now()->addHour(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($manager))
            ->postJson('/api/auth/accounts', [
                'id' => $employee->id,
                'email' => $employee->email,
                'displayName' => $employee->display_name,
                'companyId' => 'kora',
                'employeeId' => $employee->employee_id,
                'sectorIds' => ['secteur-b'],
                'role' => 'sector_manager',
            ])
            ->assertOk();

        $this->assertDatabaseMissing('auth_sessions', ['id' => 'scope-change-session']);
    }

    public function test_sector_manager_cannot_grant_permissions_they_do_not_hold(): void
    {
        $manager = AuthUser::query()->create([
            'id' => 'sector-manager-permissions',
            'email' => 'sector-manager-permissions@kora.demo',
            'password_hash' => MaximusPassword::hash('Admin123!', '00112233445566778899aabbccddeeff'),
            'display_name' => 'Manager permissions',
            'role' => 'sector_manager',
            'company_id' => 'kora',
            'sector_ids' => ['secteur-a'],
            'permissions' => ['stocks:products' => ['voir']],
            'status' => 'ACTIF',
        ]);
        $token = MaximusAuth::issueSession($manager);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $token)
            ->postJson('/api/auth/accounts', [
                'id' => 'employee-permission-escalation',
                'email' => 'employee-permission-escalation@kora.demo',
                'displayName' => 'Employé escalade',
                'companyId' => 'kora',
                'employeeId' => 'employee-permission-escalation',
                'sectorIds' => ['secteur-a'],
                'role' => 'employee',
                'permissions' => ['stocks:products' => ['voir', 'créer']],
                'password' => 'CreatedNow2026!',
            ])
            ->assertForbidden();
    }

    public function test_company_admin_cannot_reassign_an_employee_account_from_another_company(): void
    {
        AuthUser::query()->create([
            'id' => 'existing-other-company',
            'email' => 'existing-other-company@other.demo',
            'password_hash' => MaximusPassword::hash('Admin123!', '00112233445566778899aabbccddeeff'),
            'display_name' => 'Employé autre entreprise',
            'role' => 'employee',
            'company_id' => 'other-company',
            'employee_id' => 'shared-employee-id',
            'sector_ids' => ['other-sector'],
            'status' => 'ACTIF',
        ]);
        $admin = AuthUser::query()->create([
            'id' => 'company-admin-isolation',
            'email' => 'company-admin-isolation@kora.demo',
            'password_hash' => MaximusPassword::hash('Admin123!', 'aabbccddeeff00112233445566778899'),
            'display_name' => 'Admin Kora',
            'role' => 'company_admin',
            'company_id' => 'kora',
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);
        $token = MaximusAuth::issueSession($admin);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $token)
            ->postJson('/api/auth/accounts', [
                'id' => 'attempted-cross-company-update',
                'email' => 'attempted-cross-company-update@kora.demo',
                'displayName' => 'Compte Kora',
                'companyId' => 'kora',
                'employeeId' => 'shared-employee-id',
                'sectorIds' => ['kora-sector'],
                'role' => 'employee',
                'password' => 'CreatedNow2026!',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('auth_users', [
            'id' => 'existing-other-company',
            'company_id' => 'other-company',
            'email' => 'existing-other-company@other.demo',
        ]);
        $this->assertDatabaseHas('auth_users', [
            'id' => 'attempted-cross-company-update',
            'company_id' => 'kora',
            'employee_id' => 'shared-employee-id',
        ]);
    }

    public function test_deleted_employee_email_can_be_reused_without_reactivating_identity_or_losing_history(): void
    {
        $admin = AuthUser::query()->create([
            'id' => 'employee-deletion-admin',
            'email' => 'employee-deletion-admin@kora.demo',
            'password_hash' => MaximusPassword::hash('Admin123!'),
            'display_name' => 'Admin Kora',
            'role' => 'company_admin',
            'company_id' => 'kora',
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);
        $otherAdmin = AuthUser::query()->create([
            'id' => 'employee-deletion-other-admin',
            'email' => 'employee-deletion-admin@other.demo',
            'password_hash' => MaximusPassword::hash('Admin123!'),
            'display_name' => 'Admin autre entreprise',
            'role' => 'company_admin',
            'company_id' => 'other-company',
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);
        $oldEmployee = AuthUser::query()->create([
            'id' => 'old-auth-identity',
            'email' => 'reusable.employee@kora.demo',
            'password_hash' => MaximusPassword::hash('OldPassword2026!'),
            'display_name' => 'Employé historique',
            'role' => 'sector_manager',
            'company_id' => 'kora',
            'employee_id' => 'historical-employee-id',
            'sector_ids' => ['historical-sector'],
            'permissions' => ['stocks:products' => ['voir', 'modifier']],
            'status' => 'ACTIF',
        ]);
        $oldToken = MaximusAuth::issueSession($oldEmployee);
        DB::table('control_tasks')->insert([
            'id' => 'historical-employee-task',
            'company_id' => 'kora',
            'sector_id' => 'historical-sector',
            'title' => 'Tâche historique',
            'description' => 'Conserver la référence employé',
            'assignee_employee_id' => 'historical-employee-id',
            'assignee_name' => 'Employé historique',
            'created_by' => 'Admin Kora',
            'status' => 'TERMINÉ',
            'priority' => 'NORMALE',
            'requires_approval' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $otherToken = MaximusAuth::issueSession($otherAdmin);
        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $otherToken)
            ->deleteJson('/api/auth/accounts/historical-employee-id')
            ->assertForbidden();
        $this->assertDatabaseHas('auth_users', [
            'id' => 'old-auth-identity',
            'email' => 'reusable.employee@kora.demo',
            'status' => 'ACTIF',
        ]);

        $adminToken = MaximusAuth::issueSession($admin);
        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $adminToken)
            ->deleteJson('/api/auth/accounts/historical-employee-id')
            ->assertNoContent();

        $retiredEmployee = $oldEmployee->fresh();
        $this->assertNotNull($retiredEmployee);
        $this->assertNotSame('ACTIF', $retiredEmployee->status);
        $this->assertNotSame('reusable.employee@kora.demo', $retiredEmployee->email);
        $this->assertSame('historical-employee-id', $retiredEmployee->employee_id);
        $this->assertDatabaseMissing('auth_sessions', [
            'token_hash' => MaximusAuth::hashToken($oldToken),
        ]);
        $this->assertDatabaseHas('control_tasks', [
            'id' => 'historical-employee-task',
            'assignee_employee_id' => 'historical-employee-id',
            'assignee_name' => 'Employé historique',
        ]);
        $retiredEmail = $retiredEmployee->email;
        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $adminToken)
            ->deleteJson('/api/auth/accounts/historical-employee-id')
            ->assertNoContent();
        $this->assertSame($retiredEmail, $oldEmployee->fresh()?->email);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $oldToken)
            ->getJson('/api/auth/session')
            ->assertOk()
            ->assertJson(['user' => null]);
        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $oldToken)
            ->getJson('/api/app-state/bootstrap')
            ->assertUnauthorized();

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $adminToken)
            ->postJson('/api/auth/accounts', [
                'id' => 'attempted-old-auth-reuse',
                'email' => 'reusable.employee@kora.demo',
                'displayName' => 'Tentative de réactivation',
                'companyId' => 'kora',
                'employeeId' => 'historical-employee-id',
                'sectorIds' => ['new-sector'],
                'role' => 'employee',
                'password' => 'NewPassword2026!',
            ])
            ->assertConflict();

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $adminToken)
            ->postJson('/api/auth/accounts', [
                'id' => 'new-auth-identity',
                'email' => 'REUSABLE.EMPLOYEE@KORA.DEMO',
                'displayName' => 'Nouvel employé',
                'companyId' => 'kora',
                'employeeId' => 'new-employee-id',
                'sectorIds' => ['new-sector'],
                'role' => 'employee',
                'permissions' => ['presences' => ['voir']],
                'password' => 'NewPassword2026!',
            ])
            ->assertCreated();

        $this->postJson('/api/auth/login', [
            'email' => 'reusable.employee@kora.demo',
            'password' => 'OldPassword2026!',
        ])->assertUnauthorized();
        $this->postJson('/api/auth/login', [
            'email' => 'reusable.employee@kora.demo',
            'password' => 'NewPassword2026!',
        ])
            ->assertOk()
            ->assertJsonPath('user.employeeId', 'new-employee-id')
            ->assertJsonPath('user.role', 'employee')
            ->assertJsonPath('user.permissions.presences.0', 'voir')
            ->assertJsonMissingPath('user.permissions.stocks:products');

        $this->assertDatabaseHas('auth_users', [
            'id' => 'old-auth-identity',
            'employee_id' => 'historical-employee-id',
        ]);
        $this->assertDatabaseHas('auth_users', [
            'id' => 'new-auth-identity',
            'email' => 'reusable.employee@kora.demo',
            'employee_id' => 'new-employee-id',
        ]);
        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $otherToken)
            ->deleteJson('/api/auth/accounts/new-employee-id')
            ->assertForbidden();
    }

    public function test_deleted_company_invalidates_credentials_sessions_tokens_and_protected_data_access(): void
    {
        Company::query()->create([
            'id' => 'deleted-company',
            'name' => 'Entreprise à supprimer',
            'manager' => 'Administrateur supprimé',
            'email' => 'admin@deleted-company.test',
            'status' => 'ACTIF',
            'deletion_locked' => false,
            'requested_modules' => ['presences', 'stocks', 'ecommerce'],
        ]);

        $companyUser = AuthUser::query()->create([
            'id' => 'deleted-company-admin',
            'email' => 'admin@deleted-company.test',
            'password_hash' => MaximusPassword::hash('DeletedCompany2026!'),
            'display_name' => 'Administrateur supprimé',
            'role' => 'company_admin',
            'company_id' => 'deleted-company',
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);
        $oldToken = MaximusAuth::issueSession($companyUser);

        $maximusAdmin = AuthUser::query()->create([
            'id' => 'deletion-maximus-admin',
            'email' => 'deletion-admin@maximus.test',
            'password_hash' => MaximusPassword::hash('MaximusDeletion2026!'),
            'display_name' => 'Administration MAXIMUS',
            'role' => 'maximus_admin',
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);
        $adminToken = MaximusAuth::issueSession($maximusAdmin);

        DB::table('maximus_app_states')->insert([
            'scope' => 'workspace',
            'company_id' => null,
            'payload' => json_encode([
                'companies' => [
                    ['id' => 'deleted-company', 'name' => 'Entreprise à supprimer', 'status' => 'ACTIF'],
                ],
                'employees' => [
                    ['id' => 'deleted-employee', 'companyId' => 'deleted-company'],
                ],
            ], JSON_THROW_ON_ERROR),
            'version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('ecommerce_stores')->insert([
            'id' => 'deleted-company-store',
            'company_id' => 'deleted-company',
            'slug' => 'deleted-company-shop',
            'name' => 'Boutique supprimée',
            'description' => '',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primary_color' => '#000000',
            'accent_color' => '#ffffff',
            'logo_url' => '',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $adminToken)
            ->deleteJson('/api/companies/deleted-company')
            ->assertOk()
            ->assertJson(['ok' => true]);

        $this->assertDatabaseHas('companies', [
            'id' => 'deleted-company',
            'status' => 'ARCHIVÉ',
        ]);
        $this->assertDatabaseHas('auth_users', [
            'id' => 'deleted-company-admin',
            'status' => 'SUSPENDU',
        ]);
        $this->assertDatabaseMissing('auth_sessions', [
            'token_hash' => MaximusAuth::hashToken($oldToken),
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'admin@deleted-company.test',
            'password' => 'DeletedCompany2026!',
        ])->assertUnauthorized();
        $this->assertSame(0, AuthSession::query()->where('user_id', 'deleted-company-admin')->count());

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $oldToken)
            ->getJson('/api/auth/session')
            ->assertOk()
            ->assertJson(['user' => null]);

        $oldSession = fn () => $this
            ->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $oldToken);

        $oldSession()->getJson('/api/app-state/bootstrap')->assertUnauthorized();
        $oldSession()->putJson('/api/app-state', [
            'data' => ['companies' => [['id' => 'deleted-company']]],
            'version' => 1,
        ])->assertUnauthorized();
        $oldSession()->getJson('/api/modules/bootstrap?companyId=deleted-company')->assertUnauthorized();
        $oldSession()->getJson('/api/presence/bootstrap')->assertUnauthorized();
        $oldSession()->postJson('/api/presence/items', [
            'id' => 'should-not-be-created',
            'type' => 'absence',
        ])->assertUnauthorized();
        $this->getJson('/api/shop/deleted-company-shop')->assertNotFound();

        $adminState = $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $adminToken)
            ->getJson('/api/app-state/bootstrap')
            ->assertOk();
        $this->assertFalse(collect($adminState->json('data.companies'))->contains('id', 'deleted-company'));
        $this->assertFalse(collect($adminState->json('data.employees'))->contains('companyId', 'deleted-company'));
    }
}
