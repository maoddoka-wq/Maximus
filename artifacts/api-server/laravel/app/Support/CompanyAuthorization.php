<?php

namespace App\Support;

final class CompanyAuthorization
{
    public static function canManageAccount(array $actor, string $companyId, array $sectorIds): bool
    {
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

        return array_diff(array_values(array_unique($sectorIds)), $actor['sectorIds'] ?? []) === [];
    }

    public static function canAssignPermissions(array $actor, array $permissions): bool
    {
        if (in_array($actor['role'] ?? null, ['maximus_admin', 'company_admin'], true)) {
            return true;
        }

        if (($actor['role'] ?? null) !== 'sector_manager') {
            return false;
        }

        $allowed = $actor['permissions'] ?? [];
        if (! is_array($allowed)) {
            return false;
        }

        foreach ($permissions as $key => $values) {
            if (! is_string($key) || ! is_array($values)) {
                return false;
            }
            foreach ($values as $value) {
                if (! is_string($value) || ! in_array($value, $allowed[$key] ?? [], true)) {
                    return false;
                }
            }
        }

        return true;
    }
}
