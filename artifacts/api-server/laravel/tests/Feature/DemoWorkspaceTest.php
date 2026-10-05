<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Models\Company;
use App\Support\DemoWorkspace;
use App\Support\MaximusAuth;
use App\Support\ModuleCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DemoWorkspaceTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_data_can_be_edited_and_switched_off_without_changing_real_data(): void
    {
        $this->prepareCompany();
        DB::table('maximus_app_states')->insert([
            'scope' => 'workspace',
            'company_id' => null,
            'payload' => json_encode([
                'companies' => [['id' => 'kora', 'name' => 'Kora', 'status' => 'ACTIF']],
                'products' => [[
                    'id' => 'real-product-1',
                    'sku' => 'REAL-001',
                    'name' => 'Article réel',
                    'category' => 'Divers',
                    'stock' => 4,
                    'threshold' => 1,
                    'price' => 1000,
                    'companyId' => 'kora',
                ]],
            ], JSON_THROW_ON_ERROR),
            'version' => 4,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $request = $this->asCompanyAdmin();
        $request->patchJson('/api/companies/kora/demo-mode', ['enabled' => true])
            ->assertOk()
            ->assertJsonPath('enabled', true)
            ->assertJsonPath('initialized', true);
        $staleState = [
            'companies' => [['id' => 'kora', 'name' => 'Kora']],
            'products' => [],
        ];
        $request->withHeader('X-Maximus-Dataset', 'real')
            ->putJson('/api/app-state', ['version' => 4, 'data' => $staleState])
            ->assertStatus(409)
            ->assertJsonPath('code', 'DATASET_MODE_CHANGED');
        $demoCompanyId = DemoWorkspace::datasetCompanyId('kora');
        $this->assertDatabaseHas('control_tasks', ['company_id' => $demoCompanyId]);
        $this->assertDatabaseHas('presence_items', ['company_id' => $demoCompanyId]);
        $this->assertDatabaseHas('stock_products', ['company_id' => $demoCompanyId]);
        $this->assertDatabaseHas('ecommerce_stores', ['company_id' => $demoCompanyId]);
        $this->assertDatabaseHas('payroll_batches', ['company_id' => $demoCompanyId]);
        $this->assertDatabaseHas('transport_trips', ['company_id' => $demoCompanyId]);
        $this->assertDatabaseHas('immobilier_properties', ['company_id' => $demoCompanyId]);

        $demoBootstrap = $request->getJson('/api/app-state/bootstrap')
            ->assertOk()
            ->assertJsonPath('dataset', 'demo')
            ->assertJsonPath('data.companies.0.demoMode', true);
        $demoData = $demoBootstrap->json('data');
        $this->assertCount(3, $demoData['products']);
        $this->assertSame('Ordinateur portable', $demoData['products'][0]['name']);
        $demoData['products'][0]['name'] = 'Ordinateur modifié en démo';

        $request->withHeader('X-Maximus-Dataset', 'demo')
            ->putJson('/api/app-state', [
                'version' => $demoBootstrap->json('version'),
                'data' => $demoData,
            ])
            ->assertOk()
            ->assertJsonPath('dataset', 'demo');

        $demoScope = DemoWorkspace::stateScope('kora');
        $demoState = json_decode(
            (string) DB::table('maximus_app_states')->where('scope', $demoScope)->value('payload'),
            true,
            flags: JSON_THROW_ON_ERROR,
        );
        $this->assertSame('Ordinateur modifié en démo', $demoState['products'][0]['name']);

        $request->patchJson('/api/companies/kora/demo-mode', ['enabled' => false])
            ->assertOk()
            ->assertJsonPath('enabled', false);
        $request->withHeader('X-Maximus-Dataset', 'demo')
            ->putJson('/api/app-state', ['version' => 1, 'data' => $staleState])
            ->assertStatus(409)
            ->assertJsonPath('code', 'DATASET_MODE_CHANGED');
        $realBootstrap = $request->getJson('/api/app-state/bootstrap')
            ->assertOk()
            ->assertJsonPath('dataset', 'real');
        $this->assertSame('Article réel', $realBootstrap->json('data.products.0.name'));

        $request->patchJson('/api/companies/kora/demo-mode', ['enabled' => true])
            ->assertOk();
        $request->getJson('/api/app-state/bootstrap')
            ->assertOk()
            ->assertJsonPath('dataset', 'demo')
            ->assertJsonPath('data.products.0.name', 'Ordinateur modifié en démo');
        $this->assertSame('Article réel', json_decode(
            (string) DB::table('maximus_app_states')->where('scope', 'workspace')->value('payload'),
            true,
            flags: JSON_THROW_ON_ERROR,
        )['products'][0]['name']);
    }

    public function test_stock_routes_use_the_synthetic_company_and_reject_a_stale_dataset_header(): void
    {
        $this->prepareCompany();
        ModuleCatalog::ensureCompanyAccess('kora', ['stocks']);
        $request = $this->asCompanyAdmin();
        $request->patchJson('/api/companies/kora/demo-mode', ['enabled' => true])->assertOk();

        $demoCompanyId = DemoWorkspace::datasetCompanyId('kora');
        $request->withHeader('X-Maximus-Dataset', 'demo')
            ->getJson('/api/stock/bootstrap?scope=core')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Ordinateur portable 14 pouces'])
            ->assertJsonFragment(['name' => 'Détergent multi-usage 5 L'])
            ->assertJsonFragment(['name' => 'Aliment poisson granulé 4 mm']);

        $created = $request->withHeader('X-Maximus-Dataset', 'demo')
            ->postJson('/api/stock/products', [
                'name' => 'Article fictif ajouté',
                'sku' => 'DEMO-CREATED-001',
                'purchasePrice' => 1000,
                'salePrice' => 1500,
            ])
            ->assertCreated();
        $this->assertDatabaseHas('stock_products', [
            'id' => $created->json('id'),
            'company_id' => $demoCompanyId,
            'sku' => 'DEMO-CREATED-001',
        ]);

        $request->patchJson('/api/companies/kora/demo-mode', ['enabled' => false])->assertOk();
        $request->withHeader('X-Maximus-Dataset', 'demo')
            ->getJson('/api/stock/bootstrap?scope=core')
            ->assertStatus(409)
            ->assertJsonPath('code', 'DATASET_MODE_CHANGED');
        $request->withHeader('X-Maximus-Dataset', 'real')
            ->getJson('/api/stock/bootstrap?scope=core')
            ->assertOk()
            ->assertJsonMissing(['sku' => 'DEMO-CREATED-001']);
    }

    public function test_control_reads_and_writes_only_the_demo_company_records(): void
    {
        $this->prepareCompany();
        DB::table('control_tasks')->insert([
            'id' => 'real-control-task',
            'company_id' => 'kora',
            'sector_id' => null,
            'title' => 'Tâche réelle privée',
            'description' => 'Cette tâche ne doit pas apparaître en mode Démonstration.',
            'module_id' => 'stocks',
            'assignee_employee_id' => null,
            'assignee_name' => null,
            'created_by' => 'Administration Kora',
            'status' => 'EN COURS',
            'priority' => 'NORMALE',
            'requires_approval' => false,
            'due_date' => null,
            'related_object' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $request = $this->asCompanyAdmin();
        $request->patchJson('/api/companies/kora/demo-mode', ['enabled' => true])->assertOk();
        $demoCompanyId = DemoWorkspace::datasetCompanyId('kora');

        $bootstrap = $request->withHeader('X-Maximus-Dataset', 'demo')
            ->getJson('/api/control/bootstrap?scope=all&companyId=kora')
            ->assertOk()
            ->assertJsonMissing(['id' => 'real-control-task'])
            ->assertJsonFragment(['companyId' => $demoCompanyId]);
        $demoTaskId = DB::table('control_tasks')->where('company_id', $demoCompanyId)->value('id');
        $this->assertNotEmpty($demoTaskId);

        $request->withHeader('X-Maximus-Dataset', 'demo')
            ->patchJson('/api/control/tasks/'.$demoTaskId.'/status?companyId=kora', ['status' => 'TERMINÉ'])
            ->assertOk();
        $this->assertDatabaseHas('control_tasks', [
            'id' => $demoTaskId,
            'company_id' => $demoCompanyId,
            'status' => 'TERMINÉ',
        ]);
        $this->assertDatabaseHas('control_tasks', [
            'id' => 'real-control-task',
            'company_id' => 'kora',
            'status' => 'EN COURS',
        ]);
    }

    public function test_demo_mode_blocks_real_account_changes_and_external_payments(): void
    {
        $this->prepareCompany();
        ModuleCatalog::ensureCompanyAccess('kora', ['paie']);
        $request = $this->asCompanyAdmin();
        $request->patchJson('/api/companies/kora/demo-mode', ['enabled' => true])->assertOk();

        $request->withHeader('X-Maximus-Dataset', 'demo')
            ->patchJson('/api/ecommerce/store', ['status' => 'PUBLISHED'])
            ->assertForbidden()
            ->assertJsonPath('code', 'DEMO_STORE_PUBLISH_BLOCKED');

        $request->withHeader('X-Maximus-Dataset', 'demo')
            ->postJson('/api/auth/accounts', [
                'companyId' => 'kora',
                'id' => 'must-not-be-created',
                'email' => 'must-not-be-created@example.test',
                'displayName' => 'Compte non créé',
                'role' => 'employee',
                'password' => 'DemoPassword2026!',
            ])
            ->assertForbidden()
            ->assertJsonPath('code', 'DEMO_REAL_ACCOUNT_MUTATION_BLOCKED');
        $this->assertDatabaseMissing('auth_users', ['id' => 'must-not-be-created']);

        $request->withHeader('X-Maximus-Dataset', 'demo')
            ->postJson('/api/payroll/wallet/topups', [])
            ->assertForbidden()
            ->assertJsonPath('code', 'DEMO_MONEY_MOVEMENT_BLOCKED');
    }

    public function test_demo_mode_reads_reflect_changes_made_by_another_database_worker(): void
    {
        $this->prepareCompany();
        $request = $this->asCompanyAdmin();
        $request->patchJson('/api/companies/kora/demo-mode', ['enabled' => true])->assertOk();

        DB::table('maximus_app_states')
            ->where('scope', DemoWorkspace::modeScope('kora'))
            ->update([
                'payload' => json_encode([
                    'enabled' => false,
                    'initialized' => true,
                    'companyId' => 'kora',
                    'datasetCompanyId' => DemoWorkspace::datasetCompanyId('kora'),
                ], JSON_THROW_ON_ERROR),
            ]);

        $this->assertFalse(DemoWorkspace::isEnabled('kora'));
    }

    private function prepareCompany(): void
    {
        Company::query()->create([
            'id' => 'kora',
            'name' => 'Kora',
            'manager' => 'Responsable Kora',
            'email' => 'demo-workspace-kora@example.test',
            'status' => 'ACTIF',
            'requested_modules' => ['stocks', 'paie', 'ecommerce'],
        ]);
        ModuleCatalog::ensureCompanyAccess('kora', ['stocks', 'paie', 'ecommerce']);
    }

    private function asCompanyAdmin(): self
    {
        $user = AuthUser::query()->create([
            'id' => 'demo-workspace-admin',
            'email' => 'demo-workspace-admin@kora.example.test',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Administration Kora',
            'role' => 'company_admin',
            'company_id' => 'kora',
            'sector_ids' => [],
            'permissions' => [],
            'status' => 'ACTIF',
        ]);

        return $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user));
    }
}
