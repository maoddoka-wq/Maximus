<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use App\Support\ModuleCatalog;
use App\Support\ApplicationIdentity;
use App\Support\CompanyPaymentAccess;

final class InstallationController extends Controller
{
    public function issue(Request $request, string $companyId, ?string $installationId = null): JsonResponse
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
            'installationId' => ['nullable', 'string', 'max:255'],
            'createNew' => ['sometimes', 'boolean'],
        ])->validate();
        $token = 'mxinstall_'.Str::random(64);
        $installationId ??= $input['installationId'] ?? null;
        $query = DB::table('maximus_installations')->where('company_id', $companyId);
        $existing = $installationId ? (clone $query)->where('id', $installationId)->first() : null;
        abort_if($installationId && !$existing, 404);
        if (!$installationId && !($input['createNew'] ?? false)) {
            abort_if((clone $query)->count() > 1, 409, 'Précisez installationId pour renouveler une installation, ou createNew pour en créer une.');
            $existing = $query->first();
        }
        abort_if($existing && $existing->mode !== $input['mode'] && DB::table('maximus_installation_addresses')->where('installation_id', $existing->id)->exists(), 409, 'Supprimez les adresses avant de modifier le mode.');
        $id = $existing?->id ?? 'installation-'.Str::uuid();
        DB::table('maximus_installations')->updateOrInsert(
            ['id' => $id],
            [
                'company_id' => $companyId,
                'mode' => $input['mode'],
                'status' => 'READY',
                'token_hash' => hash('sha256', $token),
                'endpoint_url' => $existing?->endpoint_url ?? ($input['endpointUrl'] ?? null),
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
                'applicationVersion' => ApplicationIdentity::deployedVersion(),
                'syncProtocolVersion' => ApplicationIdentity::SYNC_PROTOCOL_VERSION,
                'token' => $token,
            ],
        ], 201);
    }

    public function revoke(Request $request, string $companyId, ?string $installationId = null): JsonResponse
    {
        if (($request->attributes->get('authActor')['role'] ?? null) !== 'maximus_admin') {
            return response()->json(['error' => 'Accès réservé à MAXIMUS.'], 403);
        }
        $query = DB::table('maximus_installations')->where('company_id', $companyId);
        if ($installationId !== null) {
            $query->where('id', $installationId);
            abort_unless((clone $query)->exists(), 404);
        }
        $query->update([
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
        $domains = DB::table('ecommerce_domains')
            ->where('company_id', $company->id)
            ->whereNull('deleted_at')
            ->orderBy('domain')
            ->get()
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
        $moduleIds = $this->synchronizedModuleIds($company);
        $paymentAccess = CompanyPaymentAccess::payload((string) $company->id);

        return response()->json([
            'configurationVersion' => (int) $installation->configuration_version,
            'applicationVersion' => ApplicationIdentity::deployedVersion(),
            'syncProtocolVersion' => ApplicationIdentity::SYNC_PROTOCOL_VERSION,
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
                'profilePhoto' => $company->profile_photo,
                'primaryColor' => $company->primary_color ?: '#F2B705',
                'accentColor' => $company->accent_color ?: ($company->primary_color ?: '#F2B705'),
                'sidebarColor' => $company->sidebar_color ?: '#161D27',
            ],
            'modules' => [
                'ids' => $moduleIds,
                'packIds' => $company->requested_module_pack_ids ?? [],
                'featureIds' => $company->requested_module_features ?? [],
                'permissions' => $company->requested_module_permissions ?? [],
            ],
            'catalog' => ModuleCatalog::publishedCatalog($moduleIds),
            'domains' => $domains,
            'paymentAccess' => $paymentAccess,
            'erpAccess' => $this->erpAccess((string) $installation->id),
        ]);
    }

    /** @return list<string> */
    private function synchronizedModuleIds(Company $company): array
    {
        $requested = array_values(array_unique(array_map('strval', $company->requested_modules ?? [])));
        $statuses = DB::table('maximus_company_modules')
            ->where('company_id', $company->id)
            ->pluck('status', 'module_id')
            ->map(static fn (mixed $status): string => (string) $status)
            ->all();
        $allowedStatuses = ['ACTIF', 'BETA', 'MAINTENANCE'];
        $moduleIds = [];

        foreach ($requested as $moduleId) {
            if (! array_key_exists($moduleId, $statuses)
                || in_array($statuses[$moduleId], $allowedStatuses, true)) {
                $moduleIds[] = $moduleId;
            }
        }
        foreach ($statuses as $moduleId => $status) {
            if (in_array($status, $allowedStatuses, true) && ! in_array($moduleId, $moduleIds, true)) {
                $moduleIds[] = (string) $moduleId;
            }
        }

        return $moduleIds;
    }

    private function erpAccess(string $installationId): array
    {
        $addresses = DB::table('maximus_installation_addresses')->where('installation_id', $installationId)->where('status', 'ACTIVE')->get();
        return [
            'canonicalUrl' => $addresses->firstWhere('is_primary', true)?->url,
            'allowedHosts' => $addresses->pluck('hostname')->unique()->values()->all(),
        ];
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