<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Support\MaximusAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SystemHealthTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_health_endpoint_reports_application_and_database_status(): void
    {
        $this->getJson('/api/healthz')
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('database', true)
            ->assertJsonPath('status', 'OPERATIONAL');
    }

    public function test_only_maximus_administration_can_read_system_health(): void
    {
        $this->asActor('company_admin')
            ->getJson('/api/control/health')
            ->assertForbidden();

        $this->asActor('maximus_admin')
            ->getJson('/api/control/health')
            ->assertOk()
            ->assertJsonPath('status', 'OPERATIONAL')
            ->assertJsonPath('checks.0.key', 'application');
    }

    private function asActor(string $role): self
    {
        $user = AuthUser::query()->create([
            'id' => 'health-'.strtolower($role),
            'email' => 'health-'.strtolower($role).'@maximus.test',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Administrateur santé',
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