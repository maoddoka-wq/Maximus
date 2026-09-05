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

    public function test_company_admin_cannot_change_module_access(): void
    {
        $this->asCompanyAdmin()
            ->patchJson('/api/modules/stocks/access', ['status' => 'INACTIF'])
            ->assertForbidden();
    }

    public function test_maximus_can_add_a_feature_to_an_existing_module(): void
    {
        $this->asMaximusAdmin()
            ->postJson('/api/modules/stocks/features', [
                'key' => 'exports-avances',
                'label' => 'Exports avancés',
                'description' => 'Exports filtrés pour les équipes métier.',
                'actions' => ['voir', 'exporter'],
            ])
            ->assertCreated()
            ->assertJsonPath('moduleId', 'stocks')
            ->assertJsonPath('feature.key', 'exports-avances')
            ->assertJsonPath('feature.label', 'Exports avancés');

        $this->assertDatabaseHas('maximus_module_features', [
            'module_id' => 'stocks',
            'feature_key' => 'exports-avances',
            'label' => 'Exports avancés',
        ]);
        $this->assertDatabaseHas('maximus_module_catalog_audits', [
            'action' => 'FEATURE_CREATED',
            'module_id' => 'stocks',
            'feature_id' => 'module-feature-stocks-exports-avances',
            'actor_name' => 'Administration MAXIMUS',
        ]);
    }

    public function test_feature_key_is_unique_inside_a_module(): void
    {
        $this->asMaximusAdmin()
            ->postJson('/api/modules/stocks/features', [
                'key' => 'articles',
                'label' => 'Articles bis',
                'actions' => ['voir'],
            ])
            ->assertUnprocessable()
            ->assertJsonPath('error', 'Cet identifiant existe déjà dans ce module.');
    }

    public function test_company_admin_cannot_add_a_global_module_feature(): void
    {
        $this->asCompanyAdmin()
            ->postJson('/api/modules/stocks/features', [
                'key' => 'exports-entreprise',
                'label' => 'Exports entreprise',
                'actions' => ['voir'],
            ])
            ->assertForbidden();
    }

    private function asMaximusAdmin(): self
    {
        $user = AuthUser::query()->create([
            'id' => 'feature-maximus-admin',
            'email' => 'feature-admin@maximus.demo',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Administration MAXIMUS',
            'role' => 'maximus_admin',
            'company_id' => null,
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);

        return $this->withCredentials()->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user));
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