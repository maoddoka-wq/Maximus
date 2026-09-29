<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

final class ModuleAuthorization
{
    private const UNIT_SCOPE_STATE_ATTRIBUTE = 'maximus.unit-module-scope-state';

    private const PAYROLL_FEATURE_ALIASES = [
        'tableau-de-bord' => ['tableau-de-bord', 'dashboard'],
        'bénéficiaires' => ['bénéficiaires', 'beneficiaires'],
        'préparer-une-paie' => ['préparer-une-paie', 'preparation'],
        'validation' => ['validation'],
        'virements' => ['virements'],
        'solde-de-paie' => ['solde-de-paie', 'solde-paie', 'solde'],
        'historique' => ['historique'],
    ];

    private const STOCK_FEATURE_KEYS = [
        'dashboard',
        'products',
        'entries',
        'exits',
        'requests',
        'inventory',
        'reports',
        'references',
        'users',
        'settings',
    ];

    public static function allows(
        array $actor,
        string $module,
        string $action,
        ?string $feature = null,
    ): bool {
        if (($actor['role'] ?? null) === 'maximus_admin') {
            return true;
        }

        $companyId = (string) ($actor['companyId'] ?? '');
        if ($companyId === '' || ! ModuleCatalog::isEnabled($companyId, $module)) {
            return false;
        }
        // Store settings are the administrative control plane for the module:
        // an owner must still be able to publish or repair the store while
        // optional business features such as Location are disabled.
        if ($feature !== null && ! in_array($feature, ['settings', 'parametres'], true) && ! ModuleCatalog::allowsFeature($companyId, $module, $feature)) {
            return false;
        }
        if (($actor['role'] ?? null) === 'company_admin') {
            return true;
        }

        if (! UnitModuleScope::allowsModule(self::workspaceState(), $actor, $module)) {
            return false;
        }

        $permissions = $actor['permissions'] ?? null;
        if (! is_array($permissions)) {
            return false;
        }

        if ($module === 'stocks') {
            return self::allowsStock($permissions, $action, $feature);
        }

        if ($module === 'presences') {
            if (($actor['role'] ?? null) === 'employee'
                && $feature === 'horaires'
                && $action !== 'view') {
                return false;
            }
            if (($actor['role'] ?? null) === 'employee'
                && in_array($action, ['validate', 'manage'], true)) {
                return false;
            }
            return self::allowsPresence($permissions, $action, $feature);
        }

        if ($module === 'ecommerce') {
            return self::allowsEcommerce($permissions, $action, $feature);
        }

        return self::allowsGeneric($permissions, $module, $action, $feature);
    }

    public static function allowsPresenceClock(array $actor, string $employeeId, ?array $employeeSectorIds = null): bool
    {
        if (($actor['role'] ?? null) === 'employee'
            && ($actor['employeeId'] ?? null) !== $employeeId) {
            return false;
        }

        if (($actor['role'] ?? null) === 'sector_manager'
            && ($employeeSectorIds === null
                || $employeeSectorIds === []
                || array_diff($employeeSectorIds, $actor['sectorIds'] ?? []) !== [])) {
            return false;
        }

        return self::allows($actor, 'presences', 'create', 'pointage');
    }

    public static function allowsPresenceQr(array $actor): bool
    {
        if (! in_array($actor['role'] ?? null, ['maximus_admin', 'company_admin', 'sector_manager'], true)) {
            return false;
        }

        return self::allows($actor, 'presences', 'create', 'pointage');
    }

    public static function canViewModule(array $actor, string $module): bool
    {
        return self::allows($actor, $module, 'view');
    }

    private static function allowsStock(array $permissions, string $action, ?string $feature): bool
    {
        $detailedKeys = array_filter(
            array_keys($permissions),
            fn (string $key): bool => str_starts_with($key, 'stocks:'),
        );

        if ($feature && in_array($feature, self::STOCK_FEATURE_KEYS, true) && $detailedKeys !== []) {
            return self::allowsFeatureCrud($permissions['stocks:'.$feature] ?? [], $action, $feature);
        }

        if ($detailedKeys !== []) {
            return $action === 'view' && collect($detailedKeys)
                ->contains(fn (string $key): bool => self::contains($permissions[$key] ?? [], 'voir'));
        }

        return self::allowsFeatureCrud($permissions['stocks'] ?? [], $action, $feature);
    }

