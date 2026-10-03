<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Support\MaximusAuth;
use App\Support\MaximusPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MaximusAssistantTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Http::fake();
    }

    public function test_only_the_main_maximus_admin_can_use_the_local_assistant(): void
    {
        $companyAdmin = AuthUser::query()->create([
            'id' => 'assistant-company-admin',
            'email' => 'admin@company.test',
            'password_hash' => MaximusPassword::hash('Admin123!'),
            'display_name' => 'Administrateur entreprise',
            'role' => 'company_admin',
            'company_id' => 'company-1',
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);
        $token = MaximusAuth::issueSession($companyAdmin);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $token)
            ->postJson('/api/maximus-assistant/ask', ['question' => 'Quels modules sont disponibles ?'])
            ->assertForbidden()
            ->assertJsonPath('code', 'MAXIMUS_ADMIN_ONLY');

        Http::assertNothingSent();
    }

    public function test_main_maximus_admin_receives_local_knowledge_from_server_context_without_http(): void
    {
        $admin = AuthUser::query()->create([
            'id' => 'assistant-maximus-admin',
            'email' => 'admin@maximus.test',
            'password_hash' => MaximusPassword::hash('Admin123!'),
            'display_name' => 'Administration MAXIMUS',
            'role' => 'maximus_admin',
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);
        $token = MaximusAuth::issueSession($admin);

        $response = $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $token)
            ->postJson('/api/maximus-assistant/ask', [
                'question' => 'Quels modules sont disponibles ?',
                'history' => [],
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('provider', 'local')
            ->assertJsonPath('model', 'maxi-regles-locales');
        $this->assertStringContainsString('Catalogue publié', $response->json('answer'));
        $this->assertNotEmpty($response->json('citations'));
        Http::assertNothingSent();
    }

    public function test_external_provider_configuration_is_ignored_without_sending_any_request(): void
    {
        config()->set('services.maxi_local.url', 'https://api.anthropic.com/v1/messages');
        Http::fake();

        $admin = AuthUser::query()->create([
            'id' => 'assistant-credit-admin',
            'email' => 'credit-admin@maximus.test',
            'password_hash' => MaximusPassword::hash('Admin123!'),
            'display_name' => 'Administration MAXIMUS',
            'role' => 'maximus_admin',
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);
        $token = MaximusAuth::issueSession($admin);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $token)
            ->postJson('/api/maximus-assistant/ask', [
                'question' => 'Vérifier la disponibilité de MAXI',
            ])
            ->assertOk()
            ->assertJsonPath('provider', 'local')
            ->assertJsonPath('model', 'maxi-regles-locales');
        Http::assertNothingSent();
    }

    public function test_maxi_previews_and_confirms_catalog_and_organization_actions(): void
    {
        $admin = AuthUser::query()->create([
            'id' => 'assistant-action-admin',
            'email' => 'action-admin@maximus.test',
            'password_hash' => MaximusPassword::hash('Admin123!'),
            'display_name' => 'Administration MAXIMUS',
            'role' => 'maximus_admin',
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);
        $token = MaximusAuth::issueSession($admin);

        $moduleAction = [
            'type' => 'create_module',
            'name' => 'Gestion des projets',
            'description' => 'Planifier les projets et suivre leurs livrables.',
            'features' => ['Pilotage', 'Rapports'],
        ];

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $token)
            ->postJson('/api/maximus-assistant/actions/preview', ['action' => $moduleAction])
            ->assertOk()
            ->assertJsonPath('provider', 'maxi')
            ->assertJsonPath('action.status', 'PENDING_CONFIRMATION');

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $token)
            ->postJson('/api/maximus-assistant/actions/execute', [
                'action' => $moduleAction,
                'confirmed' => true,
            ])
            ->assertOk()
            ->assertJsonPath('action.status', 'EXECUTED');

        $packAction = [
            'type' => 'create_pack',
            'moduleId' => 'gestion-des-projets',
            'name' => 'Suivi de projets',
            'description' => 'Suivre les projets et leurs rapports.',
            'featureIds' => ['Pilotage', 'Rapports'],
        ];

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $token)
            ->postJson('/api/maximus-assistant/actions/execute', [
                'action' => $packAction,
                'confirmed' => true,
            ])
            ->assertOk()
            ->assertJsonPath('action.status', 'EXECUTED');

        $stateRow = DB::table('maximus_app_states')->where('scope', 'workspace')->first();
        $statePayload = json_decode((string) $stateRow->payload, true);
        $statePayload['companies'] = [['id' => 'company-action', 'name' => 'Entreprise Action']];
        $statePayload['orgNodes'] = [];
        DB::table('maximus_app_states')->where('scope', 'workspace')->update([
            'payload' => json_encode($statePayload, JSON_THROW_ON_ERROR),
            'updated_at' => now(),
        ]);

        $organizationAction = [
            'type' => 'create_organization_unit',
            'companyId' => 'company-action',
            'name' => 'Équipe projets',
            'code' => 'PROJ',
            'moduleIds' => ['gestion-des-projets'],
            'modulePackIds' => ['gestion-des-projets' => ['gestion-des-projets-suivi-de-projets']],
        ];

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $token)
            ->postJson('/api/maximus-assistant/actions/execute', [
                'action' => $organizationAction,
                'confirmed' => true,
            ])
            ->assertOk()
            ->assertJsonPath('action.status', 'EXECUTED');

        $payload = json_decode((string) DB::table('maximus_app_states')->where('scope', 'workspace')->value('payload'), true);
        $this->assertSame('gestion-des-projets', $payload['catalogDraft']['customModules'][0]['id']);
        $this->assertSame('company-action', $payload['orgNodes'][0]['companyId']);
        $this->assertCount(3, $payload['auditEntries']);
    }

    public function test_maxi_can_prepare_features_sectors_and_a_company_plan_without_activating_company_access(): void
    {
        $admin = AuthUser::query()->create([
            'id' => 'assistant-planning-admin',
            'email' => 'planning-admin@maximus.test',
            'password_hash' => MaximusPassword::hash('Admin123!'),
            'display_name' => 'Administration MAXIMUS',
            'role' => 'maximus_admin',
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);
        $token = MaximusAuth::issueSession($admin);

        $featureAction = [
            'type' => 'create_feature',
            'moduleId' => 'commerce',
            'name' => 'Export comptable',
            'description' => 'Exporter les écritures vers la comptabilité.',
        ];
        $sectorAction = [
            'type' => 'create_sector',
            'name' => 'Cabinet conseil',
            'moduleIds' => ['commerce', 'presences'],
            'modulePackIds' => [
                'commerce' => ['commerce-consultation'],
            ],
        ];

        foreach ([$featureAction, $sectorAction] as $action) {
            $this->withCredentials()
                ->withUnencryptedCookie(MaximusAuth::COOKIE, $token)
                ->postJson('/api/maximus-assistant/actions/execute', [
                    'action' => $action,
                    'confirmed' => true,
                ])
                ->assertOk()
                ->assertJsonPath('action.status', 'EXECUTED');
        }

        $companyPlan = [
            'type' => 'create_company_plan',
            'name' => 'Atelier Kora',
            'sector' => 'Cabinet conseil',
            'companyEmail' => 'atelier@example.com',
            'moduleIds' => ['commerce', 'presences'],
            'requirements' => ['suivi des commandes', 'planning des équipes'],
        ];

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $token)
            ->postJson('/api/maximus-assistant/actions/execute', [
                'action' => $companyPlan,
                'confirmed' => true,
            ])
            ->assertOk()
            ->assertJsonPath('action.status', 'EXECUTED');

        $payload = json_decode((string) DB::table('maximus_app_states')->where('scope', 'workspace')->value('payload'), true);
        $this->assertSame('Cabinet conseil', $payload['catalogDraft']['sectorPresets'][0]['name']);
        $this->assertContains('Export comptable', $payload['catalogDraft']['moduleOverrides']['commerce']['features']);
        $this->assertSame('DRAFT', $payload['companySetupPlans'][0]['status']);
        $this->assertSame([], $payload['companies'] ?? []);
    }
}