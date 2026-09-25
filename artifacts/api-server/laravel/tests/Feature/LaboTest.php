<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Models\Company;
use App\Support\MaximusAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class LaboTest extends TestCase
{
    use RefreshDatabase;

    private const MODULE = 'stocks';
    private const FEATURE = 'labo-dossiers';
    private const NATIVE_FEATURE = 'labo-stock-references';
    private const NATIVE_PRODUCTS_FEATURE = 'labo-stock-products';

    protected function setUp(): void
    {
        parent::setUp();

        $this->makeCompany('kora');
        $this->publishFeature();
        DB::table('maximus_company_modules')
            ->where('company_id', 'kora')
            ->where('module_id', self::MODULE)
            ->update([
                'status' => 'ACTIF',
                'feature_ids' => json_encode([self::FEATURE]),
                'configuration' => json_encode(['featureScope' => 'explicit']),
            ]);
    }

    public function test_only_published_catalog_defines_a_labo_feature(): void
    {
        $this->asActor()->getJson($this->endpoint('bootstrap'))
            ->assertOk()
            ->assertJsonPath('definition.label', 'Dossiers publiés')
            ->assertJsonMissing(['label' => 'Dossiers en brouillon']);
    }

    public function test_records_are_scoped_to_the_authenticated_company(): void
    {
        $create = $this->asActor()->postJson($this->endpoint('records'), [
            'data' => ['title' => 'KORA uniquement'],
        ])->assertCreated();

        $this->makeCompany('other-company');
        DB::table('maximus_company_modules')->insert([
            'id' => 'other-stocks',
            'company_id' => 'other-company',
            'module_id' => self::MODULE,
            'status' => 'ACTIF',
            'feature_ids' => json_encode([self::FEATURE]),
            'configuration' => json_encode(['featureScope' => 'explicit']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->asActor('company_admin', [], 'other-company')
            ->getJson($this->endpoint('bootstrap'))
            ->assertOk()
            ->assertJsonPath('count', 0)
            ->assertJsonMissing(['title' => 'KORA uniquement']);

        $this->assertNotNull($create->json('record.id'));
    }

    public function test_one_catalog_feature_has_independent_records_in_each_module(): void
    {
        $workspace = DB::table('maximus_app_states')->where('scope', 'workspace')->first();
        $payload = json_decode((string) $workspace->payload, true);
        $payload['moduleOverrides']['commerce'] = [
            'features' => [self::FEATURE],
            'laboFeatureIds' => [self::FEATURE],
        ];
        DB::table('maximus_app_states')->where('scope', 'workspace')->update([
            'payload' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            'updated_at' => now(),
        ]);

        $commerceAccess = DB::table('maximus_company_modules')
            ->where('company_id', 'kora')
            ->where('module_id', 'commerce')
            ->first();
        $commerceValues = [
            'status' => 'ACTIF',
            'feature_ids' => json_encode([self::FEATURE]),
            'configuration' => json_encode(['featureScope' => 'explicit']),
            'updated_at' => now(),
        ];
        if ($commerceAccess) {
            DB::table('maximus_company_modules')
                ->where('company_id', 'kora')
                ->where('module_id', 'commerce')
                ->update($commerceValues);
        } else {
            DB::table('maximus_company_modules')->insert([
                'id' => 'kora-commerce-labo',
                'company_id' => 'kora',
                'module_id' => 'commerce',
                ...$commerceValues,
                'created_at' => now(),
            ]);
        }

        $this->asActor()->postJson($this->endpoint('records'), [
            'data' => ['title' => 'Dossier stock'],
        ])->assertCreated();

        $commerceEndpoint = '/api/labo/modules/commerce/features/'.self::FEATURE;
        $this->asActor()->getJson($commerceEndpoint.'/bootstrap')
            ->assertOk()
            ->assertJsonPath('count', 0);

        $this->asActor()->postJson($commerceEndpoint.'/records', [
            'data' => ['title' => 'Dossier commerce'],
        ])->assertCreated();

        $this->asActor()->getJson($this->endpoint('bootstrap'))
            ->assertOk()
            ->assertJsonPath('count', 1)
            ->assertJsonPath('records.0.data.title', 'Dossier stock');
        $this->asActor()->getJson($commerceEndpoint.'/bootstrap')
            ->assertOk()
            ->assertJsonPath('count', 1)
            ->assertJsonPath('records.0.data.title', 'Dossier commerce');
    }

    public function test_field_validation_rejects_required_select_and_wrong_type_values(): void
    {
        foreach ([
            ['data' => ['title' => '']],
            ['data' => ['title' => 'ok', 'kind' => 'unknown']],
            ['data' => ['title' => 'ok', 'amount' => 'not-a-number']],
            ['data' => ['title' => 'ok', 'unexpected' => 'value']],
        ] as $payload) {
            $this->asActor()->postJson($this->endpoint('records'), $payload)
                ->assertStatus(422);
        }
    }

    public function test_workflow_moves_one_stage_and_checks_next_stage_fields(): void
    {
        $record = $this->asActor()->postJson($this->endpoint('records'), [
            'data' => ['title' => 'Workflow'],
        ])->assertCreated()->json('record');

        $this->asActor()->postJson($this->endpoint("records/{$record['id']}/transition"), [
            'targetStageId' => 'closed',
            'version' => $record['version'],
        ])->assertStatus(422);

        $this->asActor()->postJson($this->endpoint("records/{$record['id']}/transition"), [
            'targetStageId' => 'review',
            'version' => $record['version'],
        ])->assertStatus(422);

        $record = $this->asActor()->patchJson($this->endpoint("records/{$record['id']}"), [
            'data' => ['title' => 'Workflow', 'kind' => 'A'],
            'version' => $record['version'],
        ])->assertOk()->json('record');

        $updated = $this->asActor()->postJson($this->endpoint("records/{$record['id']}/transition"), [
            'targetStageId' => 'review',
            'version' => $record['version'],
        ])->assertOk()->json('record');

        $this->assertSame('review', $updated['status']);
        $this->asActor()->postJson($this->endpoint("records/{$record['id']}/transition"), [
            'targetStageId' => 'closed',
            'version' => $updated['version'],
        ])->assertStatus(422);
    }

    public function test_invalid_current_stage_cannot_skip_a_workflow_stage(): void
    {
        $record = $this->asActor()->postJson($this->endpoint('records'), [
            'data' => ['title' => 'Workflow', 'kind' => 'A'],
        ])->assertCreated()->json('record');

        DB::table('labo_records')->where('id', $record['id'])->update(['status' => 'legacy']);

        $this->asActor()->postJson($this->endpoint("records/{$record['id']}/transition"), [
            'targetStageId' => 'review',
            'version' => $record['version'],
        ])->assertStatus(422);
    }

    public function test_stale_versions_return_conflict(): void
    {
        $record = $this->asActor()->postJson($this->endpoint('records'), [
            'data' => ['title' => 'Versionnée'],
        ])->assertCreated()->json('record');

        $this->asActor()->patchJson($this->endpoint("records/{$record['id']}"), [
            'data' => ['title' => 'Première modification'],
            'version' => $record['version'],
        ])->assertOk();

        $this->asActor()->patchJson($this->endpoint("records/{$record['id']}"), [
            'data' => ['title' => 'Ancienne version'],
            'version' => $record['version'],
        ])->assertStatus(409);
    }

    public function test_reused_features_and_unselected_features_cannot_write_records(): void
    {
        $this->publishFeature([
            'id' => 'labo-reuse',
            'label' => 'Réutilisée',
            'description' => '',
            'kind' => 'reuse',
            'sourceModuleId' => 'stocks',
            'sourceFeatureId' => 'products',
        ]);
        DB::table('maximus_company_modules')
            ->where('company_id', 'kora')
            ->where('module_id', self::MODULE)
            ->update(['feature_ids' => json_encode(['labo-reuse'])]);

        $this->asActor()->postJson('/api/labo/modules/stocks/features/labo-reuse/records', [
            'data' => [],
        ])->assertStatus(422);
    }

    public function test_module_and_feature_access_are_enforced(): void
    {
        DB::table('maximus_company_modules')
            ->where('company_id', 'kora')
            ->where('module_id', self::MODULE)
            ->update(['feature_ids' => json_encode([])]);

        $this->asActor()->getJson($this->endpoint('bootstrap'))->assertForbidden();
    }

    public function test_native_stock_mount_is_empty_and_isolated_from_source_references(): void
    {
        $this->publishStockReferencesMount();
        $source = $this->asActor();
        $source->postJson('/api/stock/suppliers', ['companyId' => 'kora', 'name' => 'Source'])->assertCreated();
        $mount = '/api/labo/modules/commerce/features/'.self::NATIVE_FEATURE.'/native/stock/references';
        $this->asActor()->getJson($mount.'/bootstrap')->assertOk()->assertJsonCount(0, 'suppliers')->assertJsonCount(0, 'warehouses')->assertJsonCount(0, 'locations');
        $this->asActor()->postJson($mount.'/suppliers', ['companyId' => 'another-company', 'name' => 'Target'])->assertForbidden();
        $this->asActor()->postJson($mount.'/suppliers', ['name' => 'Target'])->assertCreated();
        $source->getJson('/api/stock/bootstrap?scope=core')->assertJsonPath('suppliers.0.name', 'Source')->assertJsonMissing(['name' => 'Target']);
    }

    public function test_native_stock_mount_crud_is_target_scoped_and_locations_require_target_warehouse(): void
    {
        $this->publishStockReferencesMount();
        $mount = '/api/labo/modules/commerce/features/'.self::NATIVE_FEATURE.'/native/stock/references';
        $request = $this->asActor();
        $warehouse = $request->postJson($mount.'/warehouses', ['name' => 'Cible'])->assertCreated();
        $supplier = $request->postJson($mount.'/suppliers', ['name' => 'Fournisseur cible'])->assertCreated();
        $location = $request->postJson($mount.'/warehouses/'.$warehouse->json('id').'/locations', ['name' => 'Rayon A'])->assertCreated();
        $request->patchJson($mount.'/suppliers/'.$supplier->json('id'), ['name' => 'Fournisseur modifié'])->assertOk();
        $request->deleteJson($mount.'/warehouses/'.$warehouse->json('id'))->assertOk();
        $request->deleteJson($mount.'/locations/'.$location->json('id'))->assertOk();
        $sourceWarehouse = $request->postJson('/api/stock/warehouses', ['name' => 'Source warehouse'])->assertCreated();
        $request->postJson($mount.'/warehouses/'.$sourceWarehouse->json('id').'/locations', ['name' => 'Cross scope'])->assertNotFound();
        $request->getJson('/api/stock/bootstrap?scope=core')->assertJsonMissing(['name' => 'Fournisseur cible']);
    }

    public function test_native_stock_mount_does_not_require_source_module_and_rejects_bad_bindings_and_permissions(): void
    {
        $this->publishStockReferencesMount();
        DB::table('maximus_company_modules')->where('company_id', 'kora')->where('module_id', 'stocks')->update(['status' => 'INACTIF']);
        $mount = '/api/labo/modules/commerce/features/'.self::NATIVE_FEATURE.'/native/stock/references';
        $this->asActor()->getJson($mount.'/bootstrap')->assertOk();
        $this->asActor()->getJson('/api/labo/modules/commerce/features/not-published/native/stock/references/bootstrap')->assertForbidden();
        $workspace = DB::table('maximus_app_states')->where('scope', 'workspace')->first();
        $payload = json_decode((string) $workspace->payload, true);
        $payload['laboFeatureCatalog'][] = ['id' => 'wrong-native', 'label' => 'Mauvais montage', 'description' => '', 'kind' => 'reuse', 'sourceModuleId' => 'commerce', 'sourceFeatureId' => 'references'];
        $payload['moduleOverrides']['commerce']['laboFeatureIds'][] = 'wrong-native';
        DB::table('maximus_app_states')->where('scope', 'workspace')->update(['payload' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)]);
        DB::table('maximus_company_modules')->where('company_id', 'kora')->where('module_id', 'commerce')->update(['feature_ids' => json_encode(['wrong-native', self::NATIVE_FEATURE])]);
        $this->asActor()->getJson('/api/labo/modules/commerce/features/wrong-native/native/stock/references/bootstrap')->assertForbidden();
        $this->asActor('employee', ['commerce:menu:'.self::NATIVE_FEATURE => ['voir']])->getJson($mount.'/bootstrap')->assertOk();
        $this->asActor('employee', ['commerce:menu:other-feature' => ['voir']])->getJson($mount.'/bootstrap')->assertForbidden();
        $this->makeCompany('other-company');
        $this->asActor('company_admin', [], 'other-company')->getJson($mount.'/bootstrap')->assertForbidden();
    }

    public function test_published_mount_is_an_entitlement_of_its_active_target_module(): void
    {
        $this->publishStockReferencesMount();
        DB::table('maximus_company_modules')
            ->where('company_id', 'kora')
            ->where('module_id', 'commerce')
            ->update([
                'feature_ids' => json_encode([]),
                'configuration' => json_encode(['featureScope' => 'explicit']),
            ]);

        $mount = '/api/labo/modules/commerce/features/'.self::NATIVE_FEATURE.'/native/stock/references';
        $this->asActor()->getJson($mount.'/bootstrap')->assertOk();
    }

    public function test_native_stock_products_are_empty_and_isolated_from_source_crud(): void
    {
        $this->publishStockProductsMount();
        $source = $this->asActor();
        $source->postJson('/api/stock/products', ['name' => 'Source', 'sku' => 'SRC-1'])->assertCreated();
        $mount = '/api/labo/modules/commerce/features/'.self::NATIVE_PRODUCTS_FEATURE.'/native/stock';
        $this->asActor()->getJson($mount.'/bootstrap')->assertOk()
            ->assertJsonCount(0, 'products')->assertJsonCount(0, 'warehouses')->assertJsonCount(0, 'movements');
        $created = $this->asActor()->postJson($mount.'/products', ['name' => 'Cible', 'sku' => 'DST-1'])->assertCreated();
        $this->assertSame('Cible', $created->json('name'));
        $this->asActor()->getJson('/api/stock/bootstrap?scope=core')->assertJsonMissing(['name' => 'Cible']);
    }

    public function test_native_stock_products_support_target_scoped_crud_archive_and_permissions(): void
    {
        $this->publishStockProductsMount();
        $mount = '/api/labo/modules/commerce/features/'.self::NATIVE_PRODUCTS_FEATURE.'/native/stock';
        $request = $this->asActor();
        $product = $request->postJson($mount.'/products', ['name' => 'Produit', 'sku' => 'P-1', 'salePrice' => 20])->assertCreated()->json();
        $request->patchJson($mount.'/products/'.$product['id'], ['name' => 'Produit modifié'])->assertOk()->assertJsonPath('name', 'Produit modifié');
        $request->deleteJson($mount.'/products/'.$product['id'])->assertOk()->assertJsonPath('archived', true);
        $this->asActor('employee', ['commerce:menu:'.self::NATIVE_PRODUCTS_FEATURE => ['voir']])
            ->postJson($mount.'/products', ['name' => 'Interdit', 'sku' => 'P-2'])->assertForbidden();
        $this->asActor()->postJson($mount.'/products', ['name' => 'Mauvais', 'sku' => 'P-3', 'supplierId' => 'stock-source-id'])->assertNotFound();
    }

    public function test_native_stock_products_use_only_the_separate_target_references_mount(): void
    {
        $this->publishStockReferencesMount();
        $this->publishStockProductsMount();
        $references = '/api/labo/modules/commerce/features/'.self::NATIVE_FEATURE.'/native/stock/references';
        $products = '/api/labo/modules/commerce/features/'.self::NATIVE_PRODUCTS_FEATURE.'/native/stock';
        $supplier = $this->asActor()->postJson($references.'/suppliers', ['name' => 'Fournisseur cible'])->assertCreated()->json();
        $this->asActor()->getJson($products.'/bootstrap')->assertOk()
            ->assertJsonPath('suppliers.0.id', $supplier['id']);
        $this->asActor()->postJson($products.'/products', [
            'name' => 'Produit lié', 'sku' => 'P-LINK', 'supplierId' => $supplier['id'],
        ])->assertCreated();
        DB::table('labo_stock_suppliers')->insert([
            'id' => 'supplier-other-scope',
            'company_id' => 'kora',
            'target_module_id' => 'commerce',
            'target_feature_id' => 'other-references',
            'name' => 'Autre',
            'contact_name' => '',
            'email' => '',
            'phone' => '',
            'address' => '',
            'notes' => '',
            'archived' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->asActor()->postJson($products.'/products', [
            'name' => 'Produit hors scope', 'sku' => 'P-CROSS', 'supplierId' => 'supplier-other-scope',
        ])->assertNotFound();
    }

    public function test_native_stock_products_archive_uses_modify_permission(): void
    {
        $this->publishStockProductsMount();
        $mount = '/api/labo/modules/commerce/features/'.self::NATIVE_PRODUCTS_FEATURE.'/native/stock';
        $product = $this->asActor()->postJson($mount.'/products', ['name' => 'Produit', 'sku' => 'P-MOD'])->assertCreated()->json();
        $this->asActor('employee', ['commerce:menu:'.self::NATIVE_PRODUCTS_FEATURE => ['voir', 'modifier']])
            ->deleteJson($mount.'/products/'.$product['id'])->assertOk()->assertJsonPath('archived', true);
    }

    public function test_native_stock_products_reject_bad_binding_and_do_not_require_source_module(): void
    {
        $this->publishStockProductsMount();
        DB::table('maximus_company_modules')->where('company_id', 'kora')->where('module_id', 'stocks')->update(['status' => 'INACTIF']);
        $mount = '/api/labo/modules/commerce/features/'.self::NATIVE_PRODUCTS_FEATURE.'/native/stock';
        $this->asActor()->getJson($mount.'/bootstrap')->assertOk();
        $this->asActor()->getJson('/api/labo/modules/commerce/features/not-published/native/stock/bootstrap')->assertForbidden();
    }

    private function publishStockReferencesMount(): void
    {
        $this->publishFeature([
            'id' => self::NATIVE_FEATURE,
            'label' => 'Référentiels Stock réutilisés',
            'description' => 'Référentiels Stock dans un autre module',
            'kind' => 'reuse',
            'sourceModuleId' => 'stocks',
            'sourceFeatureId' => 'references',
        ]);
        $workspace = DB::table('maximus_app_states')->where('scope', 'workspace')->first();
        $payload = json_decode((string) $workspace->payload, true);
        $payload['moduleOverrides']['commerce'] = [
            'features' => [self::NATIVE_FEATURE],
            'laboFeatureIds' => [self::NATIVE_FEATURE],
        ];
        DB::table('maximus_app_states')->where('scope', 'workspace')->update([
            'payload' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            'updated_at' => now(),
        ]);
        DB::table('maximus_company_modules')->where('company_id', 'kora')->where('module_id', 'stocks')->update([
            'status' => 'ACTIF',
            'feature_ids' => json_encode(['references']),
            'configuration' => json_encode(['featureScope' => 'explicit']),
        ]);
        DB::table('maximus_company_modules')->where('company_id', 'kora')->where('module_id', 'commerce')->update([
            'status' => 'ACTIF',
            'feature_ids' => json_encode([self::NATIVE_FEATURE]),
            'configuration' => json_encode(['featureScope' => 'explicit']),
        ]);
    }

    private function publishStockProductsMount(): void
    {
        $previousWorkspace = DB::table('maximus_app_states')->where('scope', 'workspace')->first();
        $previousPayload = json_decode((string) $previousWorkspace->payload, true);
        $previousCatalog = $previousPayload['laboFeatureCatalog'] ?? [];
        $this->publishFeature([
            'id' => self::NATIVE_PRODUCTS_FEATURE,
            'label' => 'Articles Stock réutilisés',
            'description' => 'Articles Stock dans un autre module',
            'kind' => 'reuse',
            'sourceModuleId' => 'stocks',
            'sourceFeatureId' => 'products',
        ]);
        $workspace = DB::table('maximus_app_states')->where('scope', 'workspace')->first();
        $payload = json_decode((string) $workspace->payload, true);
        $previousReference = collect($previousCatalog)->firstWhere('id', self::NATIVE_FEATURE);
        if (is_array($previousReference)) {
            $payload['laboFeatureCatalog'][] = $previousReference;
        }
        $existing = array_merge(
            $previousPayload['moduleOverrides']['commerce'] ?? [],
            $payload['moduleOverrides']['commerce'] ?? [],
        );
        $featureIds = array_values(array_unique(array_merge(
            $existing['laboFeatureIds'] ?? [],
            [self::NATIVE_PRODUCTS_FEATURE],
        )));
        $payload['moduleOverrides']['commerce'] = [
            ...$existing,
            'features' => $featureIds,
            'laboFeatureIds' => $featureIds,
        ];
        DB::table('maximus_app_states')->where('scope', 'workspace')->update([
            'payload' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            'updated_at' => now(),
        ]);
        DB::table('maximus_company_modules')->where('company_id', 'kora')->where('module_id', 'commerce')->update([
            'status' => 'ACTIF',
            'feature_ids' => json_encode($featureIds),
            'configuration' => json_encode(['featureScope' => 'explicit']),
        ]);
        DB::table('maximus_company_modules')->where('company_id', 'kora')->where('module_id', 'stocks')->update([
            'status' => 'ACTIF',
            'feature_ids' => json_encode(['products', 'references']),
            'configuration' => json_encode(['featureScope' => 'explicit']),
        ]);
    }

    private function publishFeature(?array $feature = null): void
    {
        $feature ??= [
            'id' => self::FEATURE,
            'label' => 'Dossiers publiés',
            'description' => 'Fiches LABO',
            'kind' => 'records',
            'fields' => [
                ['id' => 'title', 'label' => 'Titre', 'type' => 'text', 'required' => true],
                ['id' => 'kind', 'label' => 'Type', 'type' => 'select', 'required' => false, 'options' => ['A', 'B']],
                ['id' => 'amount', 'label' => 'Montant', 'type' => 'number', 'required' => false],
            ],
            'workflow' => [
                'stages' => [
                    ['id' => 'open', 'label' => 'Ouvert', 'requiredFieldIds' => []],
                    ['id' => 'review', 'label' => 'Revue', 'requiredFieldIds' => ['kind']],
                    ['id' => 'closed', 'label' => 'Fermé', 'requiredFieldIds' => ['amount']],
                ],
            ],
        ];

        DB::table('maximus_app_states')->updateOrInsert(
            ['scope' => 'workspace'],
            [
                'company_id' => null,
                'payload' => json_encode([
                    'moduleOverrides' => [
                        self::MODULE => [
                            'features' => [$feature['id']],
                            'laboFeatureIds' => [$feature['id']],
                        ],
                    ],
                    'laboFeatureCatalog' => [$feature],
                    'catalogDraft' => [
                        'moduleOverrides' => [
                            self::MODULE => ['laboFeatureIds' => [$feature['id']]],
                        ],
                        'laboFeatureCatalog' => [[...$feature, 'label' => 'Dossiers en brouillon']],
                    ],
                    'customModules' => [],
                    'updatedAt' => now()->toISOString(),
                ]),
                'version' => 1,
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );
    }

    private function endpoint(string $suffix): string
    {
        return '/api/labo/modules/'.self::MODULE.'/features/'.self::FEATURE.'/'.$suffix;
    }

    private function makeCompany(string $id): void
    {
        Company::query()->updateOrCreate(
            ['id' => $id],
            [
                'name' => strtoupper($id),
                'manager' => 'Responsable',
                'email' => $id.'@demo.test',
                'status' => 'ACTIF',
                'requested_modules' => [self::MODULE],
            ],
        );
    }

    private function asActor(string $role = 'company_admin', array $permissions = [], string $companyId = 'kora'): self
    {
        $user = AuthUser::query()->create([
            'id' => 'labo-'.str_replace('-', '', $companyId).'-'.uniqid(),
            'email' => uniqid('labo-', true).'@demo.test',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Administrateur LABO',
            'role' => $role,
            'company_id' => $companyId,
            'sector_ids' => [],
            'permissions' => $permissions,
            'status' => 'ACTIF',
        ]);

        return $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user));
    }
}