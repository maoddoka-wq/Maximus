<?php

namespace App\Support;

final class ControlAuthorization
{
    private const PERMISSION_KEY = 'controle';

    private static function permissions(array $actor): array
    {
        $permissions = $actor['permissions'] ?? [];
        return is_array($permissions) && is_array($permissions[self::PERMISSION_KEY] ?? null)
            ? $permissions[self::PERMISSION_KEY]
            : [];
    }

    private static function isBypass(array $actor): bool
    {
        return in_array($actor['role'] ?? null, ['maximus_admin', 'company_admin'], true);
    }

    private static function allowsCrud(array $actor, string $action): bool
    {
        if (self::isBypass($actor)) {
            return true;
        }
        $permissions = self::permissions($actor);
        if ($action === 'view') {
            return in_array('voir', $permissions, true);
        }
        if ($action === 'create') {
            return in_array('voir', $permissions, true)
                && in_array('créer', $permissions, true);
        }

        return in_array('voir', $permissions, true)
            && in_array('créer', $permissions, true)
            && in_array('modifier', $permissions, true);
    }

    public static function isValid(array $actor): bool
    {
        if (($actor['role'] ?? null) === 'maximus_admin') {
            return true;
        }

        if (empty($actor['companyId'])) {
            return false;
        }

        if (($actor['role'] ?? null) === 'employee') {
            return ! empty($actor['employeeId']);
        }

        if (($actor['role'] ?? null) === 'sector_manager') {
            return count($actor['sectorIds'] ?? []) > 0;
        }

        return ($actor['role'] ?? null) === 'company_admin';
    }

    public static function canRead(array $actor, ?string $companyId = null, ?array $task = null): bool
    {
        if (! self::isValid($actor)) {
            return false;
        }

        if (($actor['role'] ?? null) !== 'employee' && ! self::allowsCrud($actor, 'view')) {
            return false;
        }

        if (($actor['role'] ?? null) === 'maximus_admin') {
            return true;
        }

        if (! $companyId || empty($actor['companyId']) || $actor['companyId'] !== $companyId) {
            return false;
        }

        if (! $task) {
            return true;
        }

        if (($task['companyId'] ?? null) !== $actor['companyId']) {
            return false;
        }

        return match ($actor['role'] ?? null) {
            'company_admin' => true,
            'sector_manager' => ! empty($task['sectorId']) && in_array($task['sectorId'], $actor['sectorIds'] ?? [], true),
            default => ($task['assigneeEmployeeId'] ?? null) === ($actor['employeeId'] ?? null),
        };
    }

    public static function canCreate(array $actor, array $input): bool
    {
        if (($actor['role'] ?? null) === 'maximus_admin') {
            return true;
        }

        if (! self::allowsCrud($actor, 'create')
            || ! self::canRead($actor, $input['companyId'] ?? null)) {
            return false;
        }

        if (($actor['role'] ?? null) === 'company_admin') {
            return true;
        }

        return ($actor['role'] ?? null) === 'sector_manager'
            && ! empty($input['sectorId'])
            && in_array($input['sectorId'], $actor['sectorIds'] ?? [], true);
    }

    public static function canUpdate(array $actor, array $task): bool
    {
        if (($actor['role'] ?? null) === 'employee') {
            return self::canRead($actor, $task['companyId'] ?? null, $task);
        }

        return self::allowsCrud($actor, 'update')
            && self::canRead($actor, $task['companyId'] ?? null, $task);
    }
}
