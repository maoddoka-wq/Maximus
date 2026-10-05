<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthUser;
use App\Models\Company;
use App\Services\MaximusPushNotificationService;
use App\Services\PublicRegistrationPolicy;
use App\Support\CompanyStateBoundary;
use App\Support\ModuleAuthorization;
use App\Support\ModuleCatalog;
use App\Support\RolePermissionAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

    /** Every writable app-state collection has one explicit permission owner. */
    private const COLLECTION_PERMISSION_MODULES = [
        'products' => 'stocks',
        'movements' => 'stocks',
        'sales' => 'ventes',
        'activities' => 'presences',
        'purchaseOrders' => 'achats',
        'supplierRecords' => 'fournisseurs',
        'deliveries' => 'logistique',
        'businessDocuments' => 'documents',
        'accountingEntries' => 'comptabilite',
        'payrollSlips' => 'paie',
        'crmOpportunities' => 'crm',
        'employees' => 'rh',
        'roles' => 'rh',
        'orgNodes' => 'rh',
    ];
    private const COLLECTION_FEATURES = [
        'products' => ['stocks', 'products'],
        'movements' => ['stocks', 'entries'],
        'sales' => ['ventes', 'ventes'],
        'activities' => ['presences', 'pointage'],
        'purchaseOrders' => ['achats', 'achats'],
        'supplierRecords' => ['fournisseurs', 'fournisseurs'],
        'deliveries' => ['logistique', 'logistique'],
        'businessDocuments' => ['documents', 'documents'],
        'accountingEntries' => ['comptabilite', 'comptabilite'],
        'payrollSlips' => ['paie', 'préparer-une-paie'],
        'crmOpportunities' => ['crm', 'crm'],
        'employees' => ['rh', 'rh'],
        'roles' => ['rh', 'rh'],
        'orgNodes' => ['rh', 'rh'],
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
        if (($actor['role'] ?? null) !== 'maximus_admin') {
            $state = $this->mergeCurrentCompanyFromRegistry(
                $state,
                (string) ($actor['companyId'] ?? ''),
            );
            $state = $this->restrictToCompany($state, (string) ($actor['companyId'] ?? ''));
            $state = $this->restrictBusinessReads($state, $actor);
        } else {
            $state = $this->mergeRegistryCompanies($state);
        }
        $state = $this->hydrateCompanyBranding($state);
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
                    'moduleNavigationMode' => $company->module_navigation_mode ?? 'menu',
                    'navigationCustomAllowed' => (bool) $company->navigation_custom_allowed,
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
            'deleted' => ['sometimes', 'array'],
            'deleted.*.collection' => ['required', 'string'],
            'deleted.*.ids' => ['required', 'array'],
            'deleted.*.ids.*' => ['string'],
        ]);

        $authUser = $request->attributes->get('authUser');
        $actorUserId = is_object($authUser) && is_string($authUser->id ?? null)
            ? (string) $authUser->id
            : '';
        $requestHost = $request->getHost();

        return DB::transaction(function () use ($actor, $data, $actorUserId, $requestHost): JsonResponse {
            $current = DB::table('maximus_app_states')
                ->where('scope', 'workspace')
                ->lockForUpdate()
                ->first();
            $currentPayload = is_string($current?->payload)
                ? json_decode($current->payload, true)
                : ($current?->payload ?? []);
            $currentPayload = is_array($currentPayload) ? $currentPayload : [];
            $previousNotifications = is_array($currentPayload['notifications'] ?? null)
                ? $currentPayload['notifications']
                : [];

            $incomingState = $this->stripCredentials($data['data']);
            $deleted = is_array($data['deleted'] ?? null) ? $data['deleted'] : [];
            if (($actor['role'] ?? null) !== 'maximus_admin') {
                if (!in_array($actor['role'] ?? null, ['company_admin', 'sector_manager', 'employee'], true)) {
                    return response()->json(['error' => 'Cet acteur ne peut pas enregistrer l’état métier global.'], 403);
                }

                $companyId = (string) ($actor['companyId'] ?? '');
                if ($companyId === '') {
                    return response()->json(['error' => 'Aucune entreprise associée à cet acteur.'], 403);
                }
                $violation = CompanyStateBoundary::violation(
                    $currentPayload, $incomingState, $companyId,
                    (string) ($actor['role'] ?? ''), self::COMPANY_SCOPED_COLLECTIONS,
                );
                if ($violation !== null) {
                    return response()->json(['error' => $violation['error']], $violation['status']);
                }
                if (($actor['role'] ?? null) === 'sector_manager'
                    && ! $this->managerStateWriteWithinScope(
                        $currentPayload,
                        $incomingState,
                        $companyId,
                        $actor,
                        $deleted,
                    )) {
                    return response()->json([
                        'error' => 'La modification demandée sort du périmètre des secteurs administrés.',
                    ], 403);
                }

                if (! $this->stateMutationAuthorized($actor, $currentPayload, $incomingState, $deleted)) {
                    return response()->json([
                        'error' => 'Vous ne disposez pas des droits nécessaires pour cette opération.',
                    ], 403);
                }

                $writableCollections = match ($actor['role'] ?? null) {
                    'employee' => self::EMPLOYEE_WRITABLE_COLLECTIONS,
                    'sector_manager' => array_values(array_diff(
                        array_keys(self::COLLECTION_PERMISSION_MODULES),
                        ['companies'],
                    )),
                    default => null,
                };
                $currentPayload = $this->mergeCompanyState(
                    $currentPayload,
                    $incomingState,
                    $companyId,
                    $writableCollections,
                );
                $this->applyExplicitDeletes($currentPayload, $deleted, (string) ($actor['companyId'] ?? ''));
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

            if ($current) {
                $newNotifications = $this->newlyAddedNotifications(
                    $previousNotifications,
                    is_array($currentPayload['notifications'] ?? null)
                        ? $currentPayload['notifications']
                        : [],
                );
                if ($newNotifications !== []) {
                    DB::afterCommit(function () use ($newNotifications, $actorUserId, $requestHost): void {
                        app(MaximusPushNotificationService::class)->dispatchNewNotifications(
                            $newNotifications,
                            $actorUserId,
                            $requestHost,
                        );
                    });
                }
            }

            return response()->json(['ok' => true, 'version' => $nextVersion]);
        });
    }

    /**
     * @param array<int, mixed> $previous
     * @param array<int, mixed> $current
     * @return array<int, array<string, mixed>>
     */
    private function newlyAddedNotifications(array $previous, array $current): array
    {
        $knownIds = [];
        foreach ($previous as $notification) {
            if (is_array($notification) && is_string($notification['id'] ?? null)) {
                $knownIds[$notification['id']] = true;
            }
        }

        $newNotifications = [];
        foreach ($current as $notification) {
            if (! is_array($notification)) {
                continue;
            }

            $id = $notification['id'] ?? null;
            if (! is_string($id) || $id === '' || isset($knownIds[$id]) || ! empty($notification['read'])) {
                continue;
            }

            $knownIds[$id] = true;
            $newNotifications[] = $notification;
        }

        return $newNotifications;
    }

    /**
     * App-state is a whole-state snapshot API. Authorize the delta, rather than
     * trusting the client to send only the record it intended to change.
     */
    private function stateMutationAuthorized(array $actor, array $current, array $incoming, array $deleted = []): bool
    {
        $role = $actor['role'] ?? null;
        if (in_array($role, ['company_admin', 'maximus_admin'], true)) {
            return true;
        }
        if (! in_array($role, ['employee', 'sector_manager'], true)) {
            return false;
        }

        $allowedCollections = $role === 'employee'
            ? self::EMPLOYEE_WRITABLE_COLLECTIONS
            : array_keys(self::COLLECTION_PERMISSION_MODULES);
        $keys = array_unique(array_merge(array_keys($current), array_keys($incoming)));
        foreach ($keys as $key) {
            if (! array_key_exists($key, $incoming)) {
                // Omission is not deletion: clients may submit partial snapshots.
                continue;
            }
            if ($key === 'companies') {
                // Bootstrap enriches company metadata from the server registry.
                // Staff may receive that enriched view but cannot write it back.
                continue;
            }
            if (! array_key_exists($key, self::COLLECTION_PERMISSION_MODULES)) {
                // Shared catalog and unknown keys are never writable by staff.
                if (($current[$key] ?? null) !== $incoming[$key]) {
                    return false;
                }
                continue;
            }
            if (! is_array($incoming[$key]) || ! array_is_list($incoming[$key])) {
                return false;
            }
            $before = $this->recordsById($current[$key] ?? []);
            $after = $this->recordsById($incoming[$key]);
            if (! in_array($key, $allowedCollections, true)) {
                foreach ($after as $id => $record) {
                    if (! isset($before[$id]) || ! $this->sameStateRecord($before[$id], $record)) {
                        return false;
                    }
                }
                continue;
            }
            foreach ($incoming[$key] as $record) {
                if (! is_array($record) || ! isset($record['id'])) {
                    return false;
                }
            }
            foreach ($after as $id => $new) {
                $old = $before[$id] ?? null;
                if ($old !== null && $new !== null && $this->sameStateRecord($old, $new)) {
                    continue;
                }
                $needed = $old === null ? 'create' : 'modify';
                if ($this->isManagerAssignmentRemoval($actor, $key, $old, $new)) {
                    continue;
                }
                if (! $this->allowsCollectionAction($actor, $key, $needed, $new ?? $old)) {
                    return false;
                }
            }
        }
        foreach ($deleted as $request) {
            $key = is_array($request) ? (string) ($request['collection'] ?? '') : '';
            if (! in_array($key, $allowedCollections, true)
                || ! isset(self::COLLECTION_FEATURES[$key])
                || ! is_array($request['ids'] ?? null)) {
                return false;
            }
            foreach ((array) ($request['ids'] ?? []) as $id) {
                $record = $this->recordsById($current[$key] ?? [])[(string) $id] ?? null;
                if ($record !== null) {
                    if (! $this->belongsToCompany($record, (string) ($actor['companyId'] ?? ''), $key)
                        || ! $this->allowsCollectionAction($actor, $key, 'modify', $record)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    private function isManagerAssignmentRemoval(
        array $actor,
        string $collection,
        ?array $before,
        ?array $after,
    ): bool {
        if (($actor['role'] ?? null) !== 'sector_manager'
            || $collection !== 'orgNodes'
            || $before === null
            || $after === null) {
            return false;
        }

        $previousManagerId = trim((string) ($before['managerEmployeeId'] ?? ''));
        $nextManagerId = trim((string) ($after['managerEmployeeId'] ?? ''));
        if ($previousManagerId === '' || $nextManagerId !== '') {
            return false;
        }

        unset($before['managerEmployeeId'], $after['managerEmployeeId']);

        return $this->sameStateRecord($before, $after);
    }

    private function recordsById(mixed $value): array
    {
        if (! is_array($value) || ! array_is_list($value)) {
            return [];
        }
        $records = [];
        foreach ($value as $record) {
            if (is_array($record) && isset($record['id'])) {
                $records[(string) $record['id']] = $record;
            }
        }
        return $records;
    }

    private function allowsCollectionAction(array $actor, string $collection, string $action, mixed $record = null): bool
    {
        if (($actor['role'] ?? null) === 'sector_manager'
            && in_array($collection, ['employees', 'roles'], true)) {
            return true;
        }

        if (in_array($collection, ['products', 'sales', 'purchaseOrders', 'supplierRecords'], true)) {
            $owners = match ($collection) {
                'products' => [['stocks', 'products'], ['commerce', 'products']],
                'sales' => [['commerce', 'sales'], ['ventes', 'ventes']],
                'purchaseOrders' => [['commerce', 'purchases'], ['achats', 'achats']],
                'supplierRecords' => [['commerce', 'suppliers'], ['fournisseurs', 'fournisseurs']],
            };
            return $this->allowsAnyModuleAction($actor, $owners, $action);
        }
        if ($collection === 'activities' && is_array($record)) {
            $moduleLabel = mb_strtolower(trim((string) ($record['module'] ?? '')));
            $owners = match ($moduleLabel) {
                'commerce', 'gestion commerciale' => [['commerce', 'sales'], ['ventes', 'ventes']],
                'achats' => [['commerce', 'purchases'], ['achats', 'achats']],
                default => [],
            };
            return $this->allowsAnyModuleAction($actor, $owners, $action);
        }
        [$module, $feature] = self::COLLECTION_FEATURES[$collection] ?? [null, null];
        if (! $module || ! $feature) {
            return false;
        }
        if ($collection === 'movements' && is_array($record)) {
            $type = mb_strtoupper(trim((string) ($record['type'] ?? $record['movementType'] ?? '')));
            $features = match ($type) {
                'ENTRÉE', 'ACHAT', 'RETOUR CLIENT', 'AJUSTEMENT+' => ['entries'],
                'SORTIE', 'VENTE', 'AJUSTEMENT-', 'PERTE', 'RETOUR FOURNISSEUR' => ['exits'],
                'TRANSFERT' => ['entries', 'exits'],
                default => [],
            };
            if ($features === []) {
                return false;
            }
            foreach ($features as $movementFeature) {
                if (! ModuleAuthorization::allows($actor, $module, 'view', $movementFeature)
                    || ! ModuleAuthorization::allows($actor, $module, $action, $movementFeature)) {
                    return false;
                }
            }
            return true;
        }
        return ModuleAuthorization::allows($actor, $module, 'view', $feature)
            && ModuleAuthorization::allows($actor, $module, $action, $feature);
    }

    private function allowsAnyModuleAction(array $actor, array $owners, string $action): bool
    {
        foreach ($owners as [$module, $feature]) {
            if (ModuleAuthorization::allows($actor, $module, 'view', $feature)
                && ModuleAuthorization::allows($actor, $module, $action, $feature)) {
                return true;
            }
        }
        return false;
    }

    private function applyExplicitDeletes(array &$state, array $deleted, string $companyId): void
    {
        foreach ($deleted as $request) {
            $collection = is_array($request) ? (string) ($request['collection'] ?? '') : '';
            if (! isset(self::COLLECTION_FEATURES[$collection]) || ! isset($state[$collection]) || ! is_array($state[$collection])) {
                continue;
            }
            $ids = array_fill_keys(array_map('strval', (array) ($request['ids'] ?? [])), true);
            $state[$collection] = array_values(array_filter(
                $state[$collection],
                fn (mixed $record): bool => ! is_array($record)
                    || ! isset($ids[(string) ($record['id'] ?? '')])
                    || ! $this->belongsToCompany($record, $companyId, $collection),
            ));
        }
    }

    private function managerStateWriteWithinScope(
        array $current,
        array $incoming,
        string $companyId,
        array $actor,
        array $deleted = [],
    ): bool {
        $currentNodes = collect($current['orgNodes'] ?? [])
            ->filter(fn (mixed $item): bool => is_array($item) && ($item['companyId'] ?? null) === $companyId)
            ->values()
            ->all();
        // Derive the manager's scope from the persisted hierarchy only. A
        // submitted parent change or newly attached child must not expand it.
        $nodes = $currentNodes;
        $allowedNodes = array_fill_keys(
            RolePermissionAuthorization::managerScopeNodeIds($actor, $companyId, ['orgNodes' => $nodes]),
            true,
        );
        if ($allowedNodes === []) {
            return false;
        }

        $currentByCollection = [];
        foreach (array_keys(self::COLLECTION_PERMISSION_MODULES) as $collection) {
            $currentByCollection[$collection] = collect($current[$collection] ?? [])
                ->filter(fn (mixed $item): bool => is_array($item) && isset($item['id']))
                ->keyBy(fn (array $item): string => (string) $item['id'])
                ->all();
        }

        $authorizationState = $current;
        foreach (['companies', 'orgNodes', 'roles', 'employees'] as $stateCollection) {
            $records = $this->recordsById($current[$stateCollection] ?? []);
            foreach (($incoming[$stateCollection] ?? []) as $record) {
                if (is_array($record) && isset($record['id'])) {
                    $records[(string) $record['id']] = $record;
                }
            }
            $authorizationState[$stateCollection] = array_values($records);
        }
        $authorizationState['orgNodes'] = $currentNodes;

        foreach (array_keys(self::COLLECTION_PERMISSION_MODULES) as $collection) {
            foreach (($incoming[$collection] ?? []) as $item) {
                if (!is_array($item) || !isset($item['id'])) {
                    return false;
                }
                $id = (string) $item['id'];
                $existing = $currentByCollection[$collection][$id] ?? null;
                $recordCompanyId = $collection === 'companies'
                    ? $id
                    : ($item['companyId'] ?? $item['company_id'] ?? null);
                if ($this->sameStateRecord($existing, $item)) {
                    continue;
                }
                if (is_array($existing) && $collection !== 'companies') {
                    $existingCompanyId = $existing['companyId'] ?? $existing['company_id'] ?? null;
                    if ((string) $existingCompanyId !== $companyId) {
                        return false;
                    }
                }
                if ($collection !== 'companies' && (string) $recordCompanyId !== $companyId) {
                    return false;
                }

                $sectorId = $collection === 'orgNodes'
                    ? $id
                    : ($item['sectorId'] ?? $item['sector_id'] ?? null);
                $oldSectorId = $collection === 'orgNodes'
                    ? $id
                    : (is_array($existing)
                        ? ($existing['sectorId'] ?? $existing['sector_id'] ?? null)
                        : null);
                $newInside = $collection !== 'companies'
                    && isset($allowedNodes[(string) $sectorId]);
                $oldInside = $existing === null
                    || isset($allowedNodes[(string) $oldSectorId]);
                if (! $newInside || ! $oldInside) {
                    return false;
                }

                if ($collection === 'orgNodes' && is_array($existing)) {
                    foreach (['parentId', 'moduleIds', 'modulePackIds', 'moduleFeatures'] as $field) {
                        if (($existing[$field] ?? null) !== ($item[$field] ?? null)) {
                            return false;
                        }
                    }
                }

                if ($collection === 'roles') {
                    $oldPermissions = is_array($existing['modulePermissions'] ?? null)
                        ? $existing['modulePermissions']
                        : [];
                    $newPermissions = is_array($item['modulePermissions'] ?? null)
                        ? $item['modulePermissions']
                        : [];
                    $permissionsChanged = $existing === null
                        || $oldPermissions !== $newPermissions
                        || (string) ($existing['sectorId'] ?? $existing['sector_id'] ?? '') !== (string) $sectorId;
                    if ($permissionsChanged
                        && ! RolePermissionAuthorization::allowsForSector(
                            $authorizationState,
                            $companyId,
                            (string) $sectorId,
                            $newPermissions,
                        )) {
                        return false;
                    }
                }

                if ($collection === 'employees') {
                    $wasSectorManager = (bool) ($existing['isSectorAdmin'] ?? $existing['is_sector_admin'] ?? false);
                    $isSectorManager = (bool) ($item['isSectorAdmin'] ?? $item['is_sector_admin'] ?? false);
                    if ($isSectorManager && ! $wasSectorManager) {
                        return false;
                    }
                    $oldRoleId = (string) ($existing['roleId'] ?? $existing['role_id'] ?? '');
                    $roleId = (string) ($item['roleId'] ?? $item['role_id'] ?? '');
                    $roleAssignmentChanged = $existing === null
                        || $oldRoleId !== $roleId
                        || (string) ($existing['sectorId'] ?? $existing['sector_id'] ?? '') !== (string) $sectorId;
                    if ($roleAssignmentChanged) {
                        if (! RolePermissionAuthorization::roleMatchesEmployeeSector(
                            $authorizationState,
                            $companyId,
                            (string) $sectorId,
                            $roleId,
                        )) {
                            return false;
                        }

                        $assignedRole = null;
                        foreach (($authorizationState['roles'] ?? []) as $candidate) {
                            if (is_array($candidate) && (string) ($candidate['id'] ?? '') === $roleId) {
                                $assignedRole = $candidate;
                                break;
                            }
                        }
                        $rolePermissions = $assignedRole['modulePermissions']
                            ?? $assignedRole['module_permissions']
                            ?? null;
                        if (! is_array($rolePermissions)
                            || ! RolePermissionAuthorization::allowsForSector(
                                $authorizationState,
                                $companyId,
                                (string) $sectorId,
                                $rolePermissions,
                            )) {
                            return false;
                        }
                    }
                }
            }
        }

        foreach ($deleted as $request) {
            $collection = is_array($request) ? (string) ($request['collection'] ?? '') : '';
            if (! isset(self::COLLECTION_PERMISSION_MODULES[$collection]) || $collection === 'orgNodes') {
                return false;
            }
            foreach ((array) ($request['ids'] ?? []) as $id) {
                $record = $currentByCollection[$collection][(string) $id] ?? null;
                if (! is_array($record)) {
                    continue;
                }
                $recordCompanyId = $record['companyId'] ?? $record['company_id'] ?? null;
                if ($recordCompanyId !== null && (string) $recordCompanyId !== $companyId) {
                    return false;
                }
                $sectorId = $collection === 'orgNodes'
                    ? (string) $id
                    : (string) ($record['sectorId'] ?? $record['sector_id'] ?? '');
                if (! isset($allowedNodes[$sectorId])) {
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
                    'moduleNavigationMode' => $company->module_navigation_mode ?? 'menu',
                    'navigationCustomAllowed' => (bool) $company->navigation_custom_allowed,
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
        unset($state['companySetupPlans'], $state['catalogDraft']);

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

    /** UI visibility is not authorization: project business records on the server. */
    private function restrictBusinessReads(array $state, array $actor): array
    {
        if (($actor['role'] ?? null) === 'company_admin') {
            return $state;
        }

        foreach (self::EMPLOYEE_WRITABLE_COLLECTIONS as $collection) {
            if (! isset($state[$collection]) || ! is_array($state[$collection])) {
                continue;
            }
            $state[$collection] = array_values(array_filter(
                $state[$collection],
                fn (mixed $record): bool => is_array($record)
                    && $this->allowsCollectionAction($actor, $collection, 'view', $record),
            ));
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
            if (! $isCompanyScopedCollection || ! array_is_list($value)) {
                // Never recursively merge browser-controlled maps into shared state.
                continue;
            }
            if (!isset($current[$key]) || !is_array($current[$key])) {
                if (!$isCompanyScopedCollection) {
                    continue;
                }
                $current[$key] = [];
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
                // App-state is company-scoped, not a guaranteed full tenant
                // snapshot for every actor. Omission is therefore ambiguous;
                // explicit deletion intent is required before removing data.
                fn (mixed $item): bool => ! $this->belongsToCompany($item, $companyId, $key)
                    || (is_array($item) && !in_array($item['id'] ?? null, $ids, true)),
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