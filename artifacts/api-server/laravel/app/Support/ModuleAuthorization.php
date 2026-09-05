<?php

namespace App\Support;

final class ModuleAuthorization
{
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
        if (in_array($actor['role'] ?? null, ['maximus_admin', 'company_admin'], true)) {
            return true;
        }

        $permissions = $actor['permissions'] ?? null;
        if (! is_array($permissions)) {
            return false;
        }

        if ($module === 'stocks') {
            return self::allowsStock($permissions, $action, $feature);
        }

        if ($module === 'presences') {
            return self::allowsPresence($permissions, $action);
        }

        return false;
    }

    public static function allowsPresenceClock(array $actor, string $employeeId): bool
    {
        if (($actor['role'] ?? null) === 'employee'
            && ($actor['employeeId'] ?? null) !== $employeeId) {
            return false;
        }

        return self::allows($actor, 'presences', 'create');
    }

    public static function canViewModule(array $actor, string $module): bool
    {
        return self::allows($actor, $module, 'view');
    }

    private static function allowsStock(array $permissions, string $action, ?string $feature): bool
    {
        $required = self::stockAction($action);
        $detailedKeys = array_filter(
            array_keys($permissions),
            fn (string $key): bool => str_starts_with($key, 'stocks:'),
        );

        if ($feature && in_array($feature, self::STOCK_FEATURE_KEYS, true) && $detailedKeys !== []) {
            return self::contains($permissions['stocks:'.$feature] ?? [], $required);
        }

        if ($detailedKeys !== []) {
            return $action === 'view' && collect($detailedKeys)
                ->contains(fn (string $key): bool => self::contains($permissions[$key] ?? [], 'voir'));
        }

        return self::contains($permissions['stocks'] ?? [], $required);
    }

    private static function allowsPresence(array $permissions, string $action): bool
    {
        $explicitKey = 'presence.'.$action;
        $hasExplicitActions = array_key_exists($explicitKey, $permissions)
            || count(array_filter(
                array_keys($permissions),
                fn (string $key): bool => str_starts_with($key, 'presence.'),
            )) > 0;

        if ($hasExplicitActions) {
            if (array_key_exists($explicitKey, $permissions)) {
                return self::contains($permissions[$explicitKey], 'allowed');
            }

            $required = self::stockAction($action);

            return collect(array_filter(
                array_keys($permissions),
                fn (string $key): bool => str_starts_with($key, 'presence.'),
            ))->contains(fn (string $key): bool => self::contains($permissions[$key] ?? [], $required));
        }

        return self::contains($permissions['presences'] ?? [], self::stockAction($action));
    }

    private static function stockAction(string $action): string
    {
        return match ($action) {
            'view' => 'voir',
            'create' => 'créer',
            'modify', 'edit', 'correct', 'delete', 'manage', 'validate', 'export', 'reports' => 'modifier',
            default => $action,
        };
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
}
