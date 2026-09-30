<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

final class RolePermissionAuthorization
{
    private const ALLOWED_ACTIONS = ['voir', 'créer', 'modifier'];

    private const LEGACY_COMMERCE_FEATURES = [
        'commerce:menu:chiffre-d-affaires' => ['commerce', 'dashboard'],
        'commerce:menu:devis-et-commandes' => ['commerce', 'sales'],
        'ventes:menu:devis' => ['commerce', 'sales'],
        'ventes:menu:commandes' => ['commerce', 'sales'],
        'commerce:menu:clients' => ['commerce', 'clients'],
        'ventes:menu:facturation' => ['commerce', 'invoices'],
    ];

    public static function managerCanManageSectors(
        array $actor,
        string $companyId,
        array $targetSectorIds,
        array $state,
    ): bool {
        $allowed = array_fill_keys(self::managerScopeNodeIds($actor, $companyId, $state), true);
        $targetSectorIds = array_values(array_unique(array_map(
            static fn (mixed $id): string => trim((string) $id),
            $targetSectorIds,
        )));

        return $allowed !== []
            && $targetSectorIds !== []
            && ! in_array('', $targetSectorIds, true)
            && array_diff($targetSectorIds, array_keys($allowed)) === [];
    }

    public static function managerScopeNodeIds(array $actor, string $companyId, array $state): array
    {
        if (($actor['role'] ?? null) !== 'sector_manager'
            || (string) ($actor['companyId'] ?? '') !== $companyId
            || $companyId === '') {
            return [];
        }

        $nodes = self::companyNodes($state, $companyId);
        $allowed = [];
        foreach (($actor['sectorIds'] ?? []) as $rootId) {
            $rootId = trim((string) $rootId);
            if ($rootId !== '' && isset($nodes[$rootId])) {
                $allowed[$rootId] = true;
            }
        }
        if ($allowed === []) {
            return [];
        }

        do {
            $changed = false;
            foreach ($nodes as $id => $node) {
                if (isset($allowed[$id])) {
                    continue;
                }
                $parentId = trim((string) ($node['parentId'] ?? ''));
                if ($parentId !== '' && isset($allowed[$parentId])) {
                    $allowed[$id] = true;
                    $changed = true;
                }
            }
        } while ($changed);

        return array_keys($allowed);
    }

    public static function allowsForSector(
        array $state,
        string $companyId,
        string $sectorId,
        array $permissions,
    ): bool {
        if ($companyId === '' || $sectorId === '') {
            return false;
        }

        $ancestors = self::sectorAncestors($state, $companyId, $sectorId);
        if ($ancestors === null) {
            return false;
        }

        foreach ($permissions as $key => $grantedActions) {
            if (! is_string($key) || ! is_array($grantedActions)) {
                return false;
            }

            $descriptor = self::permissionDescriptor($key);
            if ($descriptor === null) {
                return false;
            }
            [$moduleId, $rawFeatureId] = $descriptor;

            try {
                $normalized = ModuleCatalog::normalizeSelection(
                    $moduleId,
                    [$rawFeatureId],
                    ['featureScope' => 'explicit'],
                );
            } catch (\InvalidArgumentException) {
                return false;
            }

            $featureId = $normalized['featureIds'][0] ?? null;
            if (! is_string($featureId)
                || ! ModuleCatalog::isEnabled($companyId, $moduleId)
                || ! ModuleCatalog::allowsFeature($companyId, $moduleId, $featureId)
                || ! self::unitAllowsFeature($ancestors, $moduleId, $featureId)) {
                return false;
            }

            $grantedActions = array_values(array_unique(array_map('strval', $grantedActions)));
            if ($grantedActions === []
                || array_diff($grantedActions, self::ALLOWED_ACTIONS) !== []) {
                return false;
            }

            $companyActions = self::companyAllowedActions($companyId, $moduleId, $featureId);
            if (array_diff($grantedActions, $companyActions) !== []) {
                return false;
            }
            if (in_array('créer', $grantedActions, true) && ! in_array('voir', $grantedActions, true)) {
                return false;
            }
            if (in_array('modifier', $grantedActions, true)
                && (! in_array('voir', $grantedActions, true) || ! in_array('créer', $grantedActions, true))) {
                return false;
            }
        }

        return true;
    }

