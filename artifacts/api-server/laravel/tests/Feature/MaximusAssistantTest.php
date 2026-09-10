<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Support\MaximusAuth;
use App\Support\MaximusPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MaximusAssistantTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_the_main_maximus_admin_can_use_the_claude_assistant(): void
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

    public function test_main_maximus_admin_receives_a_claude_answer_from_server_context(): void
    {
        config()->set('services.anthropic.key', 'test-anthropic-key');
        config()->set('services.anthropic.model', 'claude-sonnet-4-5');
        Http::fake([
            'https://api.anthropic.com/v1/messages' => Http::response([
                'content' => [
                    ['type' => 'text', 'text' => 'Le catalogue contient plusieurs modules configurables.'],
                ],
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
            ->assertJsonPath('provider', 'anthropic')
            ->assertJsonPath('model', 'claude-sonnet-4-5');

        Http::assertSent(function ($request): bool {
            return $request->url() === 'https://api.anthropic.com/v1/messages'
                && $request->header('x-api-key')[0] === 'test-anthropic-key'
                && $request['messages'][0]['content'] === 'Quels modules sont disponibles ?'
                && str_contains($request['system'], 'administration principale');
        });
    }

    public function test_it_explains_when_anthropic_has_no_available_credit(): void
    {
        config()->set('services.anthropic.key', 'test-anthropic-key');
        Http::fake([
            'https://api.anthropic.com/v1/messages' => Http::response([
                'type' => 'error',
                'error' => [
                    'type' => 'invalid_request_error',
                    'message' => 'Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.',
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
                'question' => 'Vérifier la disponibilité de Claude',
            ])
            ->assertStatus(503)
            ->assertJsonPath(
                'error',
                'Le compte Anthropic n’a plus de crédit disponible. Ajoutez des crédits dans Plans & Billing, puis réessayez.'
            );
    }
}