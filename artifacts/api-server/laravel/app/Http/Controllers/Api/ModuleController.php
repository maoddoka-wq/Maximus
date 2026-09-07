<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
        ])->validate();

        $definition = collect(ModuleCatalog::definitions())->firstWhere('id', $moduleId);
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
}