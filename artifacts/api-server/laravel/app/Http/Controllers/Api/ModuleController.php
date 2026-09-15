<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Support\ModuleCatalog;
use App\Support\CompanyRegistry;
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

    public function setAccess(Request $request, string $moduleId): JsonResponse
    {
        $actor = $request->attributes->get('authActor');
        if (($actor['role'] ?? null) !== 'maximus_admin') {
            return response()->json(['error' => 'Seul MAXIMUS peut activer ou désactiver un module.'], 403);
        }

        $input = Validator::make($request->all(), [
            'status' => ['required', 'in:ACTIF,BETA,MAINTENANCE,INACTIF'],
            'featureIds' => ['nullable', 'array'],
            'featureIds.*' => ['string', 'min:1'],
            'configuration' => ['nullable', 'array'],
            'configuration.packIds' => ['nullable', 'array'],
            'configuration.packIds.*' => ['string', 'min:1'],
            'configuration.featurePermissions' => ['nullable', 'array'],
            'configuration.featurePermissions.*' => ['array'],
            'configuration.featurePermissions.*.*' => ['string', 'min:1'],
        ])->validate();

        $definition = collect(ModuleCatalog::definitionsWithCustom())->firstWhere('id', $moduleId);
        if (!$definition) {
            return response()->json(['error' => 'Module introuvable.'], 404);
        }

        $companyId = (string) $request->attributes->get('companyId');
        if ($companyId === '') {
            return response()->json(['error' => 'companyId requis pour modifier un accès module.'], 400);
        }
        if (!CompanyRegistry::exists($companyId)) {
            CompanyRegistry::ensureActive($companyId);
        }
        $existing = DB::table('maximus_company_modules')
            ->where('company_id', $companyId)
            ->where('module_id', $moduleId)
            ->first();
        $values = [
            'id' => 'company-module-'.Str::slug($companyId.'-'.$moduleId),
            'status' => $input['status'],
            'feature_ids' => array_key_exists('featureIds', $input)
                ? json_encode($input['featureIds'] ?? [], JSON_UNESCAPED_UNICODE)
                : ($existing?->feature_ids ?? json_encode([], JSON_UNESCAPED_UNICODE)),
            'configuration' => array_key_exists('configuration', $input)
                ? json_encode($input['configuration'] ?? [], JSON_UNESCAPED_UNICODE)
                : ($existing?->configuration ?? json_encode([], JSON_UNESCAPED_UNICODE)),
            'updated_at' => now(),
            'created_at' => $existing?->created_at ?? now(),
        ];
        DB::table('maximus_company_modules')->updateOrInsert(
            ['company_id' => $companyId, 'module_id' => $moduleId],
            $values,
        );

        $company = Company::query()->whereKey($companyId)->first();
        if ($company) {
            $featureIds = array_key_exists('featureIds', $input)
                ? array_values($input['featureIds'] ?? [])
                : (json_decode($existing?->feature_ids ?? '[]', true) ?: []);
            $configuration = array_key_exists('configuration', $input)
                ? ($input['configuration'] ?? [])
                : (json_decode($existing?->configuration ?? '{}', true) ?: []);
            $featurePermissions = is_array($configuration['featurePermissions'] ?? null)
                ? $configuration['featurePermissions']
                : ($company->requested_module_permissions[$moduleId] ?? []);

            $requestedFeatures = $company->requested_module_features ?? [];
            $requestedFeatures[$moduleId] = $featureIds;
            $requestedPacks = $company->requested_module_pack_ids ?? [];
            if (array_key_exists('packIds', $configuration) && is_array($configuration['packIds'])) {
                $requestedPacks[$moduleId] = array_values($configuration['packIds']);
            }
            $requestedPermissions = $company->requested_module_permissions ?? [];
            $requestedPermissions[$moduleId] = $featurePermissions;

            $company->update([
                'requested_module_features' => $requestedFeatures,
                'requested_module_pack_ids' => $requestedPacks,
                'requested_module_permissions' => $requestedPermissions,
            ]);
        }

        return response()->json([
            'companyId' => $companyId,
            'module' => collect(ModuleCatalog::bootstrap($companyId))->firstWhere('id', $moduleId),
        ]);
    }
}