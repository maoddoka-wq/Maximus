<?php

namespace App\Support;

final class CompanyAuthorization
{
    public static function canManageAccount(
        array $actor,
        string $companyId,
        array $sectorIds,
        ?array $workspaceState = null,
    ): bool {
        if (($actor['role'] ?? null) === 'maximus_admin') {
            return true;
        }

        if (($actor['companyId'] ?? null) !== $companyId) {
            return false;
        }

        if (($actor['role'] ?? null) === 'company_admin') {
            return true;
        }

        if (($actor['role'] ?? null) !== 'sector_manager' || $sectorIds === []) {
            return false;
        }

        if ($workspaceState !== null) {
            return RolePermissionAuthorization::managerCanManageSectors(
                $actor,
                $companyId,
                $sectorIds,
                $workspaceState,
            );
        }

        return array_diff(array_values(array_unique($sectorIds)), $actor['sectorIds'] ?? []) === [];
    }

    public static function canAssignPermissions(
        array $actor,
        array $permissions,
        ?array $workspaceState = null,
        ?string $sectorId = null,
    ): bool {
        if (in_array($actor['role'] ?? null, ['maximus_admin', 'company_admin'], true)) {
            return true;
        }

        if (($actor['role'] ?? null) !== 'sector_manager'
            || $workspaceState === null
            || $sectorId === null
            || $sectorId === '') {
            return false;
        }

        return RolePermissionAuthorization::allowsForSector(
            $workspaceState,
            (string) ($actor['companyId'] ?? ''),
            $sectorId,
            $permissions,
        );
    }
}
