<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthUser;
use App\Models\Company;
use App\Support\ModuleCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AppStateController extends Controller
{
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
            $state = $this->recoverStateFromAccounts();
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

        if (($actor['role'] ?? null) !== 'maximus_admin') {
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
                    'allowedModules' => $company->status === 'ACTIF' ? ($company->requested_modules ?? []) : [],
                    'refusedModules' => [],
                    'createdAt' => optional($company->created_at)->toISOString(),
                    'profilePhoto' => $company->profile_photo,
                    'primaryColor' => $company->primary_color,
                    'accentColor' => $company->accent_color,
                    'sidebarColor' => $company->sidebar_color,
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
                'phone' => '',
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

        $current = DB::table('maximus_app_states')->where('scope', 'workspace')->first();
        $currentPayload = is_string($current?->payload)
            ? json_decode($current->payload, true)
            : ($current?->payload ?? []);
        $currentPayload = is_array($currentPayload) ? $currentPayload : [];

        $incomingState = $this->stripCredentials($data['data']);
        if (($actor['role'] ?? null) !== 'maximus_admin') {
            if (!in_array($actor['role'] ?? null, ['company_admin', 'sector_manager'], true)) {
                return response()->json(['error' => 'Cet acteur ne peut pas enregistrer l’état métier global.'], 403);
            }

            $companyId = (string) ($actor['companyId'] ?? '');
            if ($companyId === '') {
                return response()->json(['error' => 'Aucune entreprise associée à cet acteur.'], 403);
            }

            $currentPayload = $this->mergeCompanyState($currentPayload, $incomingState, $companyId);
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

        foreach ([
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
            'payments',
            'activities',
            'purchaseOrders',
            'supplierRecords',
            'deliveries',
            'businessDocuments',
            'accountingEntries',
            'payrollSlips',
            'crmOpportunities',
        ] as $key) {
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

    /**
     * Keep shared catalog settings while limiting business records to the actor's company.
     */
    private function restrictToCompany(array $state, string $companyId): array
    {
        if ($companyId === '') {
            return [];
        }

        foreach ([
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
            'payments',
            'activities',
            'purchaseOrders',
            'supplierRecords',
        ] as $key) {
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

    private function mergeCompanyState(array $current, array $incoming, string $companyId): array
    {
        foreach ($incoming as $key => $value) {
            if (!is_array($value) || !isset($current[$key]) || !is_array($current[$key])) {
                continue;
            }

            if ($key === 'commerceStates') {
                if (array_key_exists($companyId, $value)) {
                    $current[$key][$companyId] = $value[$companyId];
                }
                continue;
            }

            if (!array_is_list($value)) {
                $current[$key] = array_replace_recursive($current[$key], $value);
                continue;
            }

            $existing = collect($current[$key]);
            $incomingCompanyRecords = collect($value)->filter(
                fn (mixed $item): bool => $this->belongsToCompany($item, $companyId, $key),
            );
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