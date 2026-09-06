<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Support\MaximusAuth;
use App\Support\ModuleCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AppStateRecoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_bootstrap_recovers_company_and_employee_modules_when_state_is_missing(): void
    {
        ModuleCatalog::ensureCompanyAccess('recovery-company', ['stocks']);
        $user = AuthUser::query()->create([
            'id' => 'recovery-employee',
            'email' => 'recovery.employee@example.test',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Employé Récupéré',
            'role' => 'employee',
            'company_id' => 'recovery-company',
            'employee_id' => 'recovery-employee',
            'sector_ids' => ['recovery-unit'],
            'permissions' => [
                'stocks' => ['voir'],
                'stocks:products' => ['voir'],
            ],
            'status' => 'ACTIF',
        ]);

        $request = $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user))
        ;
        $bootstrap = $request
            ->getJson('/api/app-state/bootstrap')
            ->assertOk()
            ->assertJsonPath('version', 1)
            ->assertJsonPath('data.companies.0.id', 'recovery-company')
            ->assertJsonPath('data.companies.0.allowedModules.0', 'stocks')
            ->assertJsonPath('data.employees.0.id', 'recovery-employee')
            ->assertJsonPath('data.roles.0.modulePermissions.stocks.0', 'voir');

        $request
            ->putJson('/api/app-state', [
                'version' => $bootstrap->json('version'),
                'data' => [
                    'companies' => [[
                        'id' => 'recovery-company',
                        'name' => 'Entreprise récupérée',
                    ]],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('version', 2);

        $this->assertDatabaseHas('maximus_app_states', ['scope' => 'workspace']);
        $this->assertNotNull(DB::table('maximus_app_states')->where('scope', 'workspace')->value('payload'));
    }
}