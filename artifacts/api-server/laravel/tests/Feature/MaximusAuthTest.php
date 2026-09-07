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

    public function test_deleted_company_invalidates_credentials_sessions_tokens_and_protected_data_access(): void
    {
        Company::query()->create([
            'id' => 'deleted-company',
            'name' => 'Entreprise à supprimer',
            'manager' => 'Administrateur supprimé',
            'email' => 'admin@deleted-company.test',
            'status' => 'ACTIF',
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
