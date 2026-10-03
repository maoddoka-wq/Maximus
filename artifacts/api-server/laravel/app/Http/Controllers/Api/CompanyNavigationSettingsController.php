<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Support\InstallationContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

final class CompanyNavigationSettingsController extends Controller
{
    public function show(Request $request, string $companyId): JsonResponse
    {
        if (! $this->canAccess($request, $companyId)) {
            return response()->json(['error' => 'Ce réglage est réservé aux administrateurs autorisés.'], 403);
        }

        $company = Company::query()->whereNull('deleted_at')->findOrFail($companyId);

        return response()->json($this->settings($company));
    }

    public function update(Request $request, string $companyId): JsonResponse
    {
        if (! $this->canAccess($request, $companyId)) {
            return response()->json(['error' => 'Ce réglage est réservé aux administrateurs autorisés.'], 403);
        }

        $isMaximus = ($request->attributes->get('authActor')['role'] ?? null) === 'maximus_admin';
        if (! $isMaximus && array_key_exists('customAllowed', $request->all())) {
            return response()->json(['error' => 'Seul MAXIMUS peut autoriser la personnalisation de la navigation.'], 403);
        }

        $input = Validator::make($request->all(), [
            'mode' => ['sometimes', 'required', Rule::in(['menu', 'horizontal'])],
            'customAllowed' => ['sometimes', 'required', 'boolean'],
        ])->validate();
        if ($input === []) {
            return response()->json(['error' => 'Aucun réglage de navigation fourni.'], 422);
        }

        return DB::transaction(function () use ($companyId, $input, $isMaximus): JsonResponse {
            $company = Company::query()->whereNull('deleted_at')->lockForUpdate()->findOrFail($companyId);
            // Serialize a company edit with MAXIMUS grant/revocation on the same row.
            if (! $isMaximus && ! $company->navigation_custom_allowed) {
                return response()->json(['error' => 'MAXIMUS n’a pas autorisé la modification de la navigation.'], 403);
            }

            if (array_key_exists('mode', $input)) {
                $company->module_navigation_mode = $input['mode'];
                // A central choice is an explicit directive, even if it reasserts the same mode.
                // A dedicated company's local preference must survive ordinary synchronization.
                if (InstallationContext::isCentral()) {
                    $company->navigation_revision = (int) $company->navigation_revision + 1;
                }
            }
            if (array_key_exists('customAllowed', $input)) {
                $company->navigation_custom_allowed = (bool) $input['customAllowed'];
            }
            if ($company->isDirty()) {
                $company->save();
                DB::table('maximus_installations')
                    ->where('company_id', $companyId)
                    ->where('status', '!=', 'REVOKED')
                    ->whereNull('revoked_at')
                    ->increment('configuration_version', 1, ['updated_at' => now()]);
            }

            return response()->json(['ok' => true, ...$this->settings($company)]);
        });
    }

    private function canAccess(Request $request, string $companyId): bool
    {
        $actor = $request->attributes->get('authActor') ?? [];

        return ($actor['role'] ?? null) === 'maximus_admin'
            || (($actor['role'] ?? null) === 'company_admin'
                && ($actor['companyId'] ?? null) === $companyId);
    }

    /** @return array{companyId: string, mode: string, customAllowed: bool} */
    private function settings(Company $company): array
    {
        return [
            'companyId' => (string) $company->id,
            'mode' => $company->module_navigation_mode ?? 'menu',
            'customAllowed' => (bool) $company->navigation_custom_allowed,
        ];
    }
}
