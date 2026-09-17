<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

final class InstallationController extends Controller
{
    public function issue(Request $request, string $companyId): JsonResponse
    {
        if (($request->attributes->get('authActor')['role'] ?? null) !== 'maximus_admin') {
            return response()->json(['error' => 'Accès réservé à MAXIMUS.'], 403);
        }
        $company = Company::query()->whereKey($companyId)->where('status', 'ACTIF')->whereNull('deleted_at')->first();
        if (! $company) {
            return response()->json(['error' => 'L’entreprise doit être active avant son installation.'], 409);
        }
        $input = Validator::make($request->all(), [
            'mode' => ['required', 'in:dedicated,on_premise'],
            'endpointUrl' => ['nullable', 'url', 'max:500'],
        ])->validate();
        $token = 'mxinstall_'.Str::random(64);
        $existing = DB::table('maximus_installations')->where('company_id', $companyId)->first();
        $id = $existing?->id ?? 'installation-'.Str::uuid();
        DB::table('maximus_installations')->updateOrInsert(
            ['company_id' => $companyId],
            [
                'id' => $id,
                'mode' => $input['mode'],
                'status' => 'READY',
                'token_hash' => hash('sha256', $token),
                'endpoint_url' => $input['endpointUrl'] ?? null,
                'configuration_version' => ((int) ($existing?->configuration_version ?? 0)) + 1,
                'last_seen_at' => null,
                'last_sync_at' => null,
                'last_error' => null,
                'revoked_at' => null,
                'updated_at' => now(),
                'created_at' => $existing?->created_at ?? now(),
            ],
        );

        return response()->json([
            'ok' => true,
            'installation' => $this->payload(DB::table('maximus_installations')->where('id', $id)->first(), $company),
            'bootstrap' => [
                'centralUrl' => rtrim((string) config('maximus.central_public_url'), '/'),
                'installationId' => $id,
                'companyId' => (string) $companyId,
                'mode' => $input['mode'],
                'token' => $token,
            ],
        ], 201);
    }

    public function revoke(Request $request, string $companyId): JsonResponse
    {
        if (($request->attributes->get('authActor')['role'] ?? null) !== 'maximus_admin') {
            return response()->json(['error' => 'Accès réservé à MAXIMUS.'], 403);
        }
        DB::table('maximus_installations')->where('company_id', $companyId)->update([
            'status' => 'REVOKED',
            'revoked_at' => now(),
            'updated_at' => now(),
        ]);
        return response()->json(['ok' => true]);
    }

    public function configuration(Request $request): JsonResponse
    {
        $installation = $request->attributes->get('installation');
        $company = Company::query()->whereKey((string) $installation->company_id)
            ->where('status', 'ACTIF')->whereNull('deleted_at')->first();
        if (! $company) {
            return response()->json(['error' => 'L’entreprise liée à cette installation est inactive.'], 409);
        }
        $domains = DB::table('ecommerce_domains')->where('company_id', $company->id)->orderBy('domain')->get()
            ->map(fn (object $domain): array => [
                'id' => $domain->id,
                'domain' => $domain->domain,
                'targetHost' => $domain->target_host,
                'verificationValue' => $domain->verification_token,
                'status' => $domain->status,
                'lastError' => $domain->last_error,
                'verifiedAt' => $domain->verified_at,
            ])->values()->all();

        DB::table('maximus_installations')->where('id', $installation->id)->update([
            'status' => 'CONNECTED',
            'last_seen_at' => now(),
            'last_sync_at' => now(),
            'last_error' => null,
            'updated_at' => now(),
        ]);

        return response()->json([
            'configurationVersion' => (int) $installation->configuration_version,
            'installation' => [
                'id' => $installation->id,
                'companyId' => $company->id,
                'mode' => $installation->mode,
            ],
            'company' => [
                'id' => (string) $company->id,
                'name' => (string) $company->name,
                'manager' => (string) $company->manager,
                'email' => (string) $company->email,
                'phone' => (string) ($company->phone ?? ''),
                'country' => (string) ($company->country ?? ''),
                'sector' => (string) ($company->sector ?? ''),
                'loginSlug' => (string) ($company->login_slug ?? ''),
            ],
            'modules' => [
                'ids' => $company->requested_modules ?? [],
                'packIds' => $company->requested_module_pack_ids ?? [],
                'featureIds' => $company->requested_module_features ?? [],
                'permissions' => $company->requested_module_permissions ?? [],
            ],
            'domains' => $domains,
        ]);
    }

    public function heartbeat(Request $request): JsonResponse
    {
        $installation = $request->attributes->get('installation');
        DB::table('maximus_installations')->where('id', $installation->id)->update([
            'status' => 'CONNECTED',
            'last_seen_at' => now(),
            'last_sync_at' => now(),
            'updated_at' => now(),
        ]);
        return response()->json(['ok' => true]);
    }

    /** @return array<string, mixed> */
    private function payload(object $installation, Company $company): array
    {
        return [
            'id' => $installation->id,
            'companyId' => $company->id,
            'mode' => $installation->mode,
            'status' => $installation->status,
            'configurationVersion' => (int) $installation->configuration_version,
            'lastSeenAt' => $installation->last_seen_at,
            'lastSyncAt' => $installation->last_sync_at,
            'revokedAt' => $installation->revoked_at,
        ];
    }
}