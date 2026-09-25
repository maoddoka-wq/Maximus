<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthUser;
use App\Models\Company;
use App\Support\ModuleCatalog;
use App\Services\PublicRegistrationPolicy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AppStateController extends Controller
{
    private const COMPANY_SCOPED_COLLECTIONS = [
        'companies',
        'employees',
        'roles',
        'orgNodes',
        'subscriptions',
        'controlTasks',
        'domainEvents',
        'auditEntries',
        'notifications',
        'products',
        'movements',
        'sales',
        'activities',
        'purchaseOrders',
        'supplierRecords',
        'deliveries',
        'businessDocuments',
        'accountingEntries',
        'payrollSlips',
        'crmOpportunities',
    ];

    private const EMPLOYEE_WRITABLE_COLLECTIONS = [
        'products',
        'movements',
        'sales',
        'activities',
        'purchaseOrders',
        'supplierRecords',
        'deliveries',
        'businessDocuments',
        'accountingEntries',
        'payrollSlips',
        'crmOpportunities',
    ];

    public function registrationCatalog(PublicRegistrationPolicy $registrationPolicy): JsonResponse
    {
        $row = DB::table('maximus_app_states')->where('scope', 'workspace')->first();
        $payload = is_string($row?->payload)
            ? json_decode($row->payload, true)
            : ($row?->payload ?? []);
        $state = is_array($payload) ? $payload : [];
        $sectorPresets = array_key_exists('sectorPresets', $state) ? $state['sectorPresets'] : null;
        if (is_array($sectorPresets)) {
            $retiredSectorIds = ['distribution', 'agroalimentaire', 'services', 'commerce'];
            $sectorPresets = array_values(array_filter(
                $sectorPresets,
                static fn (mixed $sector): bool =>
                    is_array($sector)
                    && ! in_array((string) ($sector['id'] ?? ''), $retiredSectorIds, true),
            ));
        }

        return response()->json([
            'version' => (int) ($row?->version ?? 0),
            'catalog' => [
                'registrationEnabled' => $registrationPolicy->enabled(),
                'sectorPresets' => $sectorPresets,
                'moduleOverrides' => $state['moduleOverrides'] ?? [],
                'moduleStatuses' => $state['moduleStatuses'] ?? [],
                'customModules' => $state['customModules'] ?? [],
                'laboFeatureCatalog' => $state['laboFeatureCatalog'] ?? [],
                'removedModules' => $state['removedModules'] ?? [],
                'catalogVersion' => $state['catalogVersion'] ?? null,
            ],
        ]);
    }

    public function bootstrap(Request $request): JsonResponse
    {
        $actor = $request->attributes->get('authActor');
        if (!is_array($actor)) {
            return response()->json(['error' => 'Acteur MAXIMUS introuvable.'], 401);
        }

        $row = DB::table('maximus_app_states')->where('scope', 'workspace')->first();
        $payload = $row?->payload;
        $state = is_string($payload) ? json_decode($payload, true) : ($payload ?? []);

        if (!is_array($state)) {
            $state = [];
        }
        $stateVersion = (int) ($row?->version ?? 0);
        if (empty($state['companies']) && AuthUser::query()->whereNotNull('company_id')->exists()) {
            $recoveredState = $this->recoverStateFromAccounts();
            // Recovery is only responsible for rebuilding account-scoped
            // records. Keep the catalog already persisted in app-state:
            // otherwise a restart with an empty companies collection would
            // silently erase custom modules, packs, and pending drafts.
            foreach (['companies', 'employees', 'roles', 'orgNodes'] as $key) {
                $state[$key] = $recoveredState[$key] ?? [];
            }
            foreach ($recoveredState as $key => $value) {
                if (! array_key_exists($key, $state)) {
                    $state[$key] = $value;
                }
            }
            $nextVersion = ((int) ($row?->version ?? 0)) + 1;
            DB::table('maximus_app_states')->updateOrInsert(
                ['scope' => 'workspace'],
                [
                    'company_id' => null,
                    'payload' => json_encode($state, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                    'version' => $nextVersion,
                    'updated_at' => now(),
                    'created_at' => $row?->created_at ?? now(),
                ],
            );
            $stateVersion = $nextVersion;
        }

        // Company branding is persisted in the companies registry. The shared
        // app-state payload may have been written by an older browser, so it
        // must not be the source of truth for logos and theme colors.
        $state = $this->hydrateCompanyBranding($state);

        if (($actor['role'] ?? null) !== 'maximus_admin') {
            $state = $this->mergeCurrentCompanyFromRegistry(
                $state,
                (string) ($actor['companyId'] ?? ''),
            );
            $state = $this->restrictToCompany($state, (string) ($actor['companyId'] ?? ''));
        } else {
            $state = $this->mergeRegistryCompanies($state);
        }
        $state = $this->stripCredentials($state);

        return response()->json([
            'scope' => ($actor['role'] ?? null) === 'maximus_admin'
                ? 'workspace'
                : 'company:'.((string) ($actor['companyId'] ?? '')),
            'version' => $stateVersion,
            'data' => $state,
        ]);
    }

    private function mergeRegistryCompanies(array $state): array
    {
        $activeCompanies = Company::query()
            ->whereNull('deleted_at')
            ->where('status', 'ACTIF')
            ->orderBy('created_at')
            ->get();
        $activeCompanyIds = array_fill_keys($activeCompanies->pluck('id')->all(), true);
        $state = $this->restrictToActiveCompanies($state, $activeCompanyIds);
        $known = collect($state['companies'] ?? [])->keyBy('id');
        $activeCompanies->each(
            function (Company $company) use (&$state, $known): void {
                if ($known->has($company->id)) {
                    return;
                }
                $state['companies'][] = [
                    'id' => $company->id,
                    'name' => $company->name,
                    'manager' => $company->manager,
                    'email' => $company->email,
                    'phone' => (string) ($company->phone ?? ''),
                    'country' => (string) ($company->country ?? ''),
                    'sector' => (string) ($company->sector ?? ''),
                    'status' => $company->status,
                    'requestedModules' => $company->requested_modules ?? [],
                    'requestedModulePackIds' => $company->requested_module_pack_ids ?? [],
                    'requestedModuleFeatures' => $company->requested_module_features ?? [],
                    'requestedModulePermissions' => $company->requested_module_permissions ?? [],
                    'allowedModules' => $this->allowedModulesFromRegistry($company),
                    'refusedModules' => [],
                    'createdAt' => optional($company->created_at)->toISOString(),
                    'profilePhoto' => $company->profile_photo,
                    'primaryColor' => $company->primary_color,
                    'accentColor' => $company->accent_color,
                    'sidebarColor' => $company->sidebar_color,
                    'deletionLocked' => (bool) ($company->deletion_locked ?? true),
                ];
            },
        );

        return $state;
    }

    /**
     * Rebuild only the minimum business state needed to reconnect accounts when
     * the app-state row was not persisted, using auth and module-access records.
     * This is deliberately idempotent and never copies password data.
     */
    private function recoverStateFromAccounts(): array
    {
        ModuleCatalog::ensureCatalog();

        $users = AuthUser::query()
            ->whereNotNull('company_id')
            ->where('status', 'ACTIF')
            ->orderBy('created_at')
            ->get();
        $accessRows = DB::table('maximus_company_modules')
            ->whereIn('company_id', $users->pluck('company_id')->filter()->unique()->values()->all())
            ->get()
            ->groupBy('company_id');
        $definitions = collect(ModuleCatalog::definitions())->keyBy('id');
        $companyIds = $users->pluck('company_id')->filter()->unique()->values();

        $companies = $companyIds->map(function (string $companyId) use ($users, $accessRows): array {
            $company = Company::query()->whereKey($companyId)->whereNull('deleted_at')->first();
            $admin = $users->first(
                fn (AuthUser $user): bool => $user->company_id === $companyId && $user->role === 'company_admin',
            );
            $allowedModules = collect($accessRows->get($companyId, []))
                ->filter(fn (object $row): bool => in_array($row->status, ['ACTIF', 'BETA'], true))
                ->pluck('module_id')
                ->values()
                ->all();
            $displayName = trim((string) ($admin?->display_name ?? ''));
            $createdAt = ($admin?->created_at ?? now())->toISOString();

            return [
                'id' => $companyId,
                'name' => $company?->name ?? ($displayName !== '' ? $displayName : $companyId),
                'manager' => $displayName !== '' ? $displayName : 'Administrateur',
                'email' => (string) ($company?->email ?? $admin?->email ?? ''),
                'phone' => (string) ($company?->phone ?? ''),
                'country' => (string) ($company?->country ?? ''),
                'sector' => (string) ($company?->sector ?? ''),
                'status' => (string) ($company?->status ?? 'ACTIF'),
                'requestedModules' => $company?->requested_modules ?? $allowedModules,
                'allowedModules' => $allowedModules,
                'refusedModules' => [],
                'createdAt' => $createdAt,
                'profilePhoto' => $company?->profile_photo,
                'primaryColor' => $company?->primary_color,
                'accentColor' => $company?->accent_color,
                'sidebarColor' => $company?->sidebar_color,
                'deletionLocked' => (bool) ($company?->deletion_locked ?? true),
            ];
        })->values()->all();

        $nodes = [];
        foreach ($users as $user) {
            $companyId = (string) $user->company_id;
            foreach (array_values(array_filter($user->sector_ids ?? [])) as $sectorId) {
                $nodeId = (string) $sectorId;
                if (isset($nodes[$nodeId])) {
                    continue;
                }
                $allowedModules = collect($accessRows->get($companyId, []))
                    ->filter(fn (object $row): bool => in_array($row->status, ['ACTIF', 'BETA'], true))
                    ->pluck('module_id')
                    ->values()
                    ->all();
                $nodes[$nodeId] = [
                    'id' => $nodeId,
                    'companyId' => $companyId,
                    'name' => 'Unité '.$nodeId,
                    'code' => 'UNIT',
                    'type' => 'service',
                    'parentId' => null,
                    'moduleIds' => $allowedModules,
                ];
            }
        }

        $roles = [];
        $employees = [];
        foreach ($users->filter(fn (AuthUser $user): bool => $user->employee_id !== null) as $user) {
            $sectorId = array_values(array_filter($user->sector_ids ?? []))[0] ?? null;
            $roleId = 'recovered-role-'.$user->id;
            $permissions = is_array($user->permissions) ? $user->permissions : [];
            $roles[] = [
                'id' => $roleId,
                'name' => trim((string) $user->display_name) !== '' ? trim((string) $user->display_name) : (string) $user->role,
                'description' => 'Rôle récupéré depuis le compte authentifié.',
                'companyId' => (string) $user->company_id,
                'sectorId' => $sectorId,
                'modulePermissions' => $permissions,
            ];
            $parts = preg_split('/\s+/', trim((string) $user->display_name), 2) ?: [];
            $employees[] = [
                'id' => (string) $user->employee_id,
                'firstName' => $parts[0] ?? 'Employé',
                'lastName' => $parts[1] ?? 'MAXIMUS',
                'email' => (string) $user->email,
                'phone' => (string) ($user->phone ?? ''),
                'position' => (string) $user->role,
                'department' => '',
                'subDepartment' => '',
                'role' => (string) $user->role,
                'status' => 'ACTIF',
                'companyId' => (string) $user->company_id,
                'sectorId' => $sectorId,
                'roleId' => $roleId,
                'isSectorAdmin' => $user->role === 'sector_manager',
            ];
        }

        return [
            'companies' => $companies,
            'employees' => $employees,
            'roles' => $roles,
            'orgNodes' => array_values($nodes),
            'subscriptions' => [],
            'commerceStates' => [],
            'moduleOverrides' => [],
            'removedModules' => [],
        ];
    }

    public function save(Request $request): JsonResponse
    {
        $actor = $request->attributes->get('authActor');
        if (!is_array($actor)) {
            return response()->json(['error' => 'Acteur MAXIMUS introuvable.'], 401);
        }

        $data = $request->validate([
            'data' => ['required', 'array'],
            'version' => ['nullable', 'integer', 'min:0'],
        ]);

        return DB::transaction(function () use ($actor, $data): JsonResponse {
            $current = DB::table('maximus_app_states')
                ->where('scope', 'workspace')
                ->lockForUpdate()
                ->first();
            $currentPayload = is_string($current?->payload)
                ? json_decode($current->payload, true)
                : ($current?->payload ?? []);
            $currentPayload = is_array($currentPayload) ? $currentPayload : [];

            $incomingState = $this->stripCredentials($data['data']);
            if (($actor['role'] ?? null) !== 'maximus_admin') {
                if (!in_array($actor['role'] ?? null, ['company_admin', 'sector_manager', 'employee'], true)) {
                    return response()->json(['error' => 'Cet acteur ne peut pas enregistrer l’état métier global.'], 403);
                }

                $companyId = (string) ($actor['companyId'] ?? '');
                if ($companyId === '') {
                    return response()->json(['error' => 'Aucune entreprise associée à cet acteur.'], 403);
                }
                if (($actor['role'] ?? null) === 'sector_manager'
                    && ! $this->managerStateWriteWithinScope(
                        $currentPayload,
                        $incomingState,
                        $companyId,
                        is_array($actor['sectorIds'] ?? null) ? $actor['sectorIds'] : [],
                    )) {
                    return response()->json([
                        'error' => 'La modification demandée sort du périmètre des secteurs administrés.',
                    ], 403);
                }

                $employeeCollections = ($actor['role'] ?? null) === 'employee'
                    ? self::EMPLOYEE_WRITABLE_COLLECTIONS
                    : null;
                $currentPayload = $this->mergeCompanyState(
                    $currentPayload,
                    $incomingState,
                    $companyId,
                    $employeeCollections,
                );
            } else {
                $currentPayload = $incomingState;
            }
            $currentPayload = $this->stripCredentials($currentPayload);

            $expectedVersion = array_key_exists('version', $data) ? (int) $data['version'] : null;
            if ($current && $expectedVersion !== null && (int) $current->version !== $expectedVersion) {
                return response()->json([
                    'error' => 'L’état métier a changé depuis son chargement. Rechargez la page avant de réessayer.',
                    'version' => (int) $current->version,
                ], 409);
            }

            $nextVersion = ((int) ($current->version ?? 0)) + 1;
            DB::table('maximus_app_states')->updateOrInsert(
                ['scope' => 'workspace'],
                [
                    'company_id' => null,
                    'payload' => json_encode($currentPayload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                    'version' => $nextVersion,
                    'updated_at' => now(),
                    'created_at' => $current?->created_at ?? now(),
                ],
            );

            return response()->json(['ok' => true, 'version' => $nextVersion]);
        });
    }

    private function managerStateWriteWithinScope(
        array $current,
        array $incoming,
        string $companyId,
        array $sectorIds,
    ): bool {
        $currentNodes = collect($current['orgNodes'] ?? [])
            ->filter(fn (mixed $item): bool => is_array($item) && ($item['companyId'] ?? null) === $companyId)
            ->values()
            ->all();
        $incomingNodes = collect($incoming['orgNodes'] ?? [])
            ->filter(fn (mixed $item): bool => is_array($item) && ($item['companyId'] ?? null) === $companyId)
            ->values()
            ->all();
        $nodes = [...$currentNodes, ...$incomingNodes];
        $allowedNodes = [];
        foreach ($sectorIds as $sectorId) {
            $allowedNodes[(string) $sectorId] = true;
        }
        do {
            $added = false;
            foreach ($nodes as $node) {
                if (!is_array($node) || isset($allowedNodes[(string) ($node['id'] ?? '')])) {
                    continue;
                }
                if (isset($allowedNodes[(string) ($node['parentId'] ?? '')])) {
                    $allowedNodes[(string) ($node['id'] ?? '')] = true;
                    $added = true;
                }
            }
        } while ($added);

        $currentByCollection = [];
        foreach (['companies', 'employees', 'roles', 'orgNodes'] as $collection) {
            $currentByCollection[$collection] = collect($current[$collection] ?? [])
                ->filter(fn (mixed $item): bool => is_array($item) && isset($item['id']))
                ->keyBy(fn (array $item): string => (string) $item['id'])
                ->all();
        }

        foreach (['companies', 'employees', 'roles', 'orgNodes'] as $collection) {
            foreach (($incoming[$collection] ?? []) as $item) {
                if (!is_array($item) || !isset($item['id'])) {
                    return false;
                }
                $id = (string) $item['id'];
                $existing = $currentByCollection[$collection][$id] ?? null;
                $recordCompanyId = $collection === 'companies'
                    ? $id
                    : ($item['companyId'] ?? $item['company_id'] ?? null);
                if ($collection !== 'companies' && $recordCompanyId !== null && (string) $recordCompanyId !== $companyId) {
                    return false;
                }

                $sectorId = $collection === 'orgNodes'
                    ? $id
                    : ($item['sectorId'] ?? $item['sector_id'] ?? null);
                $oldSectorId = is_array($existing)
                    ? ($existing['sectorId'] ?? $existing['sector_id'] ?? null)
                    : null;
                $inside = $collection === 'companies'
                    ? false
                    : isset($allowedNodes[(string) $sectorId]) || isset($allowedNodes[(string) $oldSectorId]);
                if (!$inside && !$this->sameStateRecord($existing, $item)) {
                    return false;
                }
            }
        }

        return true;
    }

    private function sameStateRecord(mixed $left, mixed $right): bool
    {
        if (!is_array($left) || !is_array($right)) {
            return false;
        }
        $normalize = function (mixed $value) use (&$normalize): mixed {
            if (!is_array($value)) {
                return $value;
            }
            if (array_is_list($value)) {
                return array_map($normalize, $value);
            }
            ksort($value);
            foreach ($value as $key => $child) {
                $value[$key] = $normalize($child);
            }
            return $value;
        };

        return json_encode($normalize($left)) === json_encode($normalize($right));
    }

    private function stripCredentials(array $state): array
    {
        foreach (['companies' => 'adminPassword', 'employees' => 'loginPassword'] as $collection => $credentialKey) {
            if (!isset($state[$collection]) || !is_array($state[$collection])) {
                continue;
            }
            $state[$collection] = array_map(
                static function (mixed $item) use ($credentialKey): mixed {
                    if (!is_array($item)) {
                        return $item;
                    }
                    unset($item[$credentialKey]);
                    return $item;
                },
                $state[$collection],
            );
        }

        return $state;
    }

    private function restrictToActiveCompanies(array $state, array $activeCompanyIds): array
    {
        $state['companies'] = array_values(array_filter(
            $state['companies'] ?? [],
            static fn (mixed $item): bool => is_array($item)
                && isset($item['id'])
                && isset($activeCompanyIds[(string) $item['id']]),
        ));

        foreach (self::COMPANY_SCOPED_COLLECTIONS as $key) {
            if ($key === 'companies') {
                continue;
            }
            if (!isset($state[$key]) || !is_array($state[$key])) {
                continue;
            }
            $state[$key] = array_values(array_filter(
                $state[$key],
                static function (mixed $item) use ($activeCompanyIds): bool {
                    if (!is_array($item)) {
                        return false;
                    }
                    $companyId = $item['companyId'] ?? $item['company_id'] ?? null;
                    return $companyId === null || isset($activeCompanyIds[(string) $companyId]);
                },
            ));
        }

        if (isset($state['commerceStates']) && is_array($state['commerceStates'])) {
            $state['commerceStates'] = array_intersect_key($state['commerceStates'], $activeCompanyIds);
        }

        return $state;
    }

    private function hydrateCompanyBranding(array $state): array
    {
        if (!isset($state['companies']) || !is_array($state['companies'])) {
            return $state;
        }

        $companyIds = collect($state['companies'])
            ->filter(fn (mixed $company): bool => is_array($company) && isset($company['id']))
            ->map(fn (array $company): string => (string) $company['id'])
            ->filter()
            ->unique()
            ->values()
            ->all();

        if ($companyIds === []) {
            return $state;
        }

        $companies = Company::query()
            ->whereNull('deleted_at')
            ->whereIn('id', $companyIds)
            ->get()
            ->keyBy('id');
        $installationIds = $companies->pluck('erp_installation_id')->filter()->values()->all();
        $installations = DB::table('maximus_installations')
            ->whereIn('id', $installationIds)
            ->whereNull('revoked_at')
            ->get()
            ->keyBy('id');

        $state['companies'] = array_map(
            function (mixed $item) use ($companies, $installations): mixed {
                if (!is_array($item)) {
                    return $item;
                }

                $company = $companies->get((string) ($item['id'] ?? ''));
                if (!$company) {
                    return $item;
                }

                return array_replace($item, [
                    'profilePhoto' => $company->profile_photo,
                    'primaryColor' => $company->primary_color,
                    'accentColor' => $company->accent_color,
                    'sidebarColor' => $company->sidebar_color,
                    'deletionLocked' => (bool) ($company->deletion_locked ?? true),
                    'primaryInstallationId' => $company->erp_installation_id,
                    'primaryInstallationMode' => $installations->get($company->erp_installation_id)?->mode,
                ]);
            },
            $state['companies'],
        );

        return $state;
    }

    /**
     * The companies registry is authoritative for access configuration.
     * Older app-state snapshots can still contain the company with stale
     * requested modules/features, which would hide authorized module entries
     * from the company workspace after a deployment.
     */
    private function mergeCurrentCompanyFromRegistry(array $state, string $companyId): array
    {
        if ($companyId === '') {
            return $state;
        }

        $company = Company::query()
            ->whereNull('deleted_at')
            ->whereKey($companyId)
            ->first();
        if (!$company) {
            return $state;
        }
        $primaryInstallation = $company->erp_installation_id
            ? DB::table('maximus_installations')
                ->where('id', $company->erp_installation_id)
                ->where('company_id', $company->id)
                ->whereNull('revoked_at')
                ->first()
            : null;

        $registryCompany = [
            'id' => $company->id,
            'name' => $company->name,
            'manager' => $company->manager,
            'email' => $company->email,
            'phone' => (string) ($company->phone ?? ''),
            'country' => (string) ($company->country ?? ''),
            'sector' => (string) ($company->sector ?? ''),
            'status' => $company->status,
            'requestedModules' => $company->requested_modules ?? [],
            'requestedModulePackIds' => $company->requested_module_pack_ids ?? [],
            'requestedModuleFeatures' => $company->requested_module_features ?? [],
            'requestedModulePermissions' => $company->requested_module_permissions ?? [],
            'allowedModules' => $this->allowedModulesFromRegistry($company),
            'refusedModules' => [],
            'createdAt' => optional($company->created_at)->toISOString(),
            'profilePhoto' => $company->profile_photo,
            'primaryColor' => $company->primary_color,
            'accentColor' => $company->accent_color,
            'sidebarColor' => $company->sidebar_color,
            'deletionLocked' => (bool) ($company->deletion_locked ?? true),
            'primaryInstallationId' => $primaryInstallation?->id,
            'primaryInstallationMode' => $primaryInstallation?->mode,
        ];

        $companies = collect($state['companies'] ?? []);
        if ($companies->contains(fn (mixed $item): bool => is_array($item) && ($item['id'] ?? null) === $companyId)) {
            $state['companies'] = $companies
                ->map(fn (mixed $item): mixed =>
                    is_array($item) && ($item['id'] ?? null) === $companyId
                        ? array_replace($item, $registryCompany)
                        : $item,
                )
                ->values()
                ->all();
        } else {
            $state['companies'] = [...$companies->all(), $registryCompany];
        }

        return $state;
    }

    /**
     * The persisted module access rows represent the effective authorization.
     * requested_modules only describes the original registration request and
     * does not include modules activated later by MAXIMUS.
     */
    private function allowedModulesFromRegistry(Company $company): array
    {
        if ($company->status !== 'ACTIF') {
            return [];
        }

        $hasPersistedAccess = DB::table('maximus_company_modules')
            ->where('company_id', $company->id)
            ->exists();
        if (!$hasPersistedAccess) {
            return $company->requested_modules ?? [];
        }

        return collect(ModuleCatalog::bootstrap($company->id))
            ->filter(fn (array $module): bool => in_array($module['status'] ?? null, ['ACTIF', 'BETA'], true))
            ->pluck('id')
            ->values()
            ->all();
    }

    /**
     * Keep shared catalog settings while limiting business records to the actor's company.
     */
    private function restrictToCompany(array $state, string $companyId): array
    {
        if ($companyId === '') {
            return [];
        }

        foreach (self::COMPANY_SCOPED_COLLECTIONS as $key) {
            if (!isset($state[$key]) || !is_array($state[$key])) {
                continue;
            }
            $state[$key] = array_values(array_filter(
                $state[$key],
                fn (mixed $item): bool => $this->belongsToCompany($item, $companyId, $key),
            ));
        }

        if (isset($state['commerceStates']) && is_array($state['commerceStates'])) {
            $state['commerceStates'] = array_key_exists($companyId, $state['commerceStates'])
                ? [$companyId => $state['commerceStates'][$companyId]]
                : [];
        }

        return $state;
    }

    private function mergeCompanyState(
        array $current,
        array $incoming,
        string $companyId,
        ?array $writableCollections = null,
    ): array
    {
        foreach ($incoming as $key => $value) {
            if (!is_array($value)) {
                continue;
            }
            if ($writableCollections !== null
                && !in_array($key, $writableCollections, true)
                && $key !== 'commerceStates') {
                continue;
            }

            if ($key === 'commerceStates') {
                if (!isset($current[$key]) || !is_array($current[$key])) {
                    $current[$key] = [];
                }
                if (array_key_exists($companyId, $value)) {
                    $current[$key][$companyId] = $value[$companyId];
                }
                continue;
            }

            $isCompanyScopedCollection = in_array($key, self::COMPANY_SCOPED_COLLECTIONS, true);
            if (!isset($current[$key]) || !is_array($current[$key])) {
                if (!$isCompanyScopedCollection) {
                    continue;
                }
                $current[$key] = [];
            }

            if (!array_is_list($value)) {
                $current[$key] = array_replace_recursive($current[$key], $value);
                continue;
            }

            $existing = collect($current[$key]);
            $incomingCompanyRecords = collect($value)
                ->map(fn (mixed $item): ?array => $this->normalizeIncomingCompanyRecord($item, $companyId, $key))
                ->filter()
                ->values();
            if ($incomingCompanyRecords->isEmpty()) {
                continue;
            }

            $ids = $incomingCompanyRecords->pluck('id')->filter()->all();
            $preserved = $existing->filter(
                fn (mixed $item): bool => !$this->belongsToCompany($item, $companyId, $key)
                    && (!is_array($item) || !in_array($item['id'] ?? null, $ids, true)),
            );
            $current[$key] = $preserved->concat($incomingCompanyRecords)->values()->all();
        }

        return $current;
    }

    private function normalizeIncomingCompanyRecord(mixed $item, string $companyId, string $key): ?array
    {
        if (!is_array($item)) {
            return null;
        }

        $recordCompanyId = $key === 'companies'
            ? ($item['id'] ?? null)
            : ($item['companyId'] ?? $item['company_id'] ?? null);

        if ($recordCompanyId === null && $key !== 'companies') {
            $item['companyId'] = $companyId;
            return $item;
        }

        return (string) $recordCompanyId === $companyId ? $item : null;
    }

    private function belongsToCompany(mixed $item, string $companyId, string $key): bool
    {
        if (!is_array($item)) {
            return false;
        }

        $recordCompanyId = $key === 'companies'
            ? ($item['id'] ?? null)
            : ($item['companyId'] ?? $item['company_id'] ?? null);

        return $recordCompanyId === $companyId;
    }
}