<?php

namespace App\Support;

final class UnitModuleScope
{
    public static function allowsModule(array $state, array $actor, string $module): bool
    {
        $companyId = trim((string) ($actor['companyId'] ?? ''));
        if ($companyId === '') {
            return true;
        }

        $companyNodes = [];
        foreach (($state['orgNodes'] ?? []) as $node) {
            if (! is_array($node) || (string) ($node['companyId'] ?? '') !== $companyId) {
                continue;
            }
            $nodeId = trim((string) ($node['id'] ?? ''));
            if ($nodeId !== '') {
                $companyNodes[$nodeId] = $node;
            }
        }

        // Companies that predate the organizational structure keep their
        // existing role permissions until they have unit records to enforce.
        if ($companyNodes === []) {
            return true;
        }

        $employeeId = trim((string) ($actor['employeeId'] ?? ''));
        $sectorId = '';
        foreach (($state['employees'] ?? []) as $employee) {
            if (is_array($employee)
                && (string) ($employee['id'] ?? '') === $employeeId
                && (string) ($employee['companyId'] ?? '') === $companyId) {
                $sectorId = trim((string) ($employee['sectorId'] ?? ''));
                break;
            }
        }

        if ($sectorId === '' || ! isset($companyNodes[$sectorId])) {
            foreach (($actor['sectorIds'] ?? []) as $candidate) {
                $candidate = trim((string) $candidate);
                if ($candidate !== '' && isset($companyNodes[$candidate])) {
                    $sectorId = $candidate;
                    break;
                }
            }
        }

        if ($sectorId === '' || ! isset($companyNodes[$sectorId])) {
            return false;
        }

        $visited = [];
        while ($sectorId !== '') {
            if (isset($visited[$sectorId]) || ! isset($companyNodes[$sectorId])) {
                return false;
            }
            $visited[$sectorId] = true;
            $node = $companyNodes[$sectorId];

            if (array_key_exists('moduleIds', $node)) {
                if (! is_array($node['moduleIds'])) {
                    return false;
                }
                $allowedModuleIds = array_map('strval', $node['moduleIds']);
                if (! in_array($module, $allowedModuleIds, true)) {
                    return false;
                }
            }

            $sectorId = trim((string) ($node['parentId'] ?? ''));
        }

        return true;
    }
}