    public static function roleMatchesEmployeeSector(
        array $state,
        string $companyId,
        string $employeeSectorId,
        string $roleId,
    ): bool {
        if ($companyId === '' || $employeeSectorId === '' || $roleId === '') {
            return false;
        }

        $role = null;
        foreach (($state['roles'] ?? []) as $candidate) {
            if (is_array($candidate) && (string) ($candidate['id'] ?? '') === $roleId) {
                $role = $candidate;
                break;
            }
        }
        if (! is_array($role)
            || (string) ($role['companyId'] ?? $role['company_id'] ?? '') !== $companyId) {
            return false;
        }

        $roleSectorId = trim((string) ($role['sectorId'] ?? $role['sector_id'] ?? ''));
        $nodes = self::companyNodes($state, $companyId);
        $visited = [];
        $currentId = $employeeSectorId;

        while ($currentId !== '') {
            if (isset($visited[$currentId]) || !isset($nodes[$currentId])) {
                return false;
            }
            if ($currentId === $roleSectorId) {
                return true;
            }
            $visited[$currentId] = true;
            $currentId = trim((string) ($nodes[$currentId]['parentId'] ?? ''));
        }

        return false;
    }

    private static function permissionDescriptor(string $key): ?array
    {
        if (isset(self::LEGACY_COMMERCE_FEATURES[$key])) {
            return self::LEGACY_COMMERCE_FEATURES[$key];
        }

        if (str_starts_with($key, 'stocks:')) {
            $featureId = substr($key, strlen('stocks:'));

            return $featureId !== '' ? ['stocks', $featureId] : null;
        }

        if (str_starts_with($key, 'presence.')) {
            $featureId = substr($key, strlen('presence.'));
            if (in_array($featureId, [
                'view', 'create', 'edit', 'delete', 'correct',
                'validate', 'manage', 'export', 'reports',
            ], true)) {
                return null;
            }

            return $featureId !== '' ? ['presences', $featureId] : null;
        }

        if (preg_match('/^([a-zA-Z0-9_-]+):menu:(.+)$/u', $key, $matches) === 1) {
            return [$matches[1], $matches[2]];
        }

        return null;
    }

    private static function companyAllowedActions(string $companyId, string $moduleId, string $featureId): array
    {
        $row = DB::table('maximus_company_modules')
            ->where('company_id', $companyId)
            ->where('module_id', $moduleId)
            ->first(['configuration']);
        if (! $row) {
            return [];
        }

        $configuration = is_string($row->configuration)
            ? json_decode($row->configuration, true)
            : ($row->configuration ?? []);
        if (! is_array($configuration)) {
            return [];
        }

        if (($configuration['featureScope'] ?? null) !== 'explicit') {
            return self::ALLOWED_ACTIONS;
        }

        $featurePermissions = $configuration['featurePermissions'] ?? [];
        if (! is_array($featurePermissions)) {
            return [];
        }

        $actions = $featurePermissions[$featureId] ?? ['voir'];
        if (! is_array($actions)) {
            return [];
        }

        return array_values(array_intersect(
            array_values(array_unique(array_map('strval', $actions))),
            self::ALLOWED_ACTIONS,
        ));
    }

    private static function unitAllowsFeature(array $ancestors, string $moduleId, string $featureId): bool
    {
        foreach ($ancestors as $node) {
            if (array_key_exists('moduleIds', $node)) {
                if (! is_array($node['moduleIds'])
                    || ! in_array($moduleId, array_map('strval', $node['moduleIds']), true)) {
                    return false;
                }
            }

            $moduleFeatures = $node['moduleFeatures'] ?? null;
            if (! is_array($moduleFeatures) || ! array_key_exists($moduleId, $moduleFeatures)) {
                continue;
            }
            if (! is_array($moduleFeatures[$moduleId])) {
                return false;
            }

            try {
                $normalized = ModuleCatalog::normalizeSelection(
                    $moduleId,
                    array_values(array_map('strval', $moduleFeatures[$moduleId])),
                    ['featureScope' => 'explicit'],
                );
            } catch (\InvalidArgumentException) {
                return false;
            }
            if (! in_array($featureId, $normalized['featureIds'], true)) {
                return false;
            }
        }

        return true;
    }

    private static function sectorAncestors(array $state, string $companyId, string $sectorId): ?array
    {
        $nodes = self::companyNodes($state, $companyId);
        $ancestors = [];
        $visited = [];
        $currentId = $sectorId;

        while ($currentId !== '') {
            if (isset($visited[$currentId]) || !isset($nodes[$currentId])) {
                return null;
            }
            $visited[$currentId] = true;
            $node = $nodes[$currentId];
            $ancestors[] = $node;
            $currentId = trim((string) ($node['parentId'] ?? ''));
        }

        return $ancestors;
    }

    private static function companyNodes(array $state, string $companyId): array
    {
        $nodes = [];
        foreach (($state['orgNodes'] ?? []) as $node) {
            if (! is_array($node) || (string) ($node['companyId'] ?? $node['company_id'] ?? '') !== $companyId) {
                continue;
            }
            $id = trim((string) ($node['id'] ?? ''));
            if ($id !== '') {
                $nodes[$id] = $node;
            }
        }

        return $nodes;
    }
}