    private static function allowsPresence(array $permissions, string $action, ?string $feature = null): bool
    {
        $explicitKey = 'presence.'.$action;
        $explicitActionNames = ['view', 'create', 'edit', 'delete', 'correct', 'validate', 'manage', 'export', 'reports'];
        $hasExplicitActions = collect($explicitActionNames)
            ->contains(fn (string $name): bool => array_key_exists('presence.'.$name, $permissions));
        $featureKeys = array_filter(
            array_keys($permissions),
            fn (string $key): bool => str_starts_with($key, 'presence.')
                && ! in_array(substr($key, strlen('presence.')), [
                    'view',
                    'create',
                    'edit',
                    'delete',
                    'correct',
                    'validate',
                    'manage',
                    'export',
                    'reports',
                ], true),
        );

        if ($feature !== null && array_key_exists('presence.'.$feature, $permissions)) {
            if (! self::allowsFeatureCrud($permissions['presence.'.$feature], $action, $feature)) {
                return false;
            }

            return ! $hasExplicitActions || self::allowsExplicitPresenceAction($permissions, $action);
        }

        // A feature-specific request must not inherit another feature's
        // generic permissions. Explicit operational rights remain scoped to
        // their action and still have to satisfy the CRUD ladder.
        if ($feature !== null && $featureKeys !== []) {
            return $hasExplicitActions
                && self::allowsExplicitPresenceAction($permissions, $action);
        }

        if ($hasExplicitActions) {
            return self::allowsExplicitPresenceAction($permissions, $action);
        }

        if ($feature === null && $featureKeys !== []) {
            return collect($featureKeys)->contains(
                fn (string $key): bool => self::allowsFeatureCrud($permissions[$key] ?? [], $action, null),
            );
        }

        return self::allowsCrud($permissions['presences'] ?? [], $action);
    }

    private static function allowsEcommerce(array $permissions, string $action, ?string $feature): bool
    {
        $required = self::stockAction($action);
        $detailedKeys = array_filter(
            array_keys($permissions),
            fn (string $key): bool => str_starts_with($key, 'ecommerce:menu:'),
        );

        if ($feature && $detailedKeys !== []) {
            return self::allowsFeatureCrud($permissions['ecommerce:menu:'.$feature] ?? [], $action, $feature);
        }

        if ($detailedKeys !== []) {
            return $action === 'view' && collect($detailedKeys)
                ->contains(fn (string $key): bool => self::contains($permissions[$key] ?? [], 'voir'));
        }

        return self::allowsFeatureCrud($permissions['ecommerce'] ?? [], $action, $feature);
    }

    private static function allowsGeneric(array $permissions, string $module, string $action, ?string $feature): bool
    {
        $prefix = $module.':menu:';
        $detailed = array_filter(array_keys($permissions), fn (string $key): bool => str_starts_with($key, $prefix));
        if ($feature && $detailed !== []) {
            $featureKeys = $module === 'paie'
                ? (self::PAYROLL_FEATURE_ALIASES[$feature] ?? [$feature])
                : [$feature];

            return collect($featureKeys)
                ->contains(fn (string $featureKey): bool => self::allowsFeatureCrud($permissions[$prefix.$featureKey] ?? [], $action, $feature));
        }
        if ($detailed !== []) {
            return $action === 'view' && collect($detailed)->contains(fn (string $key): bool => self::contains($permissions[$key] ?? [], 'voir'));
        }

        return self::allowsFeatureCrud($permissions[$module] ?? [], $action, $feature);
    }

    private static function stockAction(string $action): string
    {
        return match ($action) {
            'view', 'read', 'export', 'reports', 'download' => 'voir',
            'create', 'insert', 'store', 'add' => 'créer',
            default => 'modifier',
        };
    }

    private static function allowsCrud(mixed $permissions, string $action): bool
    {
        $required = self::stockAction($action);
        if ($required === 'voir') {
            return self::contains($permissions, 'voir');
        }
        if (! self::contains($permissions, 'voir') || ! self::contains($permissions, 'créer')) {
            return false;
        }

        return $required === 'créer' || self::contains($permissions, 'modifier');
    }

    private static function allowsFeatureCrud(mixed $permissions, string $action, ?string $feature): bool
    {
        return self::allowsCrud($permissions, $action);
    }

    private static function allowsExplicitPresenceAction(array $permissions, string $action): bool
    {
        if (! self::contains($permissions['presence.'.$action] ?? [], 'allowed')) {
            return false;
        }
        $required = self::stockAction($action);
        if ($required === 'voir') {
            return self::contains($permissions['presence.view'] ?? [], 'allowed');
        }
        return self::allowsExplicitPresenceCrud(
            $permissions,
            $required === 'créer' ? 'create' : 'modify',
        );
    }

    private static function allowsExplicitPresenceCrud(array $permissions, string $action): bool
    {
        if (! self::contains($permissions['presence.view'] ?? [], 'allowed')
            || ! self::contains($permissions['presence.create'] ?? [], 'allowed')) {
            return false;
        }

        return $action === 'create'
            || self::contains($permissions['presence.edit'] ?? [], 'allowed');
    }

    private static function contains(mixed $permissions, string $required): bool
    {
        if (! is_array($permissions)) {
            return false;
        }

        return $required === 'allowed'
            ? $permissions !== []
            : in_array($required, $permissions, true);
    }

    private static function workspaceState(): array
    {
        $request = app()->bound('request') ? app('request') : null;
        if ($request && $request->attributes->has(self::UNIT_SCOPE_STATE_ATTRIBUTE)) {
            return $request->attributes->get(self::UNIT_SCOPE_STATE_ATTRIBUTE);
        }

        $row = DB::table('maximus_app_states')->where('scope', 'workspace')->first(['payload']);
        $payload = $row?->payload;
        $state = is_string($payload)
            ? json_decode($payload, true, 512, JSON_THROW_ON_ERROR)
            : ($payload ?? []);
        $state = is_array($state) ? $state : [];

        if ($request) {
            $request->attributes->set(self::UNIT_SCOPE_STATE_ATTRIBUTE, $state);
        }

        return $state;
    }
}
