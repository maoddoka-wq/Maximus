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
            ...$this->settings($companyId),
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
            'enabled' => ['sometimes', 'boolean'],
            'homepageEnabled' => ['sometimes', 'boolean'],
            'bannerEnabled' => ['sometimes', 'boolean'],
        ])->validate();
        if ($input === []) {
            return response()->json(['error' => 'Aucun réglage du site public n’a été fourni.'], 422);
        }
        $actorId = (string) ($request->attributes->get('authActor')['id'] ?? 'maximus');

        DB::transaction(function () use ($companyId, $input, $actorId): void {
            $exists = DB::table('company_public_site_access')
                ->where('company_id', $companyId)
                ->exists();
            $values = [
                'updated_by' => $actorId,
                'updated_at' => now(),
            ];
            foreach ([
                'enabled' => 'enabled',
                'homepageEnabled' => 'homepage_enabled',
                'bannerEnabled' => 'banner_enabled',
            ] as $inputKey => $column) {
                if (array_key_exists($inputKey, $input)) {
                    $values[$column] = (bool) $input[$inputKey];
                }
            }

            if ($exists) {
                DB::table('company_public_site_access')->where('company_id', $companyId)->update($values);
            } else {
                DB::table('company_public_site_access')->insert([
                    'company_id' => $companyId,
                    'enabled' => (bool) ($input['enabled'] ?? false),
                    'homepage_enabled' => (bool) ($input['homepageEnabled'] ?? true),
                    'banner_enabled' => (bool) ($input['bannerEnabled'] ?? true),
                    ...$values,
                    'created_at' => now(),
                ]);
            }

            DB::table('maximus_installations')
                ->where('company_id', $companyId)
                ->where('status', '!=', 'REVOKED')
                ->whereNull('revoked_at')
                ->increment('configuration_version', 1, ['updated_at' => now()]);
        });

        return response()->json([
            'ok' => true,
            'companyId' => $companyId,
            ...$this->settings($companyId),
        ]);
    }

    /** @return array{enabled: bool, homepageEnabled: bool, bannerEnabled: bool} */
    private function settings(string $companyId): array
    {
        $settings = DB::table('company_public_site_access')
            ->where('company_id', $companyId)
            ->first(['enabled', 'homepage_enabled', 'banner_enabled']);

        return [
            'enabled' => (bool) ($settings->enabled ?? false),
            'homepageEnabled' => (bool) ($settings->homepage_enabled ?? true),
            'bannerEnabled' => (bool) ($settings->banner_enabled ?? true),
        ];
    }

    private function isMaximusAdmin(Request $request): bool
    {
        return ($request->attributes->get('authActor')['role'] ?? null) === 'maximus_admin';
    }
}