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

    public function test_only_the_main_maximus_admin_can_use_the_maxi_assistant(): void
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

    public function test_main_maximus_admin_receives_a_replit_ai_answer_from_server_context(): void
    {
        config()->set('services.replit_ai.api_key', 'test-replit-ai-key');
        config()->set('services.replit_ai.base_url', 'https://replit-ai.test/v1');
        config()->set('services.replit_ai.model', 'gpt-5.6-terra');
        Http::fake([
            'https://replit-ai.test/v1/chat/completions' => Http::response([
                'choices' => [[
                    'message' => [
                        'role' => 'assistant',
                        'content' => 'Le catalogue contient plusieurs modules configurables.',
                    ],
                ]],
            ], 200),
        ]);

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
            ->assertJsonPath('answer', 'Le catalogue contient plusieurs modules configurables.')
            ->assertJsonPath('provider', 'replit-openai')
            ->assertJsonPath('model', 'gpt-5.6-terra');

        Http::assertSent(function ($request): bool {
            return $request->url() === 'https://replit-ai.test/v1/chat/completions'
                && $request->header('Authorization')[0] === 'Bearer test-replit-ai-key'
                && $request['messages'][1]['content'] === 'Quels modules sont disponibles ?'
                && str_contains($request['messages'][0]['content'], 'administration principale');
        });
    }

    public function test_it_explains_when_replit_ai_has_no_available_credit(): void
    {
        config()->set('services.replit_ai.api_key', 'test-replit-ai-key');
        config()->set('services.replit_ai.base_url', 'https://replit-ai.test/v1');
        Http::fake([
            'https://replit-ai.test/v1/chat/completions' => Http::response([
                'error' => [
                    'message' => 'insufficient_quota: credit balance is too low.',
                ],
            ], 400),
        ]);

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
            ->assertStatus(503)
            ->assertJsonPath(
                'error',
                'Le service IA Replit n’a plus de crédit disponible.'
            );
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