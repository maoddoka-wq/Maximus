<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\ModuleCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ModuleController extends Controller
{
    public function bootstrap(Request $request): JsonResponse
    {
        $companyId = $request->attributes->get('companyId');
        if (!is_string($companyId) || $companyId === '') {
            return response()->json(['error' => 'companyId requis pour charger les accès modules.'], 400);
        }

        return response()->json([
            'companyId' => $companyId,
            'modules' => ModuleCatalog::bootstrap($companyId),
        ]);
    }

    public function catalog(): JsonResponse
    {
        return response()->json(['modules' => ModuleCatalog::catalog()]);
    }

    public function setAccess(Request $request, string $moduleId): JsonResponse
    {
        $actor = $request->attributes->get('authActor');
        if (($actor['role'] ?? null) !== 'maximus_admin') {
            return response()->json(['error' => 'Seul MAXIMUS peut activer ou désactiver un module.'], 403);
        }

        $input = Validator::make($request->all(), [
            'status' => ['required', 'in:ACTIF,BETA,INACTIF'],
            'featureIds' => ['nullable', 'array'],
            'featureIds.*' => ['string', 'min:1'],
            'configuration' => ['nullable', 'array'],
        ])->validate();

        $definition = collect(ModuleCatalog::definitions())->firstWhere('id', $moduleId);
        if (!$definition) {
            return response()->json(['error' => 'Module introuvable.'], 404);
        }

        $companyId = (string) $request->attributes->get('companyId');
        if ($companyId === '') {
            return response()->json(['error' => 'companyId requis pour modifier un accès module.'], 400);
        }
        DB::table('maximus_company_modules')->updateOrInsert(
            ['company_id' => $companyId, 'module_id' => $moduleId],
            [
                'id' => 'company-module-'.Str::slug($companyId.'-'.$moduleId),
                'status' => $input['status'],
                'feature_ids' => json_encode($input['featureIds'] ?? [], JSON_UNESCAPED_UNICODE),
                'configuration' => json_encode($input['configuration'] ?? [], JSON_UNESCAPED_UNICODE),
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );

        return response()->json([
            'companyId' => $companyId,
            'module' => collect(ModuleCatalog::bootstrap($companyId))->firstWhere('id', $moduleId),
        ]);
    }

    public function addFeature(Request $request, string $moduleId): JsonResponse
    {
        $actor = $request->attributes->get('authActor');
        if (($actor['role'] ?? null) !== 'maximus_admin') {
            return response()->json(['error' => 'Seul MAXIMUS peut ajouter une fonctionnalité au catalogue.'], 403);
        }

        $input = Validator::make($request->all(), [
            'key' => ['required', 'string', 'regex:/^[a-z][a-z0-9-]{1,79}$/'],
            'label' => ['required', 'string', 'min:2', 'max:160'],
            'description' => ['nullable', 'string', 'max:500'],
            'actions' => ['required', 'array', 'min:1'],
            'actions.*' => ['string', 'in:voir,créer,modifier,supprimer,exporter,valider'],
            'dependencies' => ['nullable', 'array'],
            'dependencies.*' => ['string', 'max:80'],
        ])->validate();

        if (!collect(ModuleCatalog::definitions())->contains('id', $moduleId)) {
            return response()->json(['error' => 'Module introuvable.'], 404);
        }

        $exists = DB::table('maximus_module_features')
            ->where('module_id', $moduleId)
            ->where('feature_key', $input['key'])
            ->exists();
        if ($exists) {
            return response()->json(['error' => 'Cet identifiant existe déjà dans ce module.'], 422);
        }

        $id = 'module-feature-'.Str::slug($moduleId.'-'.$input['key']);
        DB::table('maximus_module_features')->insert([
            'id' => $id,
            'module_id' => $moduleId,
            'feature_key' => $input['key'],
            'label' => trim($input['label']),
            'description' => trim($input['description'] ?? ''),
            'actions' => json_encode(array_values(array_unique($input['actions'])), JSON_UNESCAPED_UNICODE),
            'dependencies' => json_encode(array_values(array_unique($input['dependencies'] ?? [])), JSON_UNESCAPED_UNICODE),
            'status' => 'ACTIF',
            'sort_order' => (int) DB::table('maximus_module_features')->where('module_id', $moduleId)->max('sort_order') + 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $feature = DB::table('maximus_module_features')
            ->where('module_id', $moduleId)
            ->where('feature_key', $input['key'])
            ->first();
        DB::table('maximus_module_catalog_audits')->insert([
            'id' => 'module-catalog-audit-'.Str::uuid(),
            'action' => 'FEATURE_CREATED',
            'module_id' => $moduleId,
            'feature_id' => $feature->id,
            'summary' => 'Fonctionnalité « '.$feature->label.' » ajoutée au module.',
            'actor_name' => (string) ($actor['displayName'] ?? $actor['email'] ?? 'Administration MAXIMUS'),
            'metadata' => json_encode([
                'featureKey' => $feature->feature_key,
                'actions' => json_decode($feature->actions ?? '[]', true),
            ], JSON_UNESCAPED_UNICODE),
            'created_at' => now(),
        ]);

        return response()->json([
            'moduleId' => $moduleId,
            'feature' => [
                'id' => $feature->id,
                'key' => $feature->feature_key,
                'label' => $feature->label,
                'description' => $feature->description,
                'actions' => json_decode($feature->actions ?? '[]', true),
                'dependencies' => json_decode($feature->dependencies ?? '[]', true),
                'status' => $feature->status,
            ],
        ], 201);
    }
}