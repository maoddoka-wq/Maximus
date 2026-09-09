<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Support\MaximusAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DiagnosticTokenTest extends TestCase
{
    use RefreshDatabase;

    public function test_maximus_admin_can_issue_and_use_a_read_only_diagnostic_token(): void
    {
        $response = $this->asActor('maximus_admin')
            ->postJson('/api/platform-settings/diagnostic-tokens', [
                'label' => 'Support production',
                'expiresInHours' => 24,
            ])
            ->assertCreated()
            ->assertJsonStructure(['id', 'token', 'tokenPrefix', 'scope', 'expiresAt']);

        $token = $response->json('token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/diagnostics/health')
            ->assertOk()
            ->assertJsonPath('status', 'OPERATIONAL');
    }

    public function test_company_admin_cannot_issue_a_diagnostic_token(): void
    {
        $this->asActor('company_admin')
            ->postJson('/api/platform-settings/diagnostic-tokens', [
                'label' => 'Accès interdit',
                'expiresInHours' => 24,
            ])
            ->assertForbidden();
    }

    public function test_revoking_a_diagnostic_token_blocks_it_immediately(): void
    {
        $response = $this->asActor('maximus_admin')
            ->postJson('/api/platform-settings/diagnostic-tokens', [
                'label' => 'Accès temporaire',
                'expiresInHours' => 1,
            ])
            ->assertCreated();

        $token = $response->json('token');
        $id = $response->json('id');

        $this->deleteJson("/api/platform-settings/diagnostic-tokens/{$id}")
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/diagnostics/health')
            ->assertUnauthorized();
    }

    private function asActor(string $role): self
    {
        $user = AuthUser::query()->create([
            'id' => 'diagnostic-'.strtolower($role).'-'.uniqid(),
            'email' => 'diagnostic-'.strtolower($role).'-'.uniqid().'@maximus.test',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Administrateur diagnostic',
            'role' => $role,
            'company_id' => $role === 'maximus_admin' ? null : 'kora',
            'employee_id' => null,
            'sector_ids' => [],
            'permissions' => [],
            'status' => 'ACTIF',
        ]);

        return $this
            ->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user));
    }
}