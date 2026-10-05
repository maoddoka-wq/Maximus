<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Models\Company;
use App\Support\MaximusAuth;
use App\Support\ModuleCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AppStateAuditSecurityTest extends TestCase
{
    use RefreshDatabase;

    private array $original;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (['audit-a', 'audit-b'] as $id) {
            Company::query()->create([
                'id' => $id,
                'name' => 'Synthetic audit company',
                'manager' => 'QA',
                'email' => $id.'@audit.test',
                'status' => 'ACTIF',
            ]);
        }
        $this->original = [
            'companies' => [['id' => 'audit-a'], ['id' => 'audit-b']],
            'products' => [['id' => 'product-b', 'companyId' => 'audit-b', 'name' => 'Original']],
            'moduleOverrides' => ['commerce' => ['name' => 'Published']],
            'catalogDraft' => ['private' => true],
            'companySetupPlans' => [['id' => 'private-plan', 'name' => 'Internal planning']],
            'payrollSlips' => [['id' => 'slip-a', 'companyId' => 'audit-a', 'amount' => 500]],
            'businessDocuments' => [['id' => 'document-a', 'companyId' => 'audit-a']],
            'subscriptions' => [['id' => 'subscription-a', 'companyId' => 'audit-a']],
            'domainEvents' => [['id' => 'event-a', 'companyId' => 'audit-a']],
            'auditEntries' => [['id' => 'audit-entry-a', 'companyId' => 'audit-a']],
            'notifications' => [
                ['id' => 'admin-notification', 'companyId' => 'audit-a', 'audience' => 'admin'],
                ['id' => 'company-notification', 'companyId' => 'audit-a', 'audience' => 'company'],
            ],
        ];
        DB::table('maximus_app_states')->insert([
            'scope' => 'workspace',
            'payload' => json_encode($this->original, JSON_THROW_ON_ERROR),
            'version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->loginAs('company_admin');
    }

    public function test_associative_collections_cannot_rewrite_another_tenant(): void
    {
        $this->putJson('/api/app-state', [
            'version' => 1,
            'data' => ['products' => ['0' => ['name' => 'Injected'], 'extra' => []]],
        ])->assertStatus(422);
        $this->assertStateUnchanged();
    }

    public function test_global_catalog_changes_are_rejected_for_company_admins(): void
    {
        $this->putJson('/api/app-state', [
            'version' => 1,
            'data' => ['moduleOverrides' => ['commerce' => ['name' => 'Injected']]],
        ])->assertForbidden();
        $this->assertStateUnchanged();
    }

    public function test_malformed_record_identifiers_are_rejected_without_server_errors(): void
    {
        foreach ([
            ['id' => ['nested'], 'companyId' => 'audit-a'],
            ['id' => 'malformed-owner', 'companyId' => ['audit-a']],
        ] as $record) {
            $this->putJson('/api/app-state', [
                'version' => 1,
                'data' => ['products' => [$record]],
            ])->assertStatus(422);
            $this->assertStateUnchanged();
        }
    }

    public function test_company_admin_keeps_access_to_its_own_business_records(): void
    {
        $this->getJson('/api/app-state/bootstrap')->assertOk()
            ->assertJsonCount(1, 'data.payrollSlips')
            ->assertJsonCount(1, 'data.businessDocuments')
            ->assertJsonCount(1, 'data.subscriptions')
            ->assertJsonCount(1, 'data.domainEvents')
            ->assertJsonCount(1, 'data.auditEntries')
            ->assertJsonCount(2, 'data.notifications');
    }

    public function test_a_foreign_identifier_cannot_be_reassigned_to_the_current_tenant(): void
    {
        $this->putJson('/api/app-state', [
            'version' => 1,
            'data' => ['products' => [['id' => 'product-b', 'companyId' => 'audit-a']]],
        ])->assertForbidden();
        $this->assertStateUnchanged();
    }

    public function test_company_reads_exclude_private_maxi_plans_and_catalog_drafts(): void
    {
        $this->getJson('/api/app-state/bootstrap')->assertOk()
            ->assertJsonMissingPath('data.companySetupPlans')
            ->assertJsonMissingPath('data.catalogDraft')
            ->assertJsonCount(0, 'data.products');
        $this->assertStateUnchanged();
    }

    public function test_staff_without_business_permissions_cannot_read_payroll_or_documents(): void
    {
        $this->loginAs('employee');
        $this->getJson('/api/app-state/bootstrap')->assertOk()
            ->assertJsonCount(0, 'data.payrollSlips')
            ->assertJsonCount(0, 'data.businessDocuments')
            ->assertJsonCount(0, 'data.subscriptions')
            ->assertJsonCount(0, 'data.domainEvents')
            ->assertJsonCount(0, 'data.auditEntries')
            ->assertJsonCount(1, 'data.notifications')
            ->assertJsonPath('data.notifications.0.id', 'company-notification')
            ->assertJsonMissingPath('data.companySetupPlans');
        $this->assertStateUnchanged();
    }

    public function test_employee_bootstrap_only_exposes_own_records_and_rejects_ambiguous_names(): void
    {
        ModuleCatalog::ensureCompanyAccess('audit-a', ['paie']);
        $state = [
            ...$this->original,
            'employees' => [
                ['id' => 'employee-a', 'companyId' => 'audit-a', 'roleId' => 'role-a', 'sectorId' => 'unit-a', 'firstName' => 'Mame', 'lastName' => 'Diop'],
                ['id' => 'employee-b', 'companyId' => 'audit-a', 'roleId' => 'role-b', 'sectorId' => 'unit-b', 'firstName' => 'Mame', 'lastName' => 'Diop'],
                ['id' => 'employee-c', 'companyId' => 'audit-a', 'roleId' => 'role-c', 'sectorId' => 'unit-c', 'firstName' => 'Ndeye', 'lastName' => 'Fall'],
            ],
            'roles' => [
                ['id' => 'role-a', 'companyId' => 'audit-a'],
                ['id' => 'role-b', 'companyId' => 'audit-a'],
                ['id' => 'role-c', 'companyId' => 'audit-a'],
            ],
            'orgNodes' => [
                ['id' => 'unit-a', 'companyId' => 'audit-a'],
                ['id' => 'unit-b', 'companyId' => 'audit-a'],
                ['id' => 'unit-c', 'companyId' => 'audit-a'],
            ],
            'controlTasks' => [
                ['id' => 'task-a', 'companyId' => 'audit-a', 'assigneeEmployeeId' => 'employee-a', 'sectorId' => 'unit-a'],
                ['id' => 'task-b', 'companyId' => 'audit-a', 'assigneeEmployeeId' => 'employee-b', 'sectorId' => 'unit-b'],
                ['id' => 'task-unassigned', 'companyId' => 'audit-a', 'assigneeEmployeeId' => null, 'sectorId' => 'unit-a'],
            ],
            'payrollSlips' => [
                ['id' => 'slip-a', 'companyId' => 'audit-a', 'employeeId' => 'employee-a', 'employee' => 'Mame Diop'],
                ['id' => 'slip-b', 'companyId' => 'audit-a', 'employeeId' => 'employee-b', 'employee' => 'Mame Diop'],
                ['id' => 'slip-ambiguous', 'companyId' => 'audit-a', 'employee' => 'Mame Diop'],
                ['id' => 'slip-foreign-legacy', 'companyId' => 'audit-a', 'employee' => 'Ndeye Fall'],
            ],
        ];
        DB::table('maximus_app_states')->where('scope', 'workspace')->update([
            'payload' => json_encode($state, JSON_THROW_ON_ERROR),
        ]);
        $employee = AuthUser::query()->create([
            'id' => 'audit-scoped-employee',
            'email' => 'scoped.employee@audit.test',
            'password_hash' => 'unused-test-only',
            'display_name' => 'Employée de test',
            'role' => 'employee',
            'company_id' => 'audit-a',
            'employee_id' => 'employee-a',
            'sector_ids' => ['unit-a'],
            'permissions' => ['paie' => ['voir']],
            'status' => 'ACTIF',
        ]);

        $response = $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($employee))
            ->getJson('/api/app-state/bootstrap')
            ->assertOk();

        $this->assertSame(['employee-a'], array_column($response->json('data.employees'), 'id'));
        $this->assertSame(['role-a'], array_column($response->json('data.roles'), 'id'));
        $this->assertSame(['unit-a'], array_column($response->json('data.orgNodes'), 'id'));
        $this->assertSame(['task-a'], array_column($response->json('data.controlTasks'), 'id'));
        $this->assertSame(['slip-a'], array_column($response->json('data.payrollSlips'), 'id'));
        $this->assertSame(['company-notification'], array_column($response->json('data.notifications'), 'id'));
        $this->assertSame([], $response->json('data.subscriptions'));
        $this->assertSame([], $response->json('data.domainEvents'));
        $this->assertSame([], $response->json('data.auditEntries'));
    }

    public function test_sector_manager_bootstrap_is_limited_to_managed_sectors_and_descendants(): void
    {
        $state = [
            ...$this->original,
            'employees' => [
                ['id' => 'employee-root', 'companyId' => 'audit-a', 'roleId' => 'role-root', 'sectorId' => 'unit-root'],
                ['id' => 'employee-child', 'companyId' => 'audit-a', 'roleId' => 'role-child', 'sectorId' => 'unit-child'],
                ['id' => 'employee-outside', 'companyId' => 'audit-a', 'roleId' => 'role-outside', 'sectorId' => 'unit-outside'],
            ],
            'roles' => [
                ['id' => 'role-root', 'companyId' => 'audit-a'],
                ['id' => 'role-child', 'companyId' => 'audit-a'],
                ['id' => 'role-outside', 'companyId' => 'audit-a'],
            ],
            'orgNodes' => [
                ['id' => 'unit-root', 'companyId' => 'audit-a', 'parentId' => null],
                ['id' => 'unit-child', 'companyId' => 'audit-a', 'parentId' => 'unit-root'],
                ['id' => 'unit-outside', 'companyId' => 'audit-a', 'parentId' => null],
            ],
            'controlTasks' => [
                ['id' => 'task-root', 'companyId' => 'audit-a', 'assigneeEmployeeId' => 'employee-root', 'sectorId' => 'unit-root'],
                ['id' => 'task-child', 'companyId' => 'audit-a', 'assigneeEmployeeId' => 'employee-child', 'sectorId' => 'unit-child'],
                ['id' => 'task-outside', 'companyId' => 'audit-a', 'assigneeEmployeeId' => 'employee-outside', 'sectorId' => 'unit-outside'],
                ['id' => 'task-unassigned-root', 'companyId' => 'audit-a', 'assigneeEmployeeId' => null, 'sectorId' => 'unit-root'],
                ['id' => 'task-unassigned-outside', 'companyId' => 'audit-a', 'assigneeEmployeeId' => null, 'sectorId' => 'unit-outside'],
            ],
        ];
        DB::table('maximus_app_states')->where('scope', 'workspace')->update([
            'payload' => json_encode($state, JSON_THROW_ON_ERROR),
        ]);
        $manager = AuthUser::query()->create([
            'id' => 'audit-scoped-manager',
            'email' => 'scoped.manager@audit.test',
            'password_hash' => 'unused-test-only',
            'display_name' => 'Manager de test',
            'role' => 'sector_manager',
            'company_id' => 'audit-a',
            'sector_ids' => ['unit-root'],
            'permissions' => [],
            'status' => 'ACTIF',
        ]);
        foreach ([
            ['id' => 'audit-root-employee', 'employeeId' => 'employee-root', 'sectorIds' => ['unit-root']],
            ['id' => 'audit-child-employee', 'employeeId' => 'employee-child', 'sectorIds' => ['unit-child']],
            ['id' => 'audit-outside-employee', 'employeeId' => 'employee-outside', 'sectorIds' => ['unit-outside']],
        ] as $account) {
            AuthUser::query()->create([
                'id' => $account['id'],
                'email' => $account['id'].'@audit.test',
                'password_hash' => 'unused-test-only',
                'display_name' => $account['id'],
                'role' => 'employee',
                'company_id' => 'audit-a',
                'employee_id' => $account['employeeId'],
                'sector_ids' => $account['sectorIds'],
                'permissions' => [],
                'status' => 'ACTIF',
            ]);
        }

        $response = $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($manager))
            ->getJson('/api/app-state/bootstrap')
            ->assertOk();

        $this->assertEqualsCanonicalizing(
            ['employee-root', 'employee-child'],
            array_column($response->json('data.employees'), 'id'),
        );
        $this->assertEqualsCanonicalizing(
            ['role-root', 'role-child'],
            array_column($response->json('data.roles'), 'id'),
        );
        $this->assertEqualsCanonicalizing(
            ['unit-root', 'unit-child'],
            array_column($response->json('data.orgNodes'), 'id'),
        );
        $this->assertEqualsCanonicalizing(
            ['task-root', 'task-child', 'task-unassigned-root'],
            array_column($response->json('data.controlTasks'), 'id'),
        );
    }

    public function test_legitimate_company_snapshot_preserves_other_tenants_and_private_state(): void
    {
        $this->putJson('/api/app-state', [
            'version' => 1,
            'data' => [
                'products' => [['id' => 'product-a', 'companyId' => 'audit-a', 'name' => 'Own product']],
                'moduleOverrides' => $this->original['moduleOverrides'],
            ],
        ])->assertOk();
        $state = json_decode(DB::table('maximus_app_states')->where('scope', 'workspace')->value('payload'), true);
        $this->assertSame($this->original['products'][0], $state['products'][0]);
        $this->assertSame('product-a', $state['products'][1]['id']);
        $this->assertSame($this->original['companySetupPlans'], $state['companySetupPlans']);
        $this->assertSame($this->original['moduleOverrides'], $state['moduleOverrides']);
    }

    private function loginAs(string $role): void
    {
        $user = AuthUser::query()->create([
            'id' => 'audit-'.$role,
            'email' => $role.'@audit.test',
            'password_hash' => 'unused-test-only',
            'display_name' => 'Synthetic audit actor',
            'role' => $role,
            'company_id' => 'audit-a',
            'sector_ids' => [],
            'permissions' => [],
            'status' => 'ACTIF',
        ]);
        $this->withCredentials()->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user));
    }

    private function assertStateUnchanged(): void
    {
        $row = DB::table('maximus_app_states')->where('scope', 'workspace')->first();
        $this->assertSame($this->original, json_decode($row->payload, true));
        $this->assertSame(1, $row->version);
    }
}
