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
}
