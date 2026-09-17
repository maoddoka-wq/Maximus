<?php

namespace App\Console\Commands;

use App\Models\AuthSession;
use App\Models\AuthUser;
use App\Models\Company;
use App\Models\CompanyRequest;
use App\Support\MaximusPassword;
use App\Support\ModuleCatalog;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProvisionMaximusTestFixtures extends Command
{
    protected $signature = 'maximus:provision-test-fixtures';

    protected $description = 'Crée des comptes et une entreprise de test uniquement dans la base locale';

    private const COMPANY_ID = 'fixture-company';
    private const DIRECTION_ID = 'fixture-direction';
    private const SECTOR_ID = 'fixture-sector';
    private const MANAGER_EMPLOYEE_ID = 'fixture-sector-manager';
    private const EMPLOYEE_ID = 'fixture-employee';
    private const PENDING_COMPANY_ID = 'fixture-pending-company';

    public function handle(): int
    {
        if ($this->laravel->environment('production')) {
            $this->error('Le provisioning des fixtures de test est désactivé en production.');

            return self::FAILURE;
        }

        $password = Str::random(22).'!9';
        $moduleIds = array_column(ModuleCatalog::definitions(), 'id');
        $now = now();

        DB::transaction(function () use ($password, $moduleIds, $now): void {
            ModuleCatalog::ensureCatalog();

            Company::query()->updateOrCreate(
                ['id' => self::COMPANY_ID],
                [
                    'name' => 'Entreprise de test MAXIMUS',
                    'manager' => 'Administrateur de test',
                    'email' => 'entreprise.test@maximus.local',
                    'phone' => '',
                    'country' => 'Sénégal',
                    'sector' => 'Distribution',
                    'status' => 'ACTIF',
                    'requested_modules' => $moduleIds,
                    'requested_module_pack_ids' => [],
                    'requested_module_features' => [],
                    'requested_module_permissions' => [],
                    'rejection_reason' => null,
                    'deleted_at' => null,
                    'updated_at' => $now,
                ],
            );

            ModuleCatalog::ensureCompanyAccess(self::COMPANY_ID, $moduleIds);

            $permissions = [
                'commerce' => ['voir', 'créer', 'modifier'],
                'stocks' => ['voir', 'créer', 'modifier'],
                'presences' => ['voir', 'créer', 'modifier'],
                'ecommerce' => ['voir', 'créer', 'modifier'],
            ];

            $this->upsertUser(
                'fixture-maximus-admin',
                'admin.test@maximus.local',
                'Administration MAXIMUS — test',
                'maximus_admin',
                null,
                null,
                [],
                $permissions,
                $password,
            );
            $this->upsertUser(
                'fixture-company-admin',
                'entreprise.admin.test@maximus.local',
                'Administrateur entreprise — test',
                'company_admin',
                self::COMPANY_ID,
                null,
                [],
                $permissions,
                $password,
            );
            $this->upsertUser(
                'fixture-sector-manager',
                'manager.test@maximus.local',
                'Mamadou Diallo',
                'sector_manager',
                self::COMPANY_ID,
                self::MANAGER_EMPLOYEE_ID,
                [self::SECTOR_ID],
                $permissions,
                $password,
            );
            $this->upsertUser(
                'fixture-employee',
                'employe.test@maximus.local',
                'Aïssatou Ndiaye',
                'employee',
                self::COMPANY_ID,
                self::EMPLOYEE_ID,
                [self::SECTOR_ID],
                [
                    'commerce' => ['voir'],
                    'stocks' => ['voir'],
                    'presences' => ['voir'],
                ],
                $password,
            );

            Company::query()->updateOrCreate(
                ['id' => self::PENDING_COMPANY_ID],
                [
                    'name' => 'Demande entreprise de test',
                    'manager' => 'Responsable en attente',
                    'email' => 'demande.test@maximus.local',
                    'phone' => '',
                    'country' => 'Sénégal',
                    'sector' => '',
                    'status' => 'EN ATTENTE',
                    'requested_modules' => ['commerce', 'stocks'],
                    'requested_module_pack_ids' => [],
                    'requested_module_features' => [],
                    'requested_module_permissions' => [],
                    'rejection_reason' => null,
                    'deleted_at' => null,
                    'updated_at' => $now,
                ],
            );
            CompanyRequest::query()->updateOrCreate(
                ['company_id' => self::PENDING_COMPANY_ID],
                [
                    'id' => 'fixture-pending-company-request',
                    'status' => 'PENDING',
                    'admin_password_hash' => MaximusPassword::hash($password),
                    'rejection_reason' => null,
                    'updated_at' => $now,
                ],
            );

            $this->mergeFixtureState($password, $moduleIds, $now);
        });

        $this->newLine();
        $this->info('Fixtures locales MAXIMUS provisionnées.');
        $this->warn('Ces identifiants sont réservés à la prévisualisation locale et ne doivent pas être utilisés en production.');
        $this->table(
            ['Rôle', 'Email', 'Mot de passe temporaire'],
            [
                ['MAXIMUS', 'admin.test@maximus.local', $password],
                ['Administrateur entreprise', 'entreprise.admin.test@maximus.local', $password],
                ['Manager de secteur', 'manager.test@maximus.local', $password],
                ['Employé', 'employe.test@maximus.local', $password],
            ],
        );
        $this->line('Une demande en attente est également disponible dans l’espace MAXIMUS.');

        return self::SUCCESS;
    }

    private function upsertUser(
        string $id,
        string $email,
        string $displayName,
        string $role,
        ?string $companyId,
        ?string $employeeId,
        array $sectorIds,
        array $permissions,
        string $password,
    ): void {
        $emailOwner = AuthUser::query()->where('email', $email)->where('id', '!=', $id)->exists();
        if ($emailOwner) {
            throw new \RuntimeException("L’adresse de fixture {$email} est déjà utilisée par un autre compte.");
        }

        $user = AuthUser::query()->updateOrCreate(
            ['id' => $id],
            [
                'email' => $email,
                'password_hash' => MaximusPassword::hash($password),
                'display_name' => $displayName,
                'role' => $role,
                'company_id' => $companyId,
                'employee_id' => $employeeId,
                'sector_ids' => $sectorIds,
                'permissions' => $permissions,
                'status' => 'ACTIF',
                'updated_at' => now(),
            ],
        );

        AuthSession::query()->where('user_id', $user->id)->delete();
    }

    private function mergeFixtureState(string $password, array $moduleIds, mixed $now): void
    {
        $row = DB::table('maximus_app_states')->where('scope', 'workspace')->first();
        $state = is_string($row?->payload) ? json_decode($row->payload, true) : ($row?->payload ?? []);
        $state = is_array($state) ? $state : [];

        foreach (['companies', 'employees', 'roles', 'orgNodes'] as $key) {
            if (!isset($state[$key]) || !is_array($state[$key])) {
                $state[$key] = [];
            }
        }

        $company = [
            'id' => self::COMPANY_ID,
            'name' => 'Entreprise de test MAXIMUS',
            'manager' => 'Administrateur de test',
            'email' => 'entreprise.test@maximus.local',
            'phone' => '',
            'country' => 'Sénégal',
            'sector' => 'Distribution',
            'status' => 'ACTIF',
            'requestedModules' => $moduleIds,
            'allowedModules' => $moduleIds,
            'refusedModules' => [],
            'createdAt' => $now->toISOString(),
        ];
        $pendingCompany = [
            'id' => self::PENDING_COMPANY_ID,
            'name' => 'Demande entreprise de test',
            'manager' => 'Responsable en attente',
            'email' => 'demande.test@maximus.local',
            'phone' => '',
            'country' => 'Sénégal',
            'sector' => '',
            'status' => 'EN ATTENTE',
            'requestedModules' => ['commerce', 'stocks'],
            'allowedModules' => [],
            'refusedModules' => [],
            'createdAt' => $now->toISOString(),
        ];
        $employees = [
            [
                'id' => self::MANAGER_EMPLOYEE_ID,
                'firstName' => 'Mamadou',
                'lastName' => 'Diallo',
                'email' => 'manager.test@maximus.local',
                'phone' => '',
                'position' => 'Manager de secteur',
                'department' => 'Direction générale',
                'subDepartment' => '',
                'role' => 'sector_manager',
                'status' => 'ACTIF',
                'loginPassword' => $password,
                'isSectorAdmin' => true,
                'companyId' => self::COMPANY_ID,
                'sectorId' => self::SECTOR_ID,
            ],
            [
                'id' => self::EMPLOYEE_ID,
                'firstName' => 'Aïssatou',
                'lastName' => 'Ndiaye',
                'email' => 'employe.test@maximus.local',
                'phone' => '',
                'position' => 'Employée',
                'department' => 'Direction générale',
                'subDepartment' => '',
                'role' => 'employee',
                'status' => 'ACTIF',
                'loginPassword' => $password,
                'companyId' => self::COMPANY_ID,
                'sectorId' => self::SECTOR_ID,
            ],
        ];
        $roles = [
            [
                'id' => 'fixture-role-sector-manager',
                'name' => 'Manager de secteur — test',
                'description' => 'Rôle local de test.',
                'modulePermissions' => [
                    'commerce' => ['voir', 'créer', 'modifier'],
                    'stocks' => ['voir', 'créer', 'modifier'],
                    'presences' => ['voir', 'créer', 'modifier'],
                    'ecommerce' => ['voir', 'créer', 'modifier'],
                ],
                'companyId' => self::COMPANY_ID,
                'sectorId' => self::SECTOR_ID,
            ],
            [
                'id' => 'fixture-role-employee',
                'name' => 'Employé — test',
                'description' => 'Rôle local de test.',
                'modulePermissions' => [
                    'commerce' => ['voir'],
                    'stocks' => ['voir'],
                    'presences' => ['voir'],
                ],
                'companyId' => self::COMPANY_ID,
                'sectorId' => self::SECTOR_ID,
            ],
        ];
        $orgNodes = [
            [
                'id' => self::DIRECTION_ID,
                'companyId' => self::COMPANY_ID,
                'code' => 'DG-TEST',
                'name' => 'Direction générale',
                'type' => 'direction',
                'parentId' => null,
                'moduleIds' => $moduleIds,
            ],
            [
                'id' => self::SECTOR_ID,
                'companyId' => self::COMPANY_ID,
                'code' => 'SEC-TEST',
                'name' => 'Secteur de test',
                'type' => 'sector',
                'parentId' => self::DIRECTION_ID,
                'moduleIds' => $moduleIds,
                'managerEmployeeId' => self::MANAGER_EMPLOYEE_ID,
            ],
        ];

        $state['companies'] = $this->replaceById($state['companies'], [$company, $pendingCompany]);
        $state['employees'] = $this->replaceById($state['employees'], $employees);
        $state['roles'] = $this->replaceById($state['roles'], $roles);
        $state['orgNodes'] = $this->replaceById($state['orgNodes'], $orgNodes);

        DB::table('maximus_app_states')->updateOrInsert(
            ['scope' => 'workspace'],
            [
                'company_id' => null,
                'payload' => json_encode($state, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                'version' => ((int) ($row?->version ?? 0)) + 1,
                'updated_at' => $now,
                'created_at' => $row?->created_at ?? $now,
            ],
        );
    }

    private function replaceById(array $items, array $fixtures): array
    {
        $fixtureIds = array_fill_keys(array_column($fixtures, 'id'), true);
        $preserved = array_values(array_filter(
            $items,
            static fn (mixed $item): bool => is_array($item) && !isset($fixtureIds[$item['id'] ?? null]),
        ));

        return [...$preserved, ...$fixtures];
    }
}