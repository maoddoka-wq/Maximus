<?php

namespace App\Support;

final class ControlAuthorization
{
    public static function isValid(array $actor): bool
    {
        if (($actor['role'] ?? null) === 'maximus_admin') {
            return true;
        }

        if (empty($actor['companyId'])) {
            return false;
        }

        if (($actor['role'] ?? null) === 'employee') {
            return !empty($actor['employeeId']);
        }

        if (($actor['role'] ?? null) === 'sector_manager') {
            return count($actor['sectorIds'] ?? []) > 0;
        }

        return true;
    }

    public static function canRead(array $actor, ?string $companyId = null, ?array $task = null): bool
    {
        if (!self::isValid($actor)) {
            return false;
        }

        if (($actor['role'] ?? null) === 'maximus_admin') {
            return true;
        }

        if (!$companyId || empty($actor['companyId']) || $actor['companyId'] !== $companyId) {
            return false;
        }

        if (!$task) {
            return true;
        }

        if (($task['companyId'] ?? null) !== $actor['companyId']) {
            return false;
        }

        return match ($actor['role'] ?? null) {
            'company_admin' => true,
            'sector_manager' => !empty($task['sectorId']) && in_array($task['sectorId'], $actor['sectorIds'] ?? [], true),
            default => ($task['assigneeEmployeeId'] ?? null) === ($actor['employeeId'] ?? null),
        };
    }

    public static function canCreate(array $actor, array $input): bool
    {
        if (($actor['role'] ?? null) === 'maximus_admin') {
            return true;
        }

        if (!self::canRead($actor, $input['companyId'] ?? null)) {
            return false;
        }

        if (($actor['role'] ?? null) === 'company_admin') {
            return true;
        }

        return ($actor['role'] ?? null) === 'sector_manager'
            && !empty($input['sectorId'])
            && in_array($input['sectorId'], $actor['sectorIds'] ?? [], true);
    }

    public static function canUpdate(array $actor, array $task): bool
    {
        return self::canRead($actor, $task['companyId'] ?? null, $task);
    }
}