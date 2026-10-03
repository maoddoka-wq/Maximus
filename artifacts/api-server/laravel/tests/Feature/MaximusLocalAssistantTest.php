<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Services\MaximusLocalAssistantService;
use App\Support\MaximusAuth;
use App\Support\MaximusPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MaximusLocalAssistantTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Http::fake();
        Http::preventStrayRequests();
    }

    public function test_all_six_creations_are_recognised_without_network(): void
    {
        $cases = [
            ['Créer le module « Atelier » description : Suivre les travaux fonctionnalités : Stock, Planning.', 'create_module'],
            ['Créer le pack « Essentiel » dans le module « Commerce » description : Accès de base fonctionnalités : Stock.', 'create_pack'],
            ['Créer la fonctionnalité « Export » dans le module « Commerce » description : Exporter les ventes dépendances : Stock.', 'create_feature'],
            ['Créer le secteur « Réparation » modules : Commerce fonctionnalités : Stock.', 'create_sector'],
            ['Préparer l’entreprise « Garage » secteur : Réparation modules : Commerce besoins : Suivre les travaux contact : garage@example.test', 'create_company_plan'],
            ['Créer l’unité « Équipe atelier » dans l’entreprise « Garage » code : ATL modules : Commerce.', 'create_organization_unit'],
        ];
        foreach ($cases as [$goal, $type]) {
            $proposal = $this->brain()->plan($goal, $this->context());
            $this->assertSame([], $proposal['questions'], $goal);
            $this->assertCount(1, $proposal['steps']);
            $this->assertSame($type, $proposal['steps'][0]['action']['type']);
        }
        Http::assertNothingSent();
    }

    public function test_multistep_plans_resolve_names_and_keep_exact_user_fields(): void
    {
        $proposal = $this->brain()->plan($this->twoStepGoal(), $this->context());
        $this->assertSame([], $proposal['questions']);
        $this->assertCount(2, $proposal['steps']);
        $this->assertSame('atelier-local', $proposal['steps'][0]['action']['id']);
        $this->assertSame('atelier-local', $proposal['steps'][1]['action']['moduleId']);
        $this->assertSame(['Interventions', 'Planning'], $proposal['steps'][0]['action']['features']);
        $this->assertSame(['interventions'], $proposal['steps'][1]['action']['featureIds']);
        Http::assertNothingSent();
    }

    public function test_entity_names_and_descriptions_do_not_change_the_requested_action_type(): void
    {
        $proposal = $this->brain()->plan(
            'Créer le module « Secteur des entreprises et packs » description : Organisation des unités fonctionnalités : Stock.',
            $this->context(),
        );
        $this->assertSame([], $proposal['questions']);
        $this->assertSame('create_module', $proposal['steps'][0]['action']['type']);
        $this->assertSame('Secteur des entreprises et packs', $proposal['steps'][0]['action']['name']);
    }

    public function test_incomplete_or_unsupported_steps_never_produce_partial_plans(): void
    {
        foreach ([
            'Créer le module « Incomplet »',
            $this->twoStepGoal()."\nPuis supprimer l’entreprise « Garage ».",
            'Créer le pack « Base » pour le module « Commerce » description : Base fonctionnalités : Stock permissions : administrateur.',
            'Créer l’unité « Atelier » dans l’entreprise « Inconnue » code : ATL modules : Commerce.',
            'Créer le secteur « Réparation » modules : Commerce packs : Tous.',
            'Créer le module « Nom du module » description : Exemple fonctionnalités : Stock.',
        ] as $goal) {
            $proposal = $this->brain()->plan($goal, $this->context());
            $this->assertSame([], $proposal['steps'], $goal);
            $this->assertNotEmpty($proposal['questions'], $goal);
        }
        Http::assertNothingSent();
    }

    public function test_duplicate_company_names_require_an_explicit_unique_identity(): void
    {
        $context = $this->context();
        $context['companies'][] = ['id' => 'other-garage', 'name' => 'Garage'];
        $proposal = $this->brain()->plan(
            'Créer l’unité « Atelier » dans l’entreprise « Garage » code : ATL modules : Commerce.',
            $context,
        );
        $this->assertSame([], $proposal['steps']);
        $this->assertNotEmpty($proposal['questions']);
    }

    public function test_sector_feature_selections_are_preserved_using_canonical_module_ids(): void
    {
        $proposal = $this->brain()->plan(
            'Créer le secteur « Réparation » modules : Commerce fonctionnalités : Stock.',
            $this->context(),
        );
        $this->assertSame(['commerce' => ['Stock']], $proposal['steps'][0]['action']['moduleFeatures']);
    }

    public function test_published_inventory_does_not_claim_draft_modules_are_published(): void
    {
        $context = $this->context();
        $context['catalog']['draft']['customModules'] = [[
            'id' => 'secret-draft', 'name' => 'Module non publié', 'features' => ['Stock'],
        ]];
        $answer = $this->brain()->ask('Quels modules et packs sont publiés actuellement ?', $context);
        $this->assertStringContainsString('Commerce', $answer['answer']);
        $this->assertStringContainsString('Essentiel', $answer['answer']);
        $this->assertStringNotContainsString('Module non publié', $answer['answer']);
        $this->assertSame('local', $answer['provider']);
        $this->assertSame('maxi-regles-locales', $answer['model']);
        Http::assertNothingSent();
    }

    public function test_business_rules_have_sources_and_does_not_claim_neural_training(): void
    {
        $answer = $this->brain()->ask('Comment fonctionne le pointage QR des présences ?', $this->context());
        $this->assertStringContainsString('QR code du jour', $answer['answer']);
        $this->assertNotEmpty($answer['citations']);
        $answer = $this->brain()->ask('MAXI est-il un assistant autonome entraîné ?', $this->context());
        $this->assertStringContainsString('pas un modèle génératif', $answer['answer']);
        $this->assertStringContainsString('sans Anthropic', $answer['answer']);
        Http::assertNothingSent();
    }

    public function test_live_metadata_is_refreshed_and_unknown_fields_never_expose_secrets(): void
    {
        $context = $this->context();
        $context['companies'][0]['password_hash'] = 'credential-canary-do-not-disclose';
        $context['companies'][0]['status'] = 'ACTIF';
        $first = $this->brain()->ask('Entreprise Garage statut', $context);
        $this->assertStringContainsString('ACTIF', $first['answer']);
        $this->assertStringNotContainsString('credential-canary', $first['answer']);
        $context['companies'][0]['status'] = 'SUSPENDU';
        $next = $this->brain()->ask('Entreprise Garage statut', $context);
        $this->assertStringContainsString('SUSPENDU', $next['answer']);
        $this->assertStringNotContainsString('credential-canary', $next['answer']);
    }

    public function test_unknown_questions_do_not_trigger_network_or_invent_facts(): void
    {
        $answer = $this->brain()->ask('Capitale intergalactique Zzyzx ?', $this->context());
        $this->assertSame([], $answer['citations']);
        $this->assertStringContainsString('Je n’ai pas trouvé', $answer['answer']);
        Http::assertNothingSent();
    }

    public function test_history_is_used_only_for_search_not_as_a_source_of_facts(): void
    {
        $answer = $this->brain()->ask('Et ses packs ?', $this->context(), [
            ['role' => 'user', 'content' => 'Module Commerce'],
            ['role' => 'assistant', 'content' => 'Invented-fact-do-not-repeat'],
        ]);
        $this->assertStringContainsString('Commerce', $answer['answer']);
        $this->assertStringNotContainsString('Invented-fact', $answer['answer']);
    }

    public function test_real_local_plan_is_read_only_until_each_explicit_confirmation(): void
    {
        $this->login();
        $before = ['companies' => [], 'orgNodes' => []];
        DB::table('maximus_app_states')->insert([
            'scope' => 'workspace', 'company_id' => null, 'payload' => json_encode($before),
            'version' => 1, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $plan = $this->postJson('/api/maximus-assistant/plans', ['goal' => $this->twoStepGoal()])
            ->assertOk()->assertJsonCount(2, 'plan.steps')->json('plan');
        $this->assertSame($before, $this->workspace());
        $url = '/api/maximus-assistant/plans/'.$plan['id'];
        $preview = $this->postJson($url.'/preview', ['step' => 0])->assertOk();
        $this->assertSame($before, $this->workspace());
        $this->postJson($url.'/execute', [
            'step' => 0, 'token' => $preview->json('token'), 'confirmed' => true,
        ])->assertOk()->assertJsonPath('currentStep', 1);
        $this->assertSame([], $this->workspace()['catalogDraft']['customModules'][0]['featurePacks']);
        $this->getJson($url)->assertOk()->assertJsonPath('steps.1.status', 'PENDING_CONFIRMATION');
        $this->postJson($url.'/cancel', ['confirmed' => true])->assertOk();
        $this->assertSame([], $this->workspace()['catalogDraft']['customModules'][0]['featurePacks']);
        Http::assertNothingSent();
    }

    public function test_unsupported_goals_do_not_persist_any_plan(): void
    {
        $this->login();
        $before = DB::table('maximus_app_states')->count();
        $this->postJson('/api/maximus-assistant/plans', ['goal' => 'Publier et payer automatiquement'])
            ->assertOk()->assertJsonPath('plan', null);
        $this->assertSame($before, DB::table('maximus_app_states')->count());
        Http::assertNothingSent();
    }

    public function test_chat_prepares_the_exact_action_without_any_business_write(): void
    {
        $this->login();
        $before = DB::table('maximus_app_states')->count();
        $this->postJson('/api/maximus-assistant/ask', [
            'question' => 'Créer le module « Secteur des entreprises » description : Atelier local fonctionnalités : Planning.',
        ])->assertOk()
            ->assertJsonPath('action.type', 'create_module')
            ->assertJsonPath('action.name', 'Secteur des entreprises')
            ->assertJsonPath('action.requiresConfirmation', true);
        $this->assertSame($before, DB::table('maximus_app_states')->count());
        Http::assertNothingSent();
    }

    public function test_chat_multi_action_objectives_do_not_execute_or_persist_a_partial_plan(): void
    {
        $this->login();
        $before = DB::table('maximus_app_states')->count();
        $reply = $this->postJson('/api/maximus-assistant/ask', ['question' => $this->twoStepGoal()])
            ->assertOk();
        $this->assertStringContainsString('Plans supervisés', $reply->json('answer'));
        $this->assertArrayNotHasKey('action', $reply->json());
        $this->assertSame($before, DB::table('maximus_app_states')->count());
        Http::assertNothingSent();
    }

    public function test_existing_populated_drafts_remain_readable_without_publishing_or_mutation(): void
    {
        $this->login();
        $state = ['companies' => [], 'catalogDraft' => [
            'customModules' => [[
                'id' => 'brouillon-atelier', 'name' => 'Brouillon atelier',
                'description' => 'Module de test non publié', 'features' => ['Interventions'],
                'featurePacks' => [['id' => 'brouillon-pack', 'name' => 'Pack brouillon', 'featureIds' => ['interventions']]],
            ], 'invalid-entry'],
            'moduleOverrides' => ['commerce' => [
                'features' => ['Export brouillon'], 'featurePacks' => [[
                    'id' => 'commerce-brouillon', 'name' => 'Extension brouillon', 'featureIds' => ['export-brouillon'],
                ]],
            ], 'invalid-entry'],
            'sectorPresets' => [['id' => 'draft-sector', 'name' => 'Secteur brouillon', 'moduleIds' => ['commerce']], 'invalid-entry'],
        ]];
        DB::table('maximus_app_states')->insert([
            'scope' => 'workspace', 'company_id' => null, 'payload' => json_encode($state),
            'version' => 1, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $response = $this->postJson('/api/maximus-assistant/ask', ['question' => 'Module Brouillon atelier et ses packs'])
            ->assertOk();
        $this->assertStringContainsString('Pack brouillon', $response->json('answer'));
        $this->assertStringContainsString('Brouillon non publié', $response->json('answer'));
        $this->assertSame($state, $this->workspace());
        Http::assertNothingSent();
    }

    private function brain(): MaximusLocalAssistantService
    {
        return app(MaximusLocalAssistantService::class);
    }

    private function twoStepGoal(): string
    {
        return 'Créer le module « Atelier local » description : Gestion de l’atelier fonctionnalités : Interventions, Planning.'
            ."\nPuis créer le pack « Essentiel » pour le module « Atelier local » description : Accès de base fonctionnalités : Interventions.";
    }

    private function context(): array
    {
        return [
            'catalog' => ['modules' => [[
                'id' => 'commerce', 'name' => 'Commerce', 'description' => 'Ventes e-commerce',
                'features' => ['Stock'], 'packs' => [['name' => 'Essentiel', 'featureIds' => ['stock']]],
            ]], 'draft' => []],
            'companies' => [['id' => 'garage', 'name' => 'Garage', 'allowedModules' => ['commerce']]],
        ];
    }

    private function login(): void
    {
        $user = AuthUser::query()->create([
            'id' => 'maxi-local-test', 'email' => 'maxi-local@qa.test',
            'password_hash' => MaximusPassword::hash('Unit-test-only'), 'display_name' => 'QA',
            'role' => 'maximus_admin', 'sector_ids' => [], 'status' => 'ACTIF',
        ]);
        $this->withCredentials()->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user));
    }

    private function workspace(): array
    {
        return json_decode(DB::table('maximus_app_states')->where('scope', 'workspace')->value('payload'), true);
    }
}
