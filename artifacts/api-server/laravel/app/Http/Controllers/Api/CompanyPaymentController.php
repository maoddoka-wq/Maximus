<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\CompanyPaymentAccess;
use App\Support\CompanyRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

final class CompanyPaymentController extends Controller
{
    public function show(Request $request, string $companyId): JsonResponse
    {
        if (! $this->isMaximusAdmin($request)) {
            return response()->json(['error' => 'Seul MAXIMUS peut piloter les systèmes de paiement.'], 403);
        }
        if (! CompanyRegistry::isActive($companyId)) {
            return response()->json(['error' => 'Entreprise introuvable ou inactive.'], 404);
        }

        return response()->json(CompanyPaymentAccess::payload($companyId));
    }

    public function update(Request $request, string $companyId): JsonResponse
    {
        if (! $this->isMaximusAdmin($request)) {
            return response()->json(['error' => 'Seul MAXIMUS peut piloter les systèmes de paiement.'], 403);
        }
        if (! CompanyRegistry::isActive($companyId)) {
            return response()->json(['error' => 'Entreprise introuvable ou inactive.'], 404);
        }

        $input = Validator::make($request->all(), [
            'enabled' => ['required', 'boolean'],
            'providers' => ['nullable', 'array'],
            'providers.*' => ['string', 'in:DIAMANOPAY'],
        ])->validate();
        $providers = array_values(array_unique($input['providers'] ?? [CompanyPaymentAccess::PROVIDER_DIAMANOPAY]));
        $updatedBy = (string) ($request->attributes->get('authActor')['id'] ?? 'maximus');

        DB::transaction(function () use ($companyId, $input, $providers, $updatedBy): void {
            DB::table('company_payment_settings')->updateOrInsert(
                ['company_id' => $companyId],
                [
                    'id' => 'company-payment-'.\Illuminate\Support\Str::slug($companyId),
                    'status' => $input['enabled'] ? 'ACTIF' : 'INACTIF',
                    'providers' => json_encode($providers, JSON_UNESCAPED_UNICODE),
                    'updated_by' => $updatedBy,
                    'updated_at' => now(),
                    'created_at' => now(),
                ],
            );

            DB::table('maximus_installations')
                ->where('company_id', $companyId)
                ->where('status', '!=', 'REVOKED')
                ->whereNull('revoked_at')
                ->increment('configuration_version', 1, ['updated_at' => now()]);
        });

        return response()->json(CompanyPaymentAccess::payload($companyId));
    }

    private function isMaximusAdmin(Request $request): bool
    {
        return ($request->attributes->get('authActor')['role'] ?? null) === 'maximus_admin';
    }
}