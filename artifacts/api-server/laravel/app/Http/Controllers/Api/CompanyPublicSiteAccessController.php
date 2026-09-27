<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\CompanyRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

final class CompanyPublicSiteAccessController extends Controller
{
    public function show(Request $request, string $companyId): JsonResponse
    {
        if (! $this->isMaximusAdmin($request)) {
            return response()->json(['error' => 'Seul MAXIMUS peut autoriser l’accès au site public.'], 403);
        }
        if (! CompanyRegistry::isActive($companyId)) {
            return response()->json(['error' => 'Entreprise introuvable ou inactive.'], 404);
        }

        return response()->json([
            'companyId' => $companyId,
            'enabled' => DB::table('company_public_site_access')
                ->where('company_id', $companyId)
                ->value('enabled') === true,
        ]);
    }

    public function update(Request $request, string $companyId): JsonResponse
    {
        if (! $this->isMaximusAdmin($request)) {
            return response()->json(['error' => 'Seul MAXIMUS peut autoriser l’accès au site public.'], 403);
        }
        if (! CompanyRegistry::isActive($companyId)) {
            return response()->json(['error' => 'Entreprise introuvable ou inactive.'], 404);
        }

        $input = Validator::make($request->all(), [
            'enabled' => ['required', 'boolean'],
        ])->validate();
        $actorId = (string) ($request->attributes->get('authActor')['id'] ?? 'maximus');

        DB::table('company_public_site_access')->updateOrInsert(
            ['company_id' => $companyId],
            [
                'enabled' => (bool) $input['enabled'],
                'updated_by' => $actorId,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );

        return response()->json([
            'ok' => true,
            'companyId' => $companyId,
            'enabled' => (bool) $input['enabled'],
        ]);
    }

    private function isMaximusAdmin(Request $request): bool
    {
        return ($request->attributes->get('authActor')['role'] ?? null) === 'maximus_admin';
    }
}