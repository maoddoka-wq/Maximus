<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\OnboardingDraft;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OnboardingTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_a_catalog_bound_onboarding_draft_without_credentials(): void
    {
        Http::fake([
            '*replit-ai.test/*' => Http::response([
                'choices' => [[
                    'message' => [
                        'content' => json_encode([
                        'companyProfile' => [
                            'businessType' => 'Boutique de vêtements',
                            'sector' => 'Commerce',
                            'description' => 'Vente en magasin et en ligne.',
                            'employeeEstimate' => 4,
                            'onlineSales' => true,
                            'stockManagement' => true,
                        ],
                        'recommendedModules' => [
                            [
                                'moduleId' => 'commerce',
                                'moduleName' => 'Gestion commerciale',
                                'reason' => 'Suivre les ventes.',
                                'confidence' => 0.92,
                                'packIds' => ['commerce-gestion', 'pack-inconnu'],
                                'featureIds' => ['sales', 'feature-inconnue'],
                            ],
                            [
                                'moduleId' => 'module-inventé',
                                'moduleName' => 'Module inventé',
                                'reason' => 'Ne doit pas être accepté.',
                                'confidence' => 1,
                                'packIds' => [],
                                'featureIds' => [],
                            ],
                        ],
                        'suggestedSettings' => [
                            'currency' => [
                                'value' => 'XOF',
                                'source' => 'Pays à confirmer',
                                'requiresConfirmation' => true,
                            ],
                        ],
                        'unknowns' => ['Confirmer le pays de facturation.'],
                        ], JSON_UNESCAPED_UNICODE),
                    ],
                ]],
            ], 200),
        ]);
        config()->set('services.replit_ai.api_key', 'test-replit-ai-key');
        config()->set('services.replit_ai.base_url', 'https://replit-ai.test/v1');

        $response = $this->postJson('/api/onboarding/drafts', [
            'description' => 'Nous sommes une boutique de vêtements avec une équipe de quatre personnes, un stock et des ventes en ligne.',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('status', 'ANALYZED')
            ->assertJsonPath('proposal.recommendedModules.0.moduleId', 'commerce')
            ->assertJsonPath('proposal.recommendedModules.0.packIds.0', 'commerce-gestion')
            ->assertJsonPath('proposal.recommendedModules.0.featureIds.0', 'dashboard')
            ->assertJsonCount(1, 'proposal.recommendedModules');

        $draft = OnboardingDraft::query()->firstOrFail();
        $this->assertStringNotContainsString('password', json_encode($draft->proposal));
        $this->assertSame('ANALYZED', $draft->status);
    }

    public function test_it_confirms_a_draft_once_and_reuses_the_company_request(): void
    {
        Http::fake([
            '*replit-ai.test/*' => Http::response([
                'choices' => [[
                    'message' => [
                        'content' => json_encode([
                        'companyProfile' => [
                            'businessType' => 'Atelier',
                            'sector' => 'Production',
                            'description' => 'Production et vente.',
                        ],
                        'recommendedModules' => [[
                            'moduleId' => 'commerce',
                            'moduleName' => 'Gestion commerciale',
                            'reason' => 'Suivre les ventes.',
                            'confidence' => 0.8,
                            'packIds' => ['commerce-gestion'],
                            'featureIds' => ['sales'],
                        ]],
                        'suggestedSettings' => [],
                        'unknowns' => [],
                        ], JSON_UNESCAPED_UNICODE),
                    ],
                ]],
            ], 200),
        ]);
        config()->set('services.replit_ai.api_key', 'test-replit-ai-key');
        config()->set('services.replit_ai.base_url', 'https://replit-ai.test/v1');

        $draftResponse = $this->postJson('/api/onboarding/drafts', [
            'description' => 'Nous sommes un atelier qui fabrique des produits et veut suivre ses ventes.',
        ])->assertCreated();
        $draftId = $draftResponse->json('draftId');

        $payload = [
            'name' => 'Atelier Intelligent',
            'manager' => 'Responsable Atelier',
            'email' => 'intelligent@atelier.test',
            'password' => 'Secret2026!',
            'phone' => '+221 77 000 00 00',
            'country' => 'Sénégal',
            'sector' => 'Production',
        ];

        $first = $this->postJson('/api/onboarding/drafts/'.$draftId.'/confirm', $payload)
            ->assertOk()
            ->assertJsonPath('status', 'PENDING');
        $requestId = $first->json('requestId');

        $this->postJson('/api/onboarding/drafts/'.$draftId.'/confirm', $payload)
            ->assertOk()
            ->assertJsonPath('requestId', $requestId);

        $this->assertSame(1, Company::query()->where('email', 'intelligent@atelier.test')->count());
        $this->assertSame(1, OnboardingDraft::query()->where('request_id', $requestId)->count());
        $this->assertDatabaseHas('onboarding_drafts', [
            'id' => $draftId,
            'status' => 'CONFIRMED',
            'request_id' => $requestId,
        ]);
    }

    public function test_it_falls_back_when_the_ai_provider_is_not_configured(): void
    {
        config()->set('services.replit_ai.api_key', null);
        config()->set('services.replit_ai.base_url', null);

        $this->postJson('/api/onboarding/drafts', [
            'description' => 'Nous sommes une petite entreprise de services avec plusieurs collaborateurs.',
        ])
            ->assertStatus(503)
            ->assertJsonPath('code', 'ONBOARDING_ANALYSIS_UNAVAILABLE');

        $this->assertDatabaseCount('onboarding_drafts', 0);
    }

    public function test_it_rejects_an_invalid_ai_json_response_without_creating_a_draft(): void
    {
        Http::fake([
            '*replit-ai.test/*' => Http::response([
                'choices' => [[
                    'message' => [
                        'content' => 'Voici une proposition non structurée.',
                    ],
                ]],
            ], 200),
        ]);
        config()->set('services.replit_ai.api_key', 'test-replit-ai-key');
        config()->set('services.replit_ai.base_url', 'https://replit-ai.test/v1');

        $this->postJson('/api/onboarding/drafts', [
            'description' => 'Nous sommes une entreprise de services avec une équipe de plusieurs personnes.',
        ])
            ->assertStatus(503)
            ->assertJsonPath('code', 'ONBOARDING_ANALYSIS_UNAVAILABLE');

        $this->assertDatabaseCount('onboarding_drafts', 0);
    }

    public function test_it_explains_when_replit_ai_has_no_available_credit(): void
    {
        Http::fake([
            '*replit-ai.test/*' => Http::response([
                'error' => [
                    'message' => 'Your credit balance is too low for the Replit AI integration.',
                ],
            ], 400),
        ]);
        config()->set('services.replit_ai.api_key', 'test-replit-ai-key');
        config()->set('services.replit_ai.base_url', 'https://replit-ai.test/v1');

        $this->postJson('/api/onboarding/drafts', [
            'description' => 'Nous sommes une entreprise de services avec une équipe de plusieurs personnes.',
        ])
            ->assertStatus(503)
            ->assertJsonPath('code', 'ONBOARDING_ANALYSIS_CREDITS_EXHAUSTED')
            ->assertJsonPath('error', 'Le service IA Replit n’a plus de crédit. Vous pouvez continuer avec la configuration manuelle.');
    }
}