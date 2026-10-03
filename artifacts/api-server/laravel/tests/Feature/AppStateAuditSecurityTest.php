<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Models\Company;
use App\Support\MaximusAuth;
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
            ->assertJsonCount(1, 'data.businessDocuments');
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
            ->assertJsonMissingPath('data.companySetupPlans');
        $this->assertStateUnchanged();
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
