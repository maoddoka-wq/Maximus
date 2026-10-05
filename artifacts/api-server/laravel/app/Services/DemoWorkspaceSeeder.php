<?php

namespace App\Services;

use App\Models\AuthUser;
use App\Support\DemoWorkspace;
use App\Support\ModuleCatalog;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class DemoWorkspaceSeeder
{
    public function seed(string $companyId): void
    {
        $datasetCompanyId = DemoWorkspace::datasetCompanyId($companyId);
        $now = now();
        $ids = fn (string $name): string => 'demo-'.substr(hash('sha256', $companyId), 0, 16).'-'.$name;

        $this->seedAppState($companyId, $ids, $now, $this->firstCompanyOrganizationUnitId($companyId));
        $this->seedControl($datasetCompanyId, $ids, $now);
        $this->seedPresence($datasetCompanyId, $ids, $now);
        $this->seedStock($datasetCompanyId, $ids, $now);
        $this->seedEcommerce($datasetCompanyId, $ids, $now);
        $this->seedPayroll($datasetCompanyId, $ids, $now);
        $this->seedTransport($datasetCompanyId, $ids, $now);
        $this->seedImmobilier($datasetCompanyId, $ids, $now);
    }

    /**
     * Add demo-only records for existing employee accounts without changing
     * authentication data or resetting fixtures the company has already edited.
     */
    public function seedExistingEmployeeAccounts(string $companyId): void
    {
        $datasetCompanyId = DemoWorkspace::datasetCompanyId($companyId);
        $ids = fn (string $name): string => 'demo-'.substr(hash('sha256', $companyId), 0, 16).'-'.$name;
        $workspacePayload = DB::table('maximus_app_states')->where('scope', 'workspace')->value('payload');
        $workspaceState = is_string($workspacePayload)
            ? json_decode($workspacePayload, true)
            : ($workspacePayload ?? []);
        $workspaceState = is_array($workspaceState) ? $workspaceState : [];
        $workspaceNodes = is_array($workspaceState['orgNodes'] ?? null)
            ? $workspaceState['orgNodes']
            : [];
        $organizationNodes = [];
        foreach ($workspaceNodes as $node) {
            if (! is_array($node)
                || (string) ($node['companyId'] ?? $node['company_id'] ?? '') !== $companyId) {
                continue;
            }

            $nodeId = trim((string) ($node['id'] ?? ''));
            if ($nodeId !== '') {
                $node['companyId'] = $companyId;
                $organizationNodes[$nodeId] = $node;
            }
        }
        $organizationEmployees = [];
        foreach (is_array($workspaceState['employees'] ?? null) ? $workspaceState['employees'] : [] as $employee) {
            if (! is_array($employee)
                || (string) ($employee['companyId'] ?? $employee['company_id'] ?? '') !== $companyId) {
                continue;
            }

            $employeeId = trim((string) ($employee['id'] ?? ''));
            if ($employeeId !== '') {
                $organizationEmployees[$employeeId] = $employee;
            }
        }
        $now = now();
        $this->syncDemoOrganizationNodes($companyId, array_values($organizationNodes), $now);

        $users = AuthUser::query()
            ->where('company_id', $companyId)
            ->whereIn('role', ['employee', 'sector_manager'])
            ->where('status', 'ACTIF')
            ->whereNotNull('employee_id')
            ->orderBy('created_at')
            ->get();

        foreach ($users as $user) {
            $employeeId = trim((string) $user->employee_id);
            if ($employeeId === '') {
                continue;
            }

            $linkScope = DemoWorkspace::employeeScope($companyId, $employeeId);
            $linkRow = DB::table('maximus_app_states')
                ->where('scope', $linkScope)
                ->first(['payload', 'version', 'created_at']);
            $linkPayload = is_string($linkRow?->payload)
                ? json_decode($linkRow->payload, true)
                : ($linkRow?->payload ?? []);
            $linkPayload = is_array($linkPayload) ? $linkPayload : [];

            $fingerprint = substr(hash('sha256', $employeeId), 0, 12);
            $accountIds = fn (string $name): string => $ids('account-'.$fingerprint.'-'.$name);
            $now = now();
            $displayName = trim((string) $user->display_name);
            if ($displayName === '') {
                $displayName = 'Employé de démonstration';
            }
            $sectorIds = array_values(array_unique(array_filter(
                is_array($user->sector_ids) ? $user->sector_ids : [],
                static fn (mixed $sectorId): bool => is_string($sectorId) && trim($sectorId) !== '',
            )));
            $sectorIds = array_values(array_filter(
                $sectorIds,
                static fn (string $sectorId): bool => isset($organizationNodes[$sectorId]),
            ));
            $organizationEmployee = $organizationEmployees[$employeeId] ?? [];
            $organizationSectorId = trim((string) ($organizationEmployee['sectorId'] ?? $organizationEmployee['sector_id'] ?? ''));
            $sectorId = $organizationSectorId !== '' && in_array($organizationSectorId, $sectorIds, true)
                ? $organizationSectorId
                : ($sectorIds[0] ?? null);

            $this->addEmployeeToDemoAppState(
                $companyId,
                $user,
                $employeeId,
                $displayName,
                $sectorId,
                $accountIds,
                $now,
            );
            $this->seedEmployeePresence($datasetCompanyId, $employeeId, $displayName, $accountIds, $now);
            $this->seedEmployeeControlTask($datasetCompanyId, $employeeId, $displayName, $sectorId, $accountIds, $now);
            $this->seedEmployeeTransport($datasetCompanyId, $employeeId, $displayName, $accountIds, $now);
            $this->seedEmployeePayroll($datasetCompanyId, $employeeId, $displayName, $accountIds, $now);

            // The employee scope is an initialization marker, not a reason to
            // skip seeding: insertOrIgnore and appendStateRecord backfill
            // missing fixtures without overwriting employee edits.
            $linkPayload['initialized'] = true;
            unset($linkPayload['unitAccessVersion']);
            DB::table('maximus_app_states')->updateOrInsert(
                ['scope' => $linkScope],
                [
                    'company_id' => $companyId,
                    'payload' => json_encode($linkPayload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                    'version' => max(1, (int) ($linkRow?->version ?? 0)),
                    'created_at' => $linkRow?->created_at ?? $now,
                    'updated_at' => $now,
                ],
            );
        }
    }

    private function addEmployeeToDemoAppState(
        string $companyId,
        AuthUser $user,
        string $employeeId,
        string $displayName,
        ?string $sectorId,
        callable $ids,
        mixed $now,
    ): void {
        $scope = DemoWorkspace::stateScope($companyId);
        $row = DB::table('maximus_app_states')->where('scope', $scope)->lockForUpdate()->first();
        if (! $row) {
            throw new \RuntimeException('DEMO_APP_STATE_NOT_INITIALIZED');
        }

        $payload = is_string($row->payload) ? json_decode($row->payload, true) : ($row->payload ?? []);
        $state = is_array($payload) ? $payload : [];
        $roleId = $ids('role');
        $parts = preg_split('/\s+/', $displayName, 2) ?: [];
        $this->appendStateRecord($state, 'employees', [
            'id' => $employeeId,
            'firstName' => $parts[0] ?? 'Employé',
            'lastName' => $parts[1] ?? 'MAXIMUS',
            'email' => (string) $user->email,
            'phone' => (string) ($user->phone ?? ''),
            'position' => ($user->role ?? '') === 'sector_manager' ? 'Responsable de secteur' : 'Employé',
            'department' => 'Opérations',
            'subDepartment' => 'Démonstration',
            'role' => (string) $user->role,
            'status' => 'ACTIF',
            'companyId' => $companyId,
            'sectorId' => $sectorId,
            'roleId' => $roleId,
            'isSectorAdmin' => $user->role === 'sector_manager',
        ]);
        $this->appendStateRecord($state, 'roles', [
            'id' => $roleId,
            'name' => 'Rôle de démonstration — '.$displayName,
            'description' => 'Profil fictif lié au compte existant; les autorisations réelles restent inchangées.',
            'companyId' => $companyId,
            'sectorId' => $sectorId,
            'modulePermissions' => is_array($user->permissions) ? $user->permissions : [],
        ]);

        $taskId = $ids('control-task');
        $this->appendStateRecord($state, 'controlTasks', [
            'id' => $taskId,
            'title' => 'Traiter une demande de démonstration',
            'description' => 'Tâche fictive attribuée au compte existant.',
            'companyId' => $companyId,
            'sectorId' => $sectorId,
            'moduleId' => 'stocks',
            'assigneeEmployeeId' => $employeeId,
            'assigneeName' => $displayName,
            'createdBy' => 'Administration de démonstration',
            'status' => 'EN COURS',
            'priority' => 'NORMALE',
            'requiresApproval' => false,
            'dueDate' => $now->copy()->addDays(3)->toDateString(),
            'relatedObject' => 'Dépôt principal',
            'createdAt' => $now->toISOString(),
            'updatedAt' => $now->toISOString(),
        ]);
        $this->appendStateRecord($state, 'activities', [
            'id' => $ids('activity'),
            'employeeId' => $employeeId,
            'user' => $displayName,
            'action' => 'Ouverture de la démonstration',
            'module' => 'presences',
            'object' => 'Espace de démonstration',
            'date' => $now->toDateString(),
            'status' => 'ACTIF',
            'companyId' => $companyId,
        ]);
        $fingerprint = substr(hash('sha256', $employeeId), 0, 8);
        $this->appendStateRecord($state, 'payrollSlips', [
            'id' => $ids('payroll-slip'),
            'reference' => 'DEMO-BUL-'.$fingerprint,
            'employeeId' => $employeeId,
            'employee' => $displayName,
            'period' => $now->format('Y-m'),
            'gross' => 320000,
            'net' => 291200,
            'status' => 'BROUILLON',
            'companyId' => $companyId,
        ]);

        DB::table('maximus_app_states')->where('scope', $scope)->update([
            'payload' => json_encode($state, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            'version' => ((int) $row->version) + 1,
            'updated_at' => $now,
        ]);
    }

    /**
     * Copy the organization tree into demo state with each unit's effective
     * ancestor ceiling. Account permissions remain the employee's assigned rights.
     */
    private function effectiveUnitAccess(array $workspaceNodes, string $companyId, string $sectorId): array
    {
        $nodes = [];
        foreach ($workspaceNodes as $node) {
            if (! is_array($node)
                || (string) ($node['companyId'] ?? $node['company_id'] ?? '') !== $companyId) {
                continue;
            }
            $id = trim((string) ($node['id'] ?? ''));
            if ($id !== '') {
                $nodes[$id] = $node;
            }
        }

        $current = $nodes[$sectorId] ?? null;
        if (! is_array($current)) {
            return [];
        }

        $effectiveModuleIds = null;
        $effectiveFeatures = [];
        $visited = [];
        while (is_array($current)) {
            $id = trim((string) ($current['id'] ?? ''));
            if ($id === '' || isset($visited[$id])) {
                return ['moduleIds' => []];
            }
            $visited[$id] = true;

            if (is_array($current['moduleIds'] ?? null)) {
                $moduleIds = array_values(array_unique(array_filter(
                    array_map('strval', $current['moduleIds']),
                    static fn (string $moduleId): bool => trim($moduleId) !== '',
                )));
                $effectiveModuleIds = $effectiveModuleIds === null
                    ? $moduleIds
                    : array_values(array_intersect($effectiveModuleIds, $moduleIds));
            }

            $moduleFeatures = $current['moduleFeatures'] ?? null;
            if (is_array($moduleFeatures)) {
                foreach ($moduleFeatures as $moduleId => $rawFeatureIds) {
                    $moduleId = trim((string) $moduleId);
                    if ($moduleId === '') {
                        continue;
                    }
                    try {
                        $featureIds = ModuleCatalog::normalizeSelection(
                            $moduleId,
                            is_array($rawFeatureIds) ? array_map('strval', $rawFeatureIds) : [],
                            ['featureScope' => 'explicit'],
                        )['featureIds'];
                    } catch (\InvalidArgumentException) {
                        $featureIds = [];
                    }
                    $effectiveFeatures[$moduleId] = array_key_exists($moduleId, $effectiveFeatures)
                        ? array_values(array_intersect($effectiveFeatures[$moduleId], $featureIds))
                        : $featureIds;
                }
            }

            $parentId = trim((string) ($current['parentId'] ?? ''));
            $current = $parentId !== '' ? ($nodes[$parentId] ?? null) : null;
        }

        $access = [];
        if ($effectiveModuleIds !== null) {
            $access['moduleIds'] = $effectiveModuleIds;
        }
        if ($effectiveFeatures !== []) {
            $access['moduleFeatures'] = $effectiveFeatures;
        }

        return $access;
    }

    /**
     * Reuse the existing organization tree in the isolated demo state. Existing
     * demo edits are retained; only generated legacy placeholders are repaired.
     */
    private function syncDemoOrganizationNodes(string $companyId, array $workspaceNodes, mixed $now): void
    {
        if ($workspaceNodes === []) {
            return;
        }

        $scope = DemoWorkspace::stateScope($companyId);
        $row = DB::table('maximus_app_states')
            ->where('scope', $scope)
            ->lockForUpdate()
            ->first();
        if (! $row) {
            throw new \RuntimeException('DEMO_APP_STATE_NOT_INITIALIZED');
        }

        $payload = is_string($row->payload) ? json_decode($row->payload, true) : ($row->payload ?? []);
        $state = is_array($payload) ? $payload : [];
        $records = is_array($state['orgNodes'] ?? null) ? array_values($state['orgNodes']) : [];
        $changed = false;

        foreach ($workspaceNodes as $source) {
            if (! is_array($source)) {
                continue;
            }

            $nodeId = trim((string) ($source['id'] ?? ''));
            if ($nodeId === '') {
                continue;
            }

            $source['id'] = $nodeId;
            $source['companyId'] = $companyId;
            $source['parentId'] = $source['parentId'] ?? $source['parent_id'] ?? null;
            $access = $this->effectiveUnitAccess($workspaceNodes, $companyId, $nodeId);
            foreach (['moduleIds', 'moduleFeatures'] as $scopeKey) {
                if (array_key_exists($scopeKey, $access)) {
                    $source[$scopeKey] = $access[$scopeKey];
                } else {
                    unset($source[$scopeKey]);
                }
            }

            $index = null;
            foreach ($records as $recordIndex => $record) {
                if (is_array($record) && (string) ($record['id'] ?? '') === $nodeId) {
                    $index = $recordIndex;
                    break;
                }
            }

            if ($index === null) {
                $records[] = $source;
                $changed = true;

                continue;
            }

            $existing = $records[$index];
            $isGeneratedPlaceholder = (string) ($existing['companyId'] ?? $existing['company_id'] ?? '') === $companyId
                && str_starts_with((string) ($existing['code'] ?? ''), 'DEMO-UNIT-')
                && ($existing['type'] ?? null) === 'service'
                && ($existing['parentId'] ?? null) === null;
            if (! $isGeneratedPlaceholder) {
                continue;
            }

            $hasUntouchedEmptyScope = ($existing['moduleIds'] ?? null) === []
                && ! array_key_exists('moduleFeatures', $existing);
            foreach ($source as $key => $value) {
                if (! array_key_exists($key, $existing)) {
                    $existing[$key] = $value;
                }
            }

            foreach (['companyId', 'code', 'type', 'parentId', 'managerEmployeeId'] as $key) {
                if (array_key_exists($key, $source)) {
                    $existing[$key] = $source[$key];
                } else {
                    unset($existing[$key]);
                }
            }
            if (str_starts_with((string) ($existing['name'] ?? ''), 'Unité de démonstration ')
                && array_key_exists('name', $source)) {
                $existing['name'] = $source['name'];
            }
            if ($hasUntouchedEmptyScope) {
                foreach (['moduleIds', 'moduleFeatures'] as $scopeKey) {
                    if (array_key_exists($scopeKey, $source)) {
                        $existing[$scopeKey] = $source[$scopeKey];
                    } else {
                        unset($existing[$scopeKey]);
                    }
                }
            }

            if ($existing !== $records[$index]) {
                $records[$index] = $existing;
                $changed = true;
            }
        }

        if (! $changed) {
            return;
        }

        $state['orgNodes'] = array_values($records);
        DB::table('maximus_app_states')->where('scope', $scope)->update([
            'payload' => json_encode($state, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            'version' => ((int) $row->version) + 1,
            'updated_at' => $now,
        ]);
    }

    private function appendStateRecord(array &$state, string $collection, array $record): void
    {
        $records = is_array($state[$collection] ?? null) ? $state[$collection] : [];
        foreach ($records as $existing) {
            if (is_array($existing) && (string) ($existing['id'] ?? '') === (string) $record['id']) {
                return;
            }
        }
        $records[] = $record;
        $state[$collection] = array_values($records);
    }

    private function seedEmployeePresence(
        string $companyId,
        string $employeeId,
        string $displayName,
        callable $ids,
        mixed $now,
    ): void {
        $this->insertDemoRows('presence_items', [
            [
                'id' => $ids('presence-attendance'),
                'company_id' => $companyId,
                'type' => 'attendance',
                'employee_id' => $employeeId,
                'work_date' => $now->toDateString(),
                'start_date' => null,
                'end_date' => null,
                'status' => 'VALIDÉE',
                'payload' => json_encode(['arrivalTime' => '08:04', 'departureTime' => null, 'note' => 'Pointage fictif'], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                'created_by' => $displayName,
                'updated_by' => $displayName,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => $ids('presence-leave'),
                'company_id' => $companyId,
                'type' => 'leave',
                'employee_id' => $employeeId,
                'work_date' => null,
                'start_date' => $now->copy()->addDays(14)->toDateString(),
                'end_date' => $now->copy()->addDays(18)->toDateString(),
                'status' => 'EN ATTENTE',
                'payload' => json_encode(['reason' => 'Congé annuel fictif', 'days' => 5], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                'created_by' => $displayName,
                'updated_by' => $displayName,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    private function seedEmployeeControlTask(
        string $companyId,
        string $employeeId,
        string $displayName,
        ?string $sectorId,
        callable $ids,
        mixed $now,
    ): void {
        $this->insertDemoRows('control_tasks', [[
            'id' => $ids('control-task'),
            'company_id' => $companyId,
            'sector_id' => $sectorId,
            'title' => 'Traiter une demande de démonstration',
            'description' => 'Tâche fictive attribuée au compte existant.',
            'module_id' => 'stocks',
            'assignee_employee_id' => $employeeId,
            'assignee_name' => $displayName,
            'created_by' => 'Administration de démonstration',
            'status' => 'EN COURS',
            'priority' => 'NORMALE',
            'requires_approval' => false,
            'due_date' => $now->copy()->addDays(3)->toDateString(),
            'related_object' => 'Dépôt principal',
            'created_at' => $now,
            'updated_at' => $now,
        ]]);
    }

    private function seedEmployeeTransport(
        string $companyId,
        string $employeeId,
        string $displayName,
        callable $ids,
        mixed $now,
    ): void {
        $driverId = $ids('transport-driver');
        $vehicleId = $ids('transport-vehicle');
        $fingerprint = substr(hash('sha256', $employeeId), 0, 8);
        $this->insertDemoRows('transport_drivers', [[
            'id' => $driverId,
            'company_id' => $companyId,
            'name' => $displayName,
            'phone' => '+221 70 555 '.substr($fingerprint, -4),
            'license_number' => 'DEMO-PERMIS-'.$fingerprint,
            'employee_id' => $employeeId,
            'status' => 'ACTIVE',
            'latitude' => 14.6937,
            'longitude' => -17.4441,
            'availability' => 'AVAILABLE',
            'created_at' => $now,
            'updated_at' => $now,
        ]]);
        $this->insertDemoRows('transport_vehicles', [[
            'id' => $vehicleId,
            'company_id' => $companyId,
            'registration' => 'DEMO-'.strtoupper($fingerprint),
            'model' => 'Berline de démonstration',
            'vehicle_type' => 'TAXI',
            'status' => 'AVAILABLE',
            'driver_id' => $driverId,
            'created_at' => $now,
            'updated_at' => $now,
        ]]);
        $this->insertDemoRows('transport_trips', [
            [
                'id' => $ids('transport-trip-active'),
                'company_id' => $companyId,
                'reference' => 'DEMO-TAXI-'.$fingerprint.'-01',
                'pickup' => 'Dakar-Plateau',
                'destination' => 'Almadies',
                'passenger_name' => 'Passager de démonstration',
                'passenger_phone' => '+221 70 555 0000',
                'fare' => 4500,
                'driver_id' => $driverId,
                'vehicle_id' => $vehicleId,
                'status' => 'ASSIGNED',
                'requested_at' => $now->copy()->subMinutes(20),
                'created_at' => $now->copy()->subMinutes(20),
                'updated_at' => $now,
            ],
            [
                'id' => $ids('transport-trip-done'),
                'company_id' => $companyId,
                'reference' => 'DEMO-TAXI-'.$fingerprint.'-02',
                'pickup' => 'Médina',
                'destination' => 'Dakar-Plateau',
                'passenger_name' => 'Passager de démonstration',
                'passenger_phone' => '+221 70 555 0000',
                'fare' => 2800,
                'driver_id' => $driverId,
                'vehicle_id' => $vehicleId,
                'status' => 'COMPLETED',
                'requested_at' => $now->copy()->subDay(),
                'created_at' => $now->copy()->subDay(),
                'updated_at' => $now->copy()->subDay(),
            ],
        ]);
    }

    private function seedEmployeePayroll(
        string $companyId,
        string $employeeId,
        string $displayName,
        callable $ids,
        mixed $now,
    ): void {
        $beneficiaryId = $ids('payroll-beneficiary');
        $batchId = $ids('payroll-batch');
        $accountNumber = 'DEMO-ACCOUNT-'.substr(hash('sha256', $employeeId), 0, 8);
        $mobile = '+221 70 555 '.substr(hash('sha256', $employeeId), -4);
        $this->insertDemoRows('payroll_beneficiaries', [[
            'id' => $beneficiaryId,
            'company_id' => $companyId,
            'employee_id' => $employeeId,
            'full_name' => $displayName,
            'mobile' => $mobile,
            'account_number' => Crypt::encryptString($accountNumber),
            'provider' => 'WAVE',
            'monthly_salary' => 320000,
            'payment_day' => 28,
            'active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]]);
        $this->insertDemoRows('payroll_batches', [[
            'id' => $batchId,
            'company_id' => $companyId,
            'period' => $now->format('Y-m'),
            'payment_date' => $now->copy()->addDays(7)->toDateString(),
            'total_amount' => 320000,
            'status' => 'DRAFT',
            'created_by' => $displayName,
            'approved_by' => null,
            'approved_at' => null,
            'processed_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]]);
        $this->insertDemoRows('payroll_batch_items', [[
            'id' => $ids('payroll-batch-item'),
            'batch_id' => $batchId,
            'company_id' => $companyId,
            'beneficiary_id' => $beneficiaryId,
            'beneficiary_name' => $displayName,
            'mobile' => $mobile,
            'account_number' => Crypt::encryptString($accountNumber),
            'provider' => 'WAVE',
            'amount' => 320000,
            'status' => 'PENDING',
            'provider_payout_id' => null,
            'idempotency_key' => $ids('payroll-payout-key'),
            'failure_reason' => '',
            'processed_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]]);
    }

    private function insertDemoRows(string $table, array $rows): void
    {
        if (! Schema::hasTable($table) || $rows === []) {
            return;
        }

        $availableColumns = array_flip(Schema::getColumnListing($table));
        $rows = array_values(array_map(
            static fn (array $row): array => array_intersect_key($row, $availableColumns),
            $rows,
        ));
        if ($rows !== []) {
            DB::table($table)->insertOrIgnore($rows);
        }
    }

    private function firstCompanyOrganizationUnitId(string $companyId): ?string
    {
        $payload = DB::table('maximus_app_states')->where('scope', 'workspace')->value('payload');
        $state = is_string($payload) ? json_decode($payload, true) : ($payload ?? []);
        $nodes = is_array($state) && is_array($state['orgNodes'] ?? null) ? $state['orgNodes'] : [];

        foreach ($nodes as $node) {
            if (! is_array($node)
                || (string) ($node['companyId'] ?? $node['company_id'] ?? '') !== $companyId) {
                continue;
            }
            $nodeId = trim((string) ($node['id'] ?? ''));
            if ($nodeId !== '') {
                return $nodeId;
            }
        }

        return null;
    }

    private function seedAppState(string $companyId, callable $ids, mixed $now, ?string $nodeId): void
    {
        $employeeOne = $ids('employee-amina');
        $employeeTwo = $ids('employee-moussa');
        $roleId = $ids('role-manager');
        $date = $now->toDateString();
        $state = [
            'companies' => [],
            'employees' => [
                [
                    'id' => $employeeOne,
                    'firstName' => 'Aminata',
                    'lastName' => 'Diop',
                    'email' => 'amina.diop@example.test',
                    'phone' => '+221 70 000 00 01',
                    'position' => 'Responsable des opérations',
                    'department' => 'Opérations',
                    'subDepartment' => 'Dakar',
                    'role' => 'Manager',
                    'status' => 'ACTIF',
                    'companyId' => $companyId,
                    'sectorId' => $nodeId,
                    'roleId' => $roleId,
                ],
                [
                    'id' => $employeeTwo,
                    'firstName' => 'Moussa',
                    'lastName' => 'Fall',
                    'email' => 'moussa.fall@example.test',
                    'phone' => '+221 70 000 00 02',
                    'position' => 'Agent polyvalent',
                    'department' => 'Opérations',
                    'subDepartment' => 'Dakar',
                    'role' => 'Employé',
                    'status' => 'ACTIF',
                    'companyId' => $companyId,
                    'sectorId' => $nodeId,
                    'roleId' => $roleId,
                ],
            ],
            'roles' => [[
                'id' => $roleId,
                'name' => 'Manager de démonstration',
                'description' => 'Rôle fictif de démonstration.',
                'companyId' => $companyId,
                'sectorId' => $nodeId,
                'modulePermissions' => [],
            ]],
            'orgNodes' => [],
            'products' => [
                ['id' => $ids('catalog-computer'), 'sku' => 'DEMO-INFO-001', 'name' => 'Ordinateur portable', 'category' => 'Informatique', 'stock' => 12, 'threshold' => 3, 'price' => 425000, 'companyId' => $companyId],
                ['id' => $ids('catalog-home'), 'sku' => 'DEMO-MAISON-001', 'name' => 'Détergent multi-usage', 'category' => 'Produits ménagers', 'stock' => 48, 'threshold' => 10, 'price' => 3500, 'companyId' => $companyId],
                ['id' => $ids('catalog-feed'), 'sku' => 'DEMO-AQUA-001', 'name' => 'Aliment poisson granulé 4 mm', 'category' => 'Aquaculture', 'stock' => 35, 'threshold' => 8, 'price' => 18500, 'companyId' => $companyId],
            ],
            'movements' => [[
                'id' => $ids('movement-stock-entry'),
                'product' => 'Ordinateur portable',
                'quantity' => 12,
                'type' => 'ENTRÉE',
                'date' => $date,
                'user' => 'Aminata Diop',
                'location' => 'Dépôt principal',
                'companyId' => $companyId,
            ]],
            'sales' => [[
                'id' => $ids('sale-counter'),
                'reference' => 'DEMO-VTE-001',
                'client' => 'Boutique Teranga',
                'amount' => 56000,
                'status' => 'VALIDÉ',
                'date' => $date,
                'items' => [['productId' => $ids('catalog-home'), 'quantity' => 16]],
                'companyId' => $companyId,
            ]],
            'activities' => [[
                'id' => $ids('activity-inventory'),
                'user' => 'Moussa Fall',
                'action' => 'Inventaire hebdomadaire',
                'module' => 'stocks',
                'object' => 'Dépôt principal',
                'date' => $date,
                'status' => 'ACTIF',
                'companyId' => $companyId,
            ]],
            'controlTasks' => [[
                'id' => $ids('task-reconcile'),
                'title' => 'Vérifier les niveaux de stock',
                'description' => 'Comparer le stock physique au registre de démonstration.',
                'companyId' => $companyId,
                'sectorId' => $nodeId,
                'moduleId' => 'stocks',
                'assigneeEmployeeId' => $employeeTwo,
                'assigneeName' => 'Moussa Fall',
                'createdBy' => 'Aminata Diop',
                'status' => 'EN COURS',
                'priority' => 'NORMALE',
                'requiresApproval' => false,
                'dueDate' => $now->copy()->addDays(3)->toDateString(),
                'relatedObject' => 'Dépôt principal',
                'createdAt' => $now->copy()->subDays(1)->toISOString(),
                'updatedAt' => $now->toISOString(),
            ]],
            'domainEvents' => [[
                'id' => $ids('event-order'),
                'type' => 'SYSTEM',
                'label' => 'Nouvelle commande de démonstration',
                'summary' => 'Une commande fictive a été enregistrée dans la boutique.',
                'companyId' => $companyId,
                'moduleId' => 'ecommerce',
                'actorName' => 'Système',
                'entityType' => 'order',
                'entityId' => $ids('ecommerce-order'),
                'severity' => 'info',
                'createdAt' => $now->copy()->subHours(4)->toISOString(),
            ]],
            'auditEntries' => [[
                'id' => $ids('audit-stock'),
                'action' => 'inventory.reviewed',
                'summary' => 'Inventaire de démonstration consulté.',
                'companyId' => $companyId,
                'moduleId' => 'stocks',
                'actorName' => 'Aminata Diop',
                'entityType' => 'inventory',
                'entityId' => $ids('stock-inventory'),
                'createdAt' => $now->copy()->subHours(2)->toISOString(),
            ]],
            'notifications' => [[
                'id' => $ids('notification-stock'),
                'title' => 'Seuil de stock à surveiller',
                'text' => 'Le stock d’aliment aquacole approche de son seuil minimum.',
                'read' => false,
                'date' => $date,
                'audience' => 'company',
                'companyId' => $companyId,
                'module' => 'stocks',
                'severity' => 'warning',
                'href' => '/entreprise/stocks',
            ]],
            'purchaseOrders' => [[
                'id' => $ids('purchase-order'),
                'reference' => 'DEMO-ACH-001',
                'supplier' => 'Fournitures du Sahel',
                'subject' => 'Réapprovisionnement informatique',
                'amount' => 850000,
                'date' => $date,
                'status' => 'EN ATTENTE',
                'productId' => $ids('catalog-computer'),
                'quantity' => 2,
                'companyId' => $companyId,
            ]],
            'accountingEntries' => [[
                'id' => $ids('accounting-entry'),
                'reference' => 'DEMO-JRN-001',
                'journal' => 'Achats',
                'label' => 'Achat de consommables de démonstration',
                'debit' => 56000,
                'credit' => 0,
                'date' => $date,
                'status' => 'VALIDÉ',
                'companyId' => $companyId,
            ]],
            'payrollSlips' => [[
                'id' => $ids('payroll-slip'),
                'reference' => 'DEMO-BUL-001',
                'employee' => 'Aminata Diop',
                'period' => $now->format('Y-m'),
                'gross' => 375000,
                'net' => 342000,
                'status' => 'BROUILLON',
                'companyId' => $companyId,
            ]],
            'crmOpportunities' => [[
                'id' => $ids('crm-opportunity'),
                'client' => 'Boutique Teranga',
                'contact' => 'Mamadou Sarr',
                'subject' => 'Contrat de fournitures trimestriel',
                'amount' => 1200000,
                'nextAction' => 'Planifier un appel de suivi',
                'status' => 'EN ATTENTE',
                'companyId' => $companyId,
            ]],
            'supplierRecords' => [[
                'id' => $ids('supplier-record'),
                'name' => 'Fournitures du Sahel',
                'contact' => 'Fatou Ndiaye',
                'phone' => '+221 70 000 00 03',
                'category' => 'Informatique',
                'score' => 92,
                'status' => 'ACTIF',
                'companyId' => $companyId,
            ]],
            'deliveries' => [[
                'id' => $ids('delivery'),
                'reference' => 'DEMO-LIV-001',
                'recipient' => 'Boutique Teranga',
                'destination' => 'Plateau, Dakar',
                'driver' => 'Moussa Fall',
                'date' => $date,
                'status' => 'EN ATTENTE',
                'companyId' => $companyId,
            ]],
            'businessDocuments' => [[
                'id' => $ids('document'),
                'name' => 'Bon de commande DEMO-ACH-001',
                'category' => 'Achats',
                'owner' => 'Aminata Diop',
                'updatedAt' => $now->toISOString(),
                'version' => 1,
                'status' => 'BROUILLON',
                'companyId' => $companyId,
            ]],
            'subscriptions' => [],
            'commerceStates' => [],
        ];

        $scope = DemoWorkspace::stateScope($companyId);
        DB::table('maximus_app_states')->updateOrInsert(
            ['scope' => $scope],
            [
                'company_id' => $companyId,
                'payload' => json_encode($state, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                'version' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        );
    }

    private function seedControl(string $companyId, callable $ids, mixed $now): void
    {
        $this->upsert('control_tasks', [[
            'id' => $ids('control-task'),
            'company_id' => $companyId,
            'sector_id' => null,
            'title' => 'Contrôler le stock de l’agence',
            'description' => 'Vérifier les trois catégories de produits de démonstration.',
            'module_id' => 'stocks',
            'assignee_employee_id' => null,
            'assignee_name' => 'Aminata Diop',
            'created_by' => 'Administration de démonstration',
            'status' => 'EN COURS',
            'priority' => 'NORMALE',
            'requires_approval' => false,
            'due_date' => $now->copy()->addDays(3)->toDateString(),
            'related_object' => 'Dépôt principal',
            'created_at' => $now->copy()->subDays(1),
            'updated_at' => $now,
        ]]);
        $this->upsert('control_events', [[
            'id' => $ids('control-event'),
            'type' => 'SYSTEM',
            'label' => 'Commande fictive reçue',
            'summary' => 'Une commande de démonstration a été ajoutée.',
            'company_id' => $companyId,
            'module_id' => 'ecommerce',
            'actor_name' => 'Système',
            'entity_type' => 'order',
            'entity_id' => $ids('ecommerce-order'),
            'severity' => 'info',
            'created_at' => $now->copy()->subHours(4),
        ]]);
        $this->upsert('control_audit_entries', [[
            'id' => $ids('control-audit'),
            'action' => 'demo.workspace.initialized',
            'summary' => 'Espace de démonstration initialisé.',
            'company_id' => $companyId,
            'module_id' => null,
            'actor_name' => 'Système',
            'entity_type' => 'workspace',
            'entity_id' => $ids('workspace'),
            'created_at' => $now,
        ]]);
    }

    private function seedPresence(string $companyId, callable $ids, mixed $now): void
    {
        $this->upsert('presence_items', [
            [
                'id' => $ids('presence-attendance'),
                'company_id' => $companyId,
                'type' => 'attendance',
                'employee_id' => null,
                'work_date' => $now->toDateString(),
                'start_date' => null,
                'end_date' => null,
                'status' => 'VALIDÉE',
                'payload' => json_encode(['arrivalTime' => '08:02', 'departureTime' => null, 'note' => 'Pointage de démonstration'], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                'created_by' => 'Aminata Diop',
                'updated_by' => 'Aminata Diop',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => $ids('presence-leave'),
                'company_id' => $companyId,
                'type' => 'leave',
                'employee_id' => null,
                'work_date' => null,
                'start_date' => $now->copy()->addDays(14)->toDateString(),
                'end_date' => $now->copy()->addDays(18)->toDateString(),
                'status' => 'EN ATTENTE',
                'payload' => json_encode(['reason' => 'Congé annuel de démonstration', 'days' => 5], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                'created_by' => 'Moussa Fall',
                'updated_by' => 'Aminata Diop',
                'created_at' => $now->copy()->subHours(3),
                'updated_at' => $now,
            ],
        ]);
    }

    private function seedStock(string $companyId, callable $ids, mixed $now): void
    {
        $supplier = $ids('stock-supplier');
        $warehouse = $ids('stock-warehouse');
        $location = $ids('stock-location');
        $products = [
            ['id' => $ids('stock-computer'), 'name' => 'Ordinateur portable 14 pouces', 'category' => 'Informatique', 'subcategory' => 'Ordinateurs', 'brand' => 'SunuTech', 'sku' => 'DEMO-INFO-001', 'unit' => 'unité', 'purchase_price' => 350000, 'sale_price' => 425000, 'min_stock' => 3, 'max_stock' => 24, 'supplier_id' => $supplier, 'description' => 'Portable bureautique fictif pour les démonstrations.', 'quantity' => 12],
            ['id' => $ids('stock-household'), 'name' => 'Détergent multi-usage 5 L', 'category' => 'Produits ménagers', 'subcategory' => 'Entretien', 'brand' => 'Proprex', 'sku' => 'DEMO-MAISON-001', 'unit' => 'bidon', 'purchase_price' => 2400, 'sale_price' => 3500, 'min_stock' => 10, 'max_stock' => 80, 'supplier_id' => $supplier, 'description' => 'Produit ménager fictif.', 'quantity' => 48],
            ['id' => $ids('stock-aquafeed'), 'name' => 'Aliment poisson granulé 4 mm', 'category' => 'Aquaculture', 'subcategory' => 'Aliments pour poissons', 'brand' => 'AquaCroissance', 'sku' => 'DEMO-AQUA-001', 'unit' => 'sac de 25 kg', 'purchase_price' => 14500, 'sale_price' => 18500, 'min_stock' => 8, 'max_stock' => 60, 'supplier_id' => $supplier, 'description' => 'Aliment aquacole fictif pour tilapia.', 'quantity' => 35],
        ];

        $this->upsert('stock_suppliers', [[
            'id' => $supplier,
            'company_id' => $companyId,
            'name' => 'Fournitures du Sahel',
            'contact_name' => 'Fatou Ndiaye',
            'email' => 'fournitures@example.test',
            'phone' => '+221 70 000 00 03',
            'address' => 'Zone industrielle, Dakar',
            'notes' => 'Fournisseur fictif',
            'archived' => false,
            'created_at' => $now,
            'updated_at' => $now,
        ]]);
        $this->upsert('stock_warehouses', [[
            'id' => $warehouse,
            'company_id' => $companyId,
            'name' => 'Dépôt principal',
            'manager' => 'Aminata Diop',
            'address' => 'Plateau, Dakar',
            'archived' => false,
            'created_at' => $now,
            'updated_at' => $now,
        ]]);
        $this->upsert('stock_locations', [[
            'id' => $location,
            'company_id' => $companyId,
            'warehouse_id' => $warehouse,
            'name' => 'Rayon A — démonstration',
            'archived' => false,
            'created_at' => $now,
        ]]);

        foreach ($products as $product) {
            $quantity = $product['quantity'];
            unset($product['quantity']);
            $this->upsert('stock_products', [[
                ...$product,
                'company_id' => $companyId,
                'barcode' => '',
                'image_url' => '',
                'archived' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ]]);
            $this->upsert('stock_balances', [[
                'id' => $ids('balance-'.$product['id']),
                'company_id' => $companyId,
                'product_id' => $product['id'],
                'supplier_id' => $supplier,
                'warehouse_id' => $warehouse,
                'location_id' => $location,
                'quantity' => $quantity,
                'updated_at' => $now,
            ]]);
        }

        $this->upsert('stock_movements', [[
            'id' => $ids('stock-movement'),
            'company_id' => $companyId,
            'product_id' => $products[2]['id'],
            'supplier_id' => $supplier,
            'warehouse_id' => $warehouse,
            'destination_warehouse_id' => null,
            'location_id' => $location,
            'requester_service' => 'Aquaculture',
            'beneficiary' => 'Ferme piscicole de démonstration',
            'type' => 'ENTRÉE',
            'quantity' => 35,
            'purchase_price' => 14500,
            'reason' => 'Réception initiale du jeu de démonstration',
            'movement_date' => $now,
            'user_name' => 'Aminata Diop',
            'reference' => 'DEMO-MVT-001',
            'comment' => 'Donnée fictive',
            'status' => 'VALIDÉ',
            'created_at' => $now,
        ]]);
        $this->upsert('stock_requests', [[
            'id' => $ids('stock-request'),
            'company_id' => $companyId,
            'product_id' => $products[2]['id'],
            'warehouse_id' => $warehouse,
            'quantity' => 6,
            'reason' => 'Besoin prévu pour une démonstration de production',
            'status' => 'EN ATTENTE',
            'created_by' => 'Moussa Fall',
            'created_at' => $now->copy()->subHours(2),
            'updated_at' => $now,
        ]]);
        $inventoryId = $ids('stock-inventory');
        $this->upsert('stock_inventories', [[
            'id' => $inventoryId,
            'company_id' => $companyId,
            'warehouse_id' => $warehouse,
            'status' => 'BROUILLON',
            'inventory_date' => $now,
            'notes' => 'Inventaire fictif du dépôt principal',
            'created_by' => 'Aminata Diop',
            'validated_at' => null,
            'created_at' => $now,
        ]]);
        $this->upsert('stock_inventory_lines', array_map(
            fn (array $product): array => [
                'id' => $ids('inventory-line-'.$product['id']),
                'inventory_id' => $inventoryId,
                'product_id' => $product['id'],
                'theoretical_quantity' => (int) ($product['quantity'] ?? 0),
                'actual_quantity' => (int) ($product['quantity'] ?? 0),
                'difference' => 0,
            ],
            $products,
        ));
        $this->upsert('stock_audit_logs', [[
            'id' => $ids('stock-audit'),
            'company_id' => $companyId,
            'action' => 'demo.initialized',
            'entity_type' => 'workspace',
            'entity_id' => $ids('workspace'),
            'user_name' => 'Système',
            'detail' => 'Jeu de démonstration du module Stock créé.',
            'created_at' => $now,
        ]]);
    }

    private function seedEcommerce(string $companyId, callable $ids, mixed $now): void
    {
        $storeId = $ids('ecommerce-store');
        $categoryId = $ids('ecommerce-category');
        $productId = $ids('ecommerce-product');
        $orderId = $ids('ecommerce-order');
        $this->upsert('ecommerce_stores', [[
            'id' => $storeId,
            'company_id' => $companyId,
            'slug' => 'demo-'.substr(hash('sha256', $companyId), 0, 16),
            'name' => 'Boutique Teranga — démonstration',
            'description' => 'Vitrine fictive réservée à la démonstration interne.',
            'status' => 'DRAFT',
            'currency' => 'XOF',
            'primary_color' => '#D69E2E',
            'accent_color' => '#172033',
            'logo_url' => '',
            'created_at' => $now,
            'updated_at' => $now,
        ]]);
        $this->upsert('ecommerce_categories', [[
            'id' => $categoryId,
            'company_id' => $companyId,
            'name' => 'Produits artisanaux',
            'slug' => 'produits-artisanaux',
            'description' => 'Catégorie fictive de démonstration.',
            'is_active' => true,
            'sort_order' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]]);
        $this->upsert('ecommerce_products', [[
            'id' => $productId,
            'company_id' => $companyId,
            'name' => 'Panier tressé artisanal',
            'slug' => 'panier-tresse-demo',
            'sku' => 'DEMO-ECOM-001',
            'description' => 'Produit fictif pour tester le catalogue.',
            'category' => 'Produits artisanaux',
            'category_id' => $categoryId,
            'price' => 12500,
            'compare_at_price' => 15000,
            'stock' => 18,
            'image_url' => '',
            'featured' => true,
            'status' => 'DRAFT',
            'product_type' => 'SALE',
            'created_at' => $now,
            'updated_at' => $now,
        ]]);
        $this->upsert('ecommerce_orders', [[
            'id' => $orderId,
            'company_id' => $companyId,
            'reference' => 'DEMO-CMD-001',
            'customer_name' => 'Mamadou Sarr',
            'customer_email' => 'mamadou.sarr@example.test',
            'customer_phone' => '+221 70 000 00 04',
            'shipping_address' => 'Plateau, Dakar',
            'note' => 'Commande fictive de démonstration',
            'total' => 25000,
            'status' => 'NOUVELLE',
            'created_at' => $now->copy()->subHours(4),
            'updated_at' => $now,
        ]]);
        $this->upsert('ecommerce_order_items', [[
            'id' => $ids('ecommerce-order-item'),
            'order_id' => $orderId,
            'product_id' => $productId,
            'product_name' => 'Panier tressé artisanal',
            'unit_price' => 12500,
            'quantity' => 2,
            'line_total' => 25000,
            'product_type' => 'SALE',
            'created_at' => $now,
            'updated_at' => $now,
        ]]);
        $this->upsert('ecommerce_delivery_zones', [[
            'id' => $ids('delivery-zone'),
            'company_id' => $companyId,
            'name' => 'Dakar Plateau',
            'description' => 'Zone de livraison fictive.',
            'fee' => 1500,
            'estimated_minutes' => 45,
            'is_active' => true,
            'sort_order' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]]);
        $this->upsert('ecommerce_delivery_requests', [[
            'id' => $ids('delivery-request'),
            'company_id' => $companyId,
            'customer_id' => null,
            'order_id' => $orderId,
            'reference' => 'DEMO-LIV-001',
            'requester_name' => 'Mamadou Sarr',
            'requester_email' => 'mamadou.sarr@example.test',
            'requester_phone' => '+221 70 000 00 04',
            'address' => 'Plateau, Dakar',
            'service_type' => 'STANDARD',
            'desired_date' => $now->copy()->addDay()->toDateString(),
            'note' => 'Demande fictive',
            'status' => 'DEMANDEE',
            'created_at' => $now,
            'updated_at' => $now,
        ]]);
        $this->upsert('ecommerce_rentals', [[
            'id' => $ids('rental-item'),
            'company_id' => $companyId,
            'name' => 'Vélo urbain de démonstration',
            'description' => 'Vélo fictif, adapté aux essais du parcours de location.',
            'category' => 'Mobilité',
            'price' => 8000,
            'billing_unit' => 'JOUR',
            'availability' => 4,
            'status' => 'DRAFT',
            'brand' => 'Teranga Mobilité',
            'model' => 'Ville 7',
            'year' => 2025,
            'seats' => 1,
            'daily_rate' => 8000,
            'km_rate' => 0,
            'deposit' => 15000,
            'fees' => 0,
            'equipment' => json_encode(['antivol', 'casque'], JSON_THROW_ON_ERROR),
            'gallery' => json_encode([], JSON_THROW_ON_ERROR),
            'unavailable_periods' => json_encode([], JSON_THROW_ON_ERROR),
            'created_at' => $now,
            'updated_at' => $now,
        ]]);
        $this->upsert('ecommerce_location_settings', [[
            'company_id' => $companyId,
            'whatsapp' => '+221 70 000 00 05',
            'message' => 'Réservation fictive de démonstration.',
            'default_daily_rate' => 8000,
            'default_km_rate' => 0,
            'default_deposit' => 15000,
            'policy' => 'Conditions de démonstration uniquement.',
            'created_at' => $now,
            'updated_at' => $now,
        ]], ['company_id']);

        if (Schema::hasTable('ecommerce_pos_sales')) {
            $saleId = $ids('pos-sale');
            $this->upsert('ecommerce_pos_sales', [[
                'id' => $saleId,
                'company_id' => $companyId,
                'reference' => 'DEMO-POS-001',
                'cashier_id' => null,
                'idempotency_key' => $ids('pos-idempotency'),
                'customer_name' => 'Client comptoir',
                'currency' => 'XOF',
                'subtotal' => 25000,
                'total' => 25000,
                'amount_received' => 25000,
                'change_due' => 0,
                'status' => 'PAID',
                'created_at' => $now->copy()->subHours(1),
                'updated_at' => $now,
            ]]);
            $this->upsert('ecommerce_pos_sale_items', [[
                'id' => $ids('pos-sale-item'),
                'company_id' => $companyId,
                'sale_id' => $saleId,
                'product_id' => $productId,
                'product_name' => 'Panier tressé artisanal',
                'sku' => 'DEMO-ECOM-001',
                'unit_price' => 12500,
                'quantity' => 2,
                'line_total' => 25000,
                'created_at' => $now,
                'updated_at' => $now,
            ]]);
        }
    }

    private function seedPayroll(string $companyId, callable $ids, mixed $now): void
    {
        $walletId = $ids('payroll-wallet');
        $beneficiaryId = $ids('payroll-beneficiary');
        $batchId = $ids('payroll-batch');
        $this->upsert('payroll_wallets', [[
            'id' => $walletId,
            'company_id' => $companyId,
            'currency' => 'XOF',
            'available_balance' => 125000,
            'reserved_balance' => 0,
            'total_funded' => 250000,
            'created_at' => $now,
            'updated_at' => $now,
        ]], ['company_id']);
        $this->upsert('payroll_beneficiaries', [[
            'id' => $beneficiaryId,
            'company_id' => $companyId,
            'employee_id' => null,
            'full_name' => 'Aminata Diop',
            'mobile' => '+221 70 000 00 01',
            'account_number' => Crypt::encryptString('DEMO-ACCOUNT-0001'),
            'provider' => 'WAVE',
            'monthly_salary' => 375000,
            'payment_day' => 28,
            'active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]]);
        $this->upsert('payroll_wallet_ledger', [[
            'id' => $ids('payroll-ledger'),
            'wallet_id' => $walletId,
            'company_id' => $companyId,
            'type' => 'DEMO_CREDIT',
            'direction' => 'IN',
            'amount' => 125000,
            'reference_type' => 'DEMO',
            'reference_id' => $ids('workspace'),
            'idempotency_key' => $ids('payroll-ledger-key'),
            'metadata' => json_encode(['label' => 'Solde fictif de démonstration'], JSON_THROW_ON_ERROR),
            'created_at' => $now->copy()->subDays(2),
            'updated_at' => $now,
        ]]);
        $this->upsert('payroll_batches', [[
            'id' => $batchId,
            'company_id' => $companyId,
            'period' => $now->format('Y-m'),
            'payment_date' => $now->copy()->addDays(7)->toDateString(),
            'total_amount' => 375000,
            'status' => 'DRAFT',
            'created_by' => 'Aminata Diop',
            'approved_by' => null,
            'approved_at' => null,
            'processed_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]]);
        $this->upsert('payroll_batch_items', [[
            'id' => $ids('payroll-batch-item'),
            'batch_id' => $batchId,
            'company_id' => $companyId,
            'beneficiary_id' => $beneficiaryId,
            'beneficiary_name' => 'Aminata Diop',
            'mobile' => '+221 70 000 00 01',
            'account_number' => Crypt::encryptString('DEMO-ACCOUNT-0001'),
            'provider' => 'WAVE',
            'amount' => 375000,
            'status' => 'PENDING',
            'provider_payout_id' => null,
            'idempotency_key' => $ids('payroll-payout-key'),
            'failure_reason' => '',
            'processed_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]]);
    }

    private function seedTransport(string $companyId, callable $ids, mixed $now): void
    {
        $driverId = $ids('transport-driver');
        $vehicleId = $ids('transport-vehicle');
        $this->upsert('transport_drivers', [[
            'id' => $driverId,
            'company_id' => $companyId,
            'name' => 'Moussa Fall',
            'phone' => '+221 70 000 00 02',
            'license_number' => 'DEMO-PERMIS-001',
            'status' => 'ACTIVE',
            'latitude' => 14.6937,
            'longitude' => -17.4441,
            'availability' => 'AVAILABLE',
            'created_at' => $now,
            'updated_at' => $now,
        ]]);
        $this->upsert('transport_vehicles', [[
            'id' => $vehicleId,
            'company_id' => $companyId,
            'registration' => 'DEMO-001',
            'model' => 'Berline de démonstration',
            'vehicle_type' => 'TAXI',
            'status' => 'AVAILABLE',
            'driver_id' => $driverId,
            'created_at' => $now,
            'updated_at' => $now,
        ]]);
        $this->upsert('transport_trips', [
            [
                'id' => $ids('transport-trip-active'),
                'company_id' => $companyId,
                'reference' => 'DEMO-TAXI-001',
                'pickup' => 'Dakar-Plateau',
                'destination' => 'Almadies',
                'passenger_name' => 'Mamadou Sarr',
                'passenger_phone' => '+221 70 000 00 04',
                'fare' => 4500,
                'driver_id' => $driverId,
                'vehicle_id' => $vehicleId,
                'status' => 'ASSIGNED',
                'requested_at' => $now->copy()->subMinutes(20),
                'created_at' => $now->copy()->subMinutes(20),
                'updated_at' => $now,
            ],
            [
                'id' => $ids('transport-trip-done'),
                'company_id' => $companyId,
                'reference' => 'DEMO-TAXI-002',
                'pickup' => 'Médina',
                'destination' => 'Dakar-Plateau',
                'passenger_name' => 'Fatou Ndiaye',
                'passenger_phone' => '+221 70 000 00 03',
                'fare' => 2800,
                'driver_id' => $driverId,
                'vehicle_id' => $vehicleId,
                'status' => 'COMPLETED',
                'requested_at' => $now->copy()->subDay(),
                'created_at' => $now->copy()->subDay(),
                'updated_at' => $now->copy()->subDay(),
            ],
        ]);
    }

    private function seedImmobilier(string $companyId, callable $ids, mixed $now): void
    {
        $propertyId = $ids('property');
        $listingId = $ids('listing');
        $this->upsert('immobilier_properties', [[
            'id' => $propertyId,
            'company_id' => $companyId,
            'reference' => 'DEMO-BIEN-001',
            'property_type' => 'APPARTEMENT',
            'transaction_type' => 'RENT',
            'status' => 'AVAILABLE',
            'city' => 'Dakar',
            'neighborhood' => 'Point E',
            'address' => 'Adresse fictive — Point E',
            'price' => 450000,
            'area_m2' => 92,
            'bedrooms' => 3,
            'bathrooms' => 2,
            'furnished' => true,
            'internal_notes' => 'Bien fictif de démonstration.',
            'created_at' => $now,
            'updated_at' => $now,
        ]]);
        $this->upsert('immobilier_listings', [[
            'id' => $listingId,
            'company_id' => $companyId,
            'property_id' => $propertyId,
            'title' => 'Appartement lumineux à Point E',
            'slug' => 'demo-appartement-point-e',
            'property_type' => 'APPARTEMENT',
            'transaction_type' => 'RENT',
            'status' => 'DRAFT',
            'description' => 'Annonce fictive pour tester la gestion immobilière.',
            'city' => 'Dakar',
            'neighborhood' => 'Point E',
            'address' => 'Adresse fictive — Point E',
            'price' => 450000,
            'area_m2' => 92,
            'bedrooms' => 3,
            'bathrooms' => 2,
            'furnished' => true,
            'featured' => false,
            'created_at' => $now,
            'updated_at' => $now,
        ]]);
        $this->upsert('immobilier_leads', [[
            'id' => $ids('immobilier-lead'),
            'company_id' => $companyId,
            'listing_id' => $listingId,
            'request_type' => 'CONTACT',
            'status' => 'NEW',
            'name' => 'Ousmane Ba',
            'email' => 'ousmane.ba@example.test',
            'phone' => '+221 70 000 00 06',
            'preferred_date' => $now->copy()->addDays(2)->toDateString(),
            'message' => 'Demande de visite fictive.',
            'created_at' => $now,
            'updated_at' => $now,
        ]]);
    }

    private function upsert(string $table, array $rows, array $uniqueBy = ['id']): void
    {
        if (! Schema::hasTable($table)) {
            return;
        }

        $availableColumns = array_flip(Schema::getColumnListing($table));
        foreach ($rows as $row) {
            $row = array_intersect_key($row, $availableColumns);
            $unique = array_intersect_key($row, array_flip($uniqueBy));
            if ($unique === []) {
                continue;
            }
            DB::table($table)->updateOrInsert($unique, array_diff_key($row, $unique));
        }
    }
}
