<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Support\MaximusAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ModuleAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_disabled_module_denies_operational_route_even_when_client_requests_it(): void
    {
        DB::table('maximus_company_modules')
            ->where('company_id', 'kora')
            ->where('module_id', 'stocks')
            ->update(['status' => 'INACTIF']);

        $this->asCompanyAdmin()
            ->getJson('/api/stock/bootstrap?companyId=kora')
            ->assertForbidden()
            ->assertJsonPath('moduleId', 'stocks');
    }

    public function test_maintenance_module_returns_a_specific_unavailable_response(): void
    {
        DB::table('maximus_company_modules')
            ->where('company_id', 'kora')
            ->where('module_id', 'stocks')
            ->update(['status' => 'MAINTENANCE']);

        $this->asCompanyAdmin()
            ->getJson('/api/stock/bootstrap?companyId=kora')
            ->assertStatus(503)
            ->assertJsonPath('code', 'MODULE_MAINTENANCE')
            ->assertJsonPath('moduleId', 'stocks')
            ->assertJsonPath('status', 'MAINTENANCE');
    }

    public function test_maximus_can_activate_a_module_for_a_selected_company(): void
    {
        $maximusAdmin = AuthUser::query()->create([
            'id' => 'module-maximus-admin',
            'email' => 'module-admin@maximus.demo',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Administration MAXIMUS',
            'role' => 'maximus_admin',
            'company_id' => null,
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);

        $this->withCredentials()->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($maximusAdmin))
            ->patchJson('/api/modules/stocks/access?companyId=acme', ['status' => 'ACTIF'])
            ->assertOk()
            ->assertJsonPath('companyId', 'acme')
            ->assertJsonPath('module.status', 'ACTIF');

        $this->assertDatabaseHas('maximus_company_modules', [
            'company_id' => 'acme',
            'module_id' => 'stocks',
            'status' => 'ACTIF',
        ]);
    }

    public function test_maximus_can_put_a_module_in_maintenance_for_a_selected_company(): void
    {
        $maximusAdmin = AuthUser::query()->create([
            'id' => 'maintenance-maximus-admin',
            'email' => 'maintenance-admin@maximus.demo',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Administration MAXIMUS',
            'role' => 'maximus_admin',
            'company_id' => null,
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);

        $this->withCredentials()->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($maximusAdmin))
            ->patchJson('/api/modules/stocks/access?companyId=acme', ['status' => 'MAINTENANCE'])
            ->assertOk()
            ->assertJsonPath('companyId', 'acme')
            ->assertJsonPath('module.status', 'MAINTENANCE');

        $this->assertDatabaseHas('maximus_company_modules', [
            'company_id' => 'acme',
            'module_id' => 'stocks',
            'status' => 'MAINTENANCE',
        ]);
    }

    public function test_company_admin_cannot_change_module_access(): void
    {
        $this->asCompanyAdmin()
            ->patchJson('/api/modules/stocks/access', ['status' => 'INACTIF'])
            ->assertForbidden();
    }

    private function asCompanyAdmin(): self
    {
        $user = AuthUser::query()->create([
            'id' => 'module-company-admin',
            'email' => 'module-admin@kora.demo',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Administrateur KORA',
            'role' => 'company_admin',
            'company_id' => 'kora',
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);

        return $this->withCredentials()->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user));
    }
}