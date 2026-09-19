<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Models\Company;
use App\Support\MaximusAuth;
use App\Support\ModuleCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CatalogSelectionRegressionTest extends TestCase
{
    use RefreshDatabase;

    private function publish(array $features, array $packs): void
    {
        DB::table('maximus_app_states')->updateOrInsert(['scope' => 'workspace'], [
            'payload' => json_encode(['customModules' => [[
                'id' => 'atelier', 'name' => 'Atelier', 'features' => $features, 'featurePacks' => $packs,
            ]]], JSON_THROW_ON_ERROR),
            'version' => 1, 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function test_all_builtin_packs_resolve_against_canonical_features(): void
    {
        foreach (ModuleCatalog::definitions() as $module) {
            foreach ($module['feature_packs'] ?? [] as $pack) {
                $selection = ModuleCatalog::normalizeSelection($module['id'], [], ['packIds' => [$pack['id']]]);
                $this->assertNotEmpty($selection['featureIds'], $pack['id']);
            }
        }
    }

    public function test_accented_published_pack_and_permission_aliases_are_canonicalized(): void
    {
        $this->publish(['Échéances'], [['id' => 'atelier-suivi', 'featureIds' => ['echeances']]]);
        $selection = ModuleCatalog::normalizeSelection('atelier', ['échéances'], [
            'packIds' => ['atelier-suivi'], 'featurePermissions' => ['echeances' => ['voir']],
        ]);
        $this->assertSame(['échéances'], $selection['featureIds']);
        $this->assertSame(['échéances' => ['voir']], $selection['configuration']['featurePermissions']);
    }

    public function test_a_stale_pack_cannot_define_a_nonexistent_feature(): void
    {
        $this->publish(['Échéances'], [['id' => 'atelier-stale', 'featureIds' => ['deleted-feature']]]);
        $this->expectException(\InvalidArgumentException::class);
        ModuleCatalog::normalizeSelection('atelier', [], ['packIds' => ['atelier-stale']]);
    }

    public function test_explicit_empty_selection_is_not_replaced_by_the_entire_pack(): void
    {
        $selection = ModuleCatalog::normalizeSelection('commerce', [], [
            'packIds' => ['commerce-gestion'], 'featureScope' => 'explicit',
        ]);
        $this->assertSame([], $selection['featureIds']);
        $this->assertSame([], ModuleCatalog::normalizeSelection('commerce')['featureIds']);
    }

    public function test_registration_rejects_missing_pack_and_features_without_persisting(): void
    {
        $payload = [
            'name' => 'Invalid selection', 'manager' => 'Responsable', 'email' => 'invalid@example.test',
            'password' => 'Secret2026!', 'requestedModules' => ['commerce'],
        ];
        $this->postJson('/api/company-requests', [
            ...$payload, 'requestedModulePackIds' => ['commerce' => ['deleted-pack']],
        ])->assertStatus(422);
        $this->postJson('/api/company-requests', [
            ...$payload, 'requestedModuleFeatures' => ['commerce' => ['not-real']],
        ])->assertStatus(422);
        $this->assertDatabaseMissing('companies', ['email' => 'invalid@example.test']);
    }

    public function test_packless_create_then_edit_persists_explicit_canonical_features(): void
    {
        $this->postJson('/api/company-requests', [
            'name' => 'Catalogue regression', 'manager' => 'Responsable',
            'email' => 'catalog-regression@example.test', 'password' => 'Secret2026!',
            'requestedModules' => ['commerce'],
            'requestedModulePackIds' => ['commerce' => []],
            'requestedModuleFeatures' => ['commerce' => ['settings']],
            'requestedModulePermissions' => ['commerce' => ['settings' => ['voir']]],
        ])->assertCreated();
        $company = Company::where('email', 'catalog-regression@example.test')->firstOrFail();
        $this->assertSame(['settings'], $company->requested_module_features['commerce']);
        $admin = AuthUser::create([
            'id' => 'catalog-admin', 'email' => 'catalog-admin@example.test', 'password_hash' => 'unused',
            'display_name' => 'MAXIMUS', 'role' => 'maximus_admin', 'sector_ids' => [], 'status' => 'ACTIF',
        ]);
        $this->withCredentials()->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($admin));
        $this->postJson('/api/company-requests/'.$company->id.'/approve')->assertOk();
        $this->patchJson('/api/modules/commerce/access?companyId='.$company->id, [
            'status' => 'ACTIF', 'featureIds' => ['team'],
            'configuration' => ['packIds' => [], 'featurePermissions' => ['team' => ['voir']]],
        ])->assertOk();
        $row = DB::table('maximus_company_modules')->where('company_id', $company->id)->where('module_id', 'commerce')->first();
        $this->assertSame(['team'], json_decode($row->feature_ids, true));
        $this->assertSame('explicit', json_decode($row->configuration, true)['featureScope']);
        $this->assertFalse(ModuleCatalog::allowsFeature($company->id, 'commerce', 'sales'));
        $this->patchJson('/api/modules/commerce/access?companyId='.$company->id, [
            'status' => 'ACTIF', 'featureIds' => ['arbitrary-feature'], 'configuration' => ['packIds' => []],
        ])->assertStatus(422);
        $this->patchJson('/api/modules/commerce/access?companyId='.$company->id, [
            'status' => 'ACTIF', 'featureIds' => [], 'configuration' => ['packIds' => ['deleted-pack']],
        ])->assertStatus(422);
        $this->assertSame(['team'], json_decode(DB::table('maximus_company_modules')->where('company_id', $company->id)->where('module_id', 'commerce')->value('feature_ids'), true));
        $this->patchJson('/api/modules/commerce/access?companyId='.$company->id, [
            'status' => 'ACTIF', 'featureIds' => ['Tableau de bord', 'Clients'],
            'configuration' => ['packIds' => ['commerce-consultation'], 'featurePermissions' => ['Tableau de bord' => ['voir']]],
        ])->assertOk();
        $this->assertSame(['dashboard', 'clients'], json_decode(DB::table('maximus_company_modules')->where('company_id', $company->id)->where('module_id', 'commerce')->value('feature_ids'), true));
        $this->patchJson('/api/modules/commerce/access?companyId='.$company->id, [
            'status' => 'ACTIF', 'featureIds' => [],
            'configuration' => ['packIds' => ['commerce-consultation'], 'featureScope' => 'explicit'],
        ])->assertOk();
        $this->assertFalse(ModuleCatalog::allowsFeature($company->id, 'commerce', 'dashboard'));
    }
}