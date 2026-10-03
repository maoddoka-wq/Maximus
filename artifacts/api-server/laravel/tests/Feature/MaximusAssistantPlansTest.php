<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Support\MaximusAuth;
use App\Support\MaximusPassword;
use App\Support\ModuleCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class MaximusAssistantPlansTest extends TestCase
{
    use RefreshDatabase;

    private array $providerResponse;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.maxi_local.url', 'http://127.0.0.1:11434/v1/messages');
        DB::table('maximus_app_states')->insert([
            'scope' => 'workspace', 'company_id' => null,
            'payload' => json_encode(['companies' => [], 'orgNodes' => [], 'audit' => []]),
            'version' => 1, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->login();
        $this->provider($this->proposal());
        Http::fake(fn () => Http::response($this->providerResponse));
    }

    public function test_planning_simulates_dependencies_without_any_business_mutation(): void
    {
        $before = $this->workspace();
        $plan = $this->prepare();
        $this->assertCount(2, $plan['steps']);
        $this->assertSame('AWAITING_CONFIRMATION', $plan['status']);
        $this->assertSame($before, $this->workspace());
        $this->getJson('/api/maximus-assistant/plans')->assertOk()->assertJsonCount(1, 'plans');
        $response = $this->getJson('/api/maximus-assistant/plans/'.$plan['id'])
            ->assertOk()->assertJsonPath('currentStep', 0);
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        Http::assertSent(fn ($request): bool => $request['tool_choice']['name'] === 'propose_supervised_plan');
    }

    public function test_preview_is_read_only_and_confirmation_is_bound_to_one_step(): void
    {
        $plan = $this->prepare();
        $before = $this->workspace();
        $preview = $this->postJson($this->url($plan, 'preview'), ['step' => 0])->assertOk()->json();
        $this->assertSame($before, $this->workspace());
        $this->assertArrayNotHasKey('_confirmation', $preview['plan']);
        $this->postJson($this->url($plan, 'execute'), [
            'step' => 0, 'token' => $preview['token'],
        ])->assertUnprocessable();
        $this->execute($plan, 1, $preview['token'])->assertConflict();
        $this->execute($plan, 0, str_repeat('x', 64))->assertConflict();
        $this->execute($plan, 0, $preview['token'])
            ->assertOk()->assertJsonPath('currentStep', 1)
            ->assertJsonPath('steps.0.status', 'EXECUTED')
            ->assertJsonPath('steps.1.status', 'PENDING_CONFIRMATION');
        $this->assertCount(1, $this->workspace()['catalogDraft']['customModules']);
        $this->assertSame([], $this->workspace()['catalogDraft']['customModules'][0]['featurePacks']);
    }

    public function test_duplicate_confirmations_never_repeat_a_mutation_or_run_the_next_step(): void
    {
        $plan = $this->prepare();
        $token = $this->previewToken($plan, 0);
        $this->execute($plan, 0, $token)->assertOk();
        $after = $this->workspace();
        $this->execute($plan, 0, $token)->assertOk()->assertJsonPath('currentStep', 1);
        $this->assertSame($after, $this->workspace());
        $token2 = $this->previewToken($plan, 1);
        $this->execute($plan, 1, $token2)->assertOk()->assertJsonPath('status', 'COMPLETED');
        $this->assertCount(1, $this->workspace()['catalogDraft']['customModules'][0]['featurePacks']);
    }

    public function test_changed_workspace_requires_a_fresh_preview(): void
    {
        $plan = $this->prepare();
        $token = $this->previewToken($plan, 0);
        DB::table('maximus_app_states')->where('scope', 'workspace')->increment('version');
        $this->execute($plan, 0, $token)->assertConflict();
        $this->assertArrayNotHasKey('catalogDraft', $this->workspace());
        $fresh = $this->previewToken($plan, 0);
        $this->execute($plan, 0, $fresh)->assertOk();
    }

    public function test_a_replaced_or_expired_preview_cannot_execute(): void
    {
        $plan = $this->prepare();
        $old = $this->previewToken($plan, 0);
        $new = $this->previewToken($plan, 0);
        $this->execute($plan, 0, $old)->assertConflict();
        $this->travel(16)->minutes();
        $this->execute($plan, 0, $new)->assertConflict();
        $this->assertArrayNotHasKey('catalogDraft', $this->workspace());
    }

    public function test_cancel_stops_future_steps_without_undoing_committed_steps(): void
    {
        $plan = $this->prepare();
        $this->execute($plan, 0, $this->previewToken($plan, 0))->assertOk();
        $token = $this->previewToken($plan, 1);
        $this->postJson($this->url($plan, 'cancel'), ['confirmed' => true])
            ->assertOk()->assertJsonPath('status', 'CANCELLED');
        $this->execute($plan, 1, $token)->assertConflict();
        $this->assertCount(1, $this->workspace()['catalogDraft']['customModules']);
        $this->assertSame([], $this->workspace()['catalogDraft']['customModules'][0]['featurePacks']);
    }

    public function test_other_admins_and_company_users_cannot_access_or_execute_a_private_plan(): void
    {
        $plan = $this->prepare();
        $token = $this->previewToken($plan, 0);
        $this->login('other-admin');
        $this->getJson('/api/maximus-assistant/plans')->assertOk()->assertJsonCount(0, 'plans');
        $this->getJson('/api/maximus-assistant/plans/'.$plan['id'])->assertNotFound();
        $this->execute($plan, 0, $token)->assertNotFound();
        $this->login('company-admin', 'company_admin');
        $this->getJson('/api/maximus-assistant/plans')->assertForbidden();
        $this->postJson('/api/maximus-assistant/plans', ['goal' => 'Créer un module'])->assertForbidden();
        $this->execute($plan, 0, $token)->assertForbidden();
    }

    public function test_the_browser_cannot_substitute_the_action_approved_by_the_server(): void
    {
        $plan = $this->prepare();
        $token = $this->previewToken($plan, 0);
        $this->postJson($this->url($plan, 'execute'), [
            'step' => 0, 'token' => $token, 'confirmed' => true,
            'action' => ['type' => 'publish_catalog'],
        ])->assertUnprocessable();
        $this->assertArrayNotHasKey('catalogDraft', $this->workspace());
    }

    public function test_model_cannot_add_unapproved_permissions_or_hidden_fields_to_a_proposal(): void
    {
        $proposal = $this->proposal();
        $proposal['steps'][1]['action']['featurePermissions'] = ['stock' => ['manage' => true]];
        $this->provider($proposal);
        $this->postJson('/api/maximus-assistant/plans', ['goal' => 'Créer le module QA et son pack'])
            ->assertUnprocessable();
        $this->assertSame(1, DB::table('maximus_app_states')->count());
    }

    public function test_planning_never_contacts_an_external_model_or_credentialed_url(): void
    {
        foreach ([
            '', 'https://api.anthropic.com/v1/messages', 'http://other-host.test/messages',
            'http://127.0.0.1@other-host.test/messages', 'http://user:password@127.0.0.1/messages',
        ] as $url) {
            config()->set('services.maxi_local.url', $url);
            $this->postJson('/api/maximus-assistant/plans', ['goal' => 'Créer un catalogue'])
                ->assertUnprocessable();
        }
        Http::assertNothingSent();
        $this->assertSame(1, DB::table('maximus_app_states')->count());
    }

    public function test_missing_information_returns_questions_without_persisting_or_executing_a_plan(): void
    {
        $proposal = $this->proposal();
        $proposal['steps'] = [];
        $proposal['questions'] = ['Dans quelle entreprise créer l’unité ?'];
        $this->provider($proposal);
        $this->postJson('/api/maximus-assistant/plans', ['goal' => 'Créer une unité'])
            ->assertOk()->assertJsonPath('plan', null)->assertJsonCount(1, 'questions');
        $this->assertSame(1, DB::table('maximus_app_states')->count());
    }

    public function test_unsupported_tools_and_invalid_dependencies_are_rejected_before_saving(): void
    {
        $proposal = $this->proposal();
        $proposal['steps'][0]['action']['type'] = 'execute_sql';
        $this->provider($proposal);
        $this->postJson('/api/maximus-assistant/plans', ['goal' => 'Préparer un catalogue'])->assertUnprocessable();
        $proposal = $this->proposal();
        $proposal['steps'][1]['action']['moduleId'] = 'module-inexistant';
        $this->provider($proposal);
        $this->postJson('/api/maximus-assistant/plans', ['goal' => 'Préparer un catalogue'])->assertUnprocessable();
        $this->assertSame(1, DB::table('maximus_app_states')->count());
    }

    public function test_empty_truncated_and_text_only_provider_responses_fail_explicitly(): void
    {
        foreach ([
            ['content' => [['type' => 'text', 'text' => 'Déjà créé.']]],
            ['content' => [], 'stop_reason' => 'max_tokens'],
        ] as $response) {
            $this->providerResponse = $response;
            $this->postJson('/api/maximus-assistant/plans', ['goal' => 'Créer un catalogue'])
                ->assertUnprocessable();
        }
        $this->assertSame(1, DB::table('maximus_app_states')->count());
    }

    public function test_runtime_validation_failure_keeps_the_workspace_and_plan_progress_atomic(): void
    {
        $plan = $this->prepare();
        $token = $this->previewToken($plan, 0);
        // Simulate a conflicting business object without changing the preview version.
        $state = $this->workspace();
        $state['customModules'] = [[
            'id' => 'qa-plan-module', 'name' => 'Concurrent',
            'description' => 'Concurrent', 'features' => ['Stock'],
        ]];
        DB::table('maximus_app_states')->where('scope', 'workspace')->update(['payload' => json_encode($state)]);
        $this->execute($plan, 0, $token)->assertUnprocessable();
        $this->assertSame($state, $this->workspace());
        $response = $this->getJson('/api/maximus-assistant/plans/'.$plan['id'])->assertOk();
        $this->assertSame(0, $response->json('currentStep'));
        $this->assertNotEmpty($response->json('error'));
    }

    public function test_catalogue_chain_supports_features_packs_sectors_and_company_plans_without_publication(): void
    {
        $proposal = $this->proposal();
        array_splice($proposal['steps'], 1, 0, [[
            'title' => 'Ajouter un export', 'action' => [
                'type' => 'create_feature', 'moduleId' => 'qa-plan-module',
                'name' => 'Export', 'dependencies' => ['stock'],
            ],
        ]]);
        $proposal['steps'][2]['action']['featureIds'][] = 'export';
        $proposal['steps'][] = ['title' => 'Créer le secteur', 'action' => [
            'type' => 'create_sector', 'id' => 'qa-secteur', 'name' => 'QA Secteur',
            'moduleIds' => ['qa-plan-module'],
            'modulePackIds' => ['qa-plan-module' => ['qa-plan-module-essentiel']],
        ]];
        $proposal['steps'][] = ['title' => 'Préparer l’entreprise', 'action' => [
            'type' => 'create_company_plan', 'name' => 'QA Entreprise', 'sector' => 'QA Secteur',
            'moduleIds' => ['qa-plan-module'],
        ]];
        $this->provider($proposal);
        $plan = $this->prepare();
        foreach ($plan['steps'] as $step) {
            $this->execute($plan, $step['index'], $this->previewToken($plan, $step['index']))->assertOk();
        }
        $state = $this->workspace();
        $this->assertSame(['stock', 'export'], $state['catalogDraft']['customModules'][0]['featurePacks'][0]['featureIds']);
        $this->assertSame('DRAFT', $state['companySetupPlans'][0]['status']);
        $this->assertSame($plan['steps'][4]['action']['id'], $state['companySetupPlans'][0]['id']);
        $this->assertSame([], $state['companies']);
        $this->assertArrayNotHasKey('customModules', $state);
    }

    public function test_organization_parent_and_child_identifiers_are_stable_across_preview_and_execution(): void
    {
        $state = $this->workspace();
        $state['companies'] = [['id' => 'qa-company', 'name' => 'QA Company', 'status' => 'ACTIF']];
        DB::table('maximus_app_states')->where('scope', 'workspace')->update(['payload' => json_encode($state)]);
        $proposal = $this->proposal();
        $proposal['steps'] = [
            ['title' => 'Créer le parent', 'action' => [
                'type' => 'create_organization_unit', 'id' => 'qa-parent', 'name' => 'Parent',
                'code' => 'P', 'companyId' => 'qa-company', 'moduleIds' => ['commerce'],
            ]],
            ['title' => 'Créer l’enfant', 'action' => [
                'type' => 'create_organization_unit', 'id' => 'qa-child', 'name' => 'Enfant',
                'code' => 'E', 'companyId' => 'qa-company', 'parentId' => 'qa-parent',
                'moduleIds' => ['commerce'],
            ]],
        ];
        $this->provider($proposal);
        $plan = $this->prepare();
        $this->execute($plan, 0, $this->previewToken($plan, 0))->assertOk();
        $this->execute($plan, 1, $this->previewToken($plan, 1))->assertOk();
        $this->assertSame('qa-parent', $this->workspace()['orgNodes'][0]['id']);
        $this->assertSame('qa-parent', $this->workspace()['orgNodes'][1]['parentId']);
    }

    public function test_several_packs_for_a_standard_module_never_duplicate_existing_packs(): void
    {
        $module = collect(ModuleCatalog::definitions())->firstWhere('id', 'commerce');
        $featureId = Str::slug($module['features'][0]);
        $proposal = $this->proposal();
        $proposal['steps'] = array_map(fn (string $name): array => [
            'title' => 'Créer '.$name, 'action' => [
                'type' => 'create_pack', 'moduleId' => 'commerce', 'name' => $name,
                'description' => 'Pack QA', 'featureIds' => [$featureId],
            ],
        ], ['QA Premier', 'QA Deuxième']);
        $this->provider($proposal);
        $plan = $this->prepare();
        $this->execute($plan, 0, $this->previewToken($plan, 0))->assertOk();
        $this->execute($plan, 1, $this->previewToken($plan, 1))->assertOk();
        $packs = $this->workspace()['catalogDraft']['moduleOverrides']['commerce']['featurePacks'];
        $ids = array_column($packs, 'id');
        $this->assertSame($ids, array_values(array_unique($ids)));
        $this->assertCount(count($module['feature_packs']) + 2, $packs);
    }

    private function login(string $id = 'maxi-plan-admin', string $role = 'maximus_admin'): void
    {
        $user = AuthUser::query()->create([
            'id' => $id, 'email' => $id.'@qa.test',
            'password_hash' => MaximusPassword::hash('Unit-test-only'),
            'display_name' => 'QA', 'role' => $role,
            'company_id' => $role === 'maximus_admin' ? null : 'qa-company',
            'sector_ids' => [], 'status' => 'ACTIF',
        ]);
        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user));
    }

    private function proposal(): array
    {
        return [
            'title' => 'Préparer un module et son pack', 'summary' => 'Deux étapes à confirmer séparément.',
            'questions' => [], 'steps' => [
                ['title' => 'Créer le module', 'action' => [
                    'type' => 'create_module', 'id' => 'qa-plan-module', 'name' => 'QA Plan Module',
                    'description' => 'Module QA', 'features' => ['Stock'],
                ]],
                ['title' => 'Ajouter un pack', 'action' => [
                    'type' => 'create_pack', 'moduleId' => 'qa-plan-module',
                    'name' => 'Essentiel', 'description' => 'Pack QA', 'featureIds' => ['stock'],
                ]],
            ],
        ];
    }

    private function provider(array $input): void
    {
        $this->providerResponse = [
            'stop_reason' => 'tool_use', 'content' => [[
                'type' => 'tool_use', 'id' => 'tool-plan', 'name' => 'propose_supervised_plan', 'input' => $input,
            ]],
        ];
    }

    private function prepare(): array
    {
        return $this->postJson('/api/maximus-assistant/plans', ['goal' => 'Créer le module QA et son pack'])
            ->assertOk()->json('plan');
    }

    private function url(array $plan, string $action): string
    {
        return '/api/maximus-assistant/plans/'.$plan['id'].'/'.$action;
    }

    private function previewToken(array $plan, int $step): string
    {
        return $this->postJson($this->url($plan, 'preview'), ['step' => $step])->assertOk()->json('token');
    }

    private function execute(array $plan, int $step, string $token)
    {
        return $this->postJson($this->url($plan, 'execute'), ['step' => $step, 'token' => $token, 'confirmed' => true]);
    }

    private function workspace(): array
    {
        return json_decode((string) DB::table('maximus_app_states')->where('scope', 'workspace')->value('payload'), true);
    }
}
