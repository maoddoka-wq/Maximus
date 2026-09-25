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

    protected function setUp(): void
    {
        parent::setUp();

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
        Company::query()->firstOrCreate(['id' => $id], [
            'name' => strtoupper($id),
            'manager' => 'Responsable',
            'email' => $id.'@demo.test',
            'status' => 'ACTIF',
            'requested_modules' => [self::MODULE],
        ]);
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