<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Support\MaximusAuth;
use App\Support\ModuleCatalog;
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

    public function test_presence_catalog_matches_the_current_eight_feature_contract(): void
    {
        $presence = collect(ModuleCatalog::definitions())->firstWhere('id', 'presences');

        $this->assertNotNull($presence);
        $this->assertSame(
            ['Tableau de bord', 'Pointage', 'Présences', 'Absences', 'Horaires', 'Congés', 'Historique', 'Rapports'],
            $presence['features'],
        );
        $this->assertSame(
            [
                'présences' => ['pointage'],
                'rapports' => ['pointage', 'présences'],
            ],
            $presence['feature_dependencies'],
        );
    }

    public function test_module_bootstrap_exposes_descriptions_for_modules_and_packs(): void
    {
        $response = $this->asCompanyAdmin()
            ->getJson('/api/modules/bootstrap?companyId=kora')
            ->assertOk();

        $response
            ->assertJsonPath('modules.0.description', 'Piloter les ventes, les clients, les achats et la performance commerciale.')
            ->assertJsonPath('modules.0.featurePacks.0.description', 'Consulter les clients et le suivi commercial.')
            ->assertJsonPath('modules.1.featurePacks.0.description', 'Publier une boutique et présenter vos produits.')
            ->assertJsonPath('modules.4.id', 'paie')
            ->assertJsonCount(7, 'modules.4.features')
            ->assertJsonCount(3, 'modules.4.featurePacks')
            ->assertJsonPath('modules.4.featurePacks.1.featurePermissions.préparer-une-paie.1', 'créer')
            ->assertJsonPath('modules.4.featurePacks.2.featurePermissions.virements.1', 'modifier');
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
