<?php

namespace App\Support;

use App\Models\AuthUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class EmployeeRecordScope
{
    public static function forDemoRequest(Request $request, array $actor): ?array
    {
        if ($request->attributes->get('demoMode') !== true) {
            return null;
        }

        $companyId = (string) (
            $request->attributes->get('realCompanyId')
            ?: ($actor['companyId'] ?? '')
        );
        if ($companyId === '') {
            return [];
        }

        $scope = DemoWorkspace::stateScope($companyId);
        $row = DB::table('maximus_app_states')->where('scope', $scope)->first(['payload']);
        $payload = is_string($row?->payload) ? json_decode($row->payload, true) : ($row?->payload ?? []);
        $state = is_array($payload) ? $payload : [];

        return self::allowedEmployeeIds($actor, $companyId, $state);
    }

    /**
     * A null result means the actor has tenant-wide access; an empty list means
     * the actor has no employee records in scope.
     */
    public static function allowedEmployeeIds(array $actor, string $companyId, array $state): ?array
    {
        $role = $actor['role'] ?? null;
        if (in_array($role, ['company_admin', 'maximus_admin'], true)) {
            return null;
        }
        if ($role === 'employee') {
            $employeeId = trim((string) ($actor['employeeId'] ?? ''));

            return $employeeId === '' ? [] : [$employeeId];
        }
        if ($role !== 'sector_manager' || $companyId === '') {
            return [];
        }

        $workspaceRow = DB::table('maximus_app_states')->where('scope', 'workspace')->first(['payload']);
        $workspacePayload = is_string($workspaceRow?->payload)
            ? json_decode($workspaceRow->payload, true)
            : ($workspaceRow?->payload ?? []);
        $workspace = is_array($workspacePayload) ? $workspacePayload : [];
        $orgNodes = collect($workspace['orgNodes'] ?? [])
            ->concat($state['orgNodes'] ?? [])
            ->filter(fn (mixed $node): bool => is_array($node) && isset($node['id']))
            ->unique(fn (array $node): string => (string) $node['id'])
            ->values()
            ->all();
        $managedSectorIds = RolePermissionAuthorization::managerScopeNodeIds(
            $actor,
            $companyId,
            ['orgNodes' => $orgNodes],
        );
        if ($managedSectorIds === []) {
            return [];
        }

        return AuthUser::query()
            ->where('company_id', $companyId)
            ->where('status', 'ACTIF')
            ->whereNotNull('employee_id')
            ->get(['employee_id', 'sector_ids'])
            ->filter(function (AuthUser $user) use ($managedSectorIds): bool {
                $sectorIds = is_array($user->sector_ids) ? $user->sector_ids : [];

                return $sectorIds !== []
                    && array_diff($sectorIds, $managedSectorIds) === [];
            })
            ->pluck('employee_id')
            ->map(fn (mixed $employeeId): string => (string) $employeeId)
            ->unique()
            ->values()
            ->all();
    }
}
