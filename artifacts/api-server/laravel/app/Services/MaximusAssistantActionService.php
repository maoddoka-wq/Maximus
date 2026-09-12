<?php

namespace App\Services;

use App\Models\AuthUser;
use App\Models\Company;
use App\Support\ModuleCatalog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

final class MaximusAssistantActionService
{
    /**
     * @param array<string, mixed> $action
     * @return array{answer: string, citations: array<int, string>, provider: string, model: string, action: array<string, mixed>}
     */
    public function preview(array $action): array
    {
        $state = $this->workspaceState();
        $normalized = $this->normalizeAndValidate($action, $state);

        return [
            'answer' => $this->previewMessage($normalized),
            'citations' => [
                'Catalogue administratif MAXI',
                'Règles de validation et de publication',
                'Organisation et accès',
            ],
            'provider' => 'maxi',
            'model' => 'MAXI',
            'action' => [
                ...$normalized,
                'status' => 'PENDING_CONFIRMATION',
                'requiresConfirmation' => true,
            ],
        ];
    }

    /**
     * @param array<string, mixed> $action
     * @param array<string, mixed> $actor
     * @return array{answer: string, citations: array<int, string>, provider: string, model: string, action: array<string, mixed>}
     */
    public function execute(array $action, array $actor): array
    {
        return DB::transaction(function () use ($action, $actor): array {
            $row = DB::table('maximus_app_states')
                ->where('scope', 'workspace')
                ->lockForUpdate()
                ->first();
            $state = $this->decodePayload($row?->payload);
            $normalized = $this->normalizeAndValidate($action, $state);

            if ($normalized['type'] === 'update_company') {
                $this->updateCompany($normalized);
            }
            $this->apply($state, $normalized);
            $this->appendAudit($state, $normalized, $actor);

            $nextVersion = ((int) ($row->version ?? 0)) + 1;
            DB::table('maximus_app_states')->updateOrInsert(
                ['scope' => 'workspace'],
                [
                    'company_id' => null,
                    'payload' => json_encode($state, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                    'version' => $nextVersion,
                    'updated_at' => now(),
                    'created_at' => $row?->created_at ?? now(),
                ],
            );

            return [
                'answer' => $this->executedMessage($normalized),
                'citations' => [
                    'Catalogue administratif MAXI',
                    'Journal d’audit MAXIMUS',
                    'Organisation et accès',
                ],
                'provider' => 'maxi',
                'model' => 'MAXI',
                'action' => [
                    ...$normalized,
                    'status' => 'EXECUTED',
                    'requiresConfirmation' => true,
                    'version' => $nextVersion,
                ],
            ];
        });
    }

    /**
     * @param array<string, mixed> $action
     * @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    private function normalizeAndValidate(array $action, array $state): array
    {
        $type = (string) ($action['type'] ?? '');

        return match ($type) {
            'create_module' => $this->normalizeModuleAction($action, $state),
            'create_pack' => $this->normalizePackAction($action, $state),
            'create_feature' => $this->normalizeFeatureAction($action, $state),
            'create_sector' => $this->normalizeSectorAction($action, $state),
            'create_company_plan' => $this->normalizeCompanyPlanAction($action, $state),
            'create_organization_unit' => $this->normalizeOrganizationAction($action, $state),
            'update_company' => $this->normalizeCompanyUpdateAction($action, $state),
            default => throw new RuntimeException('MAXI ne peut pas exécuter cette action de sécurité.'),
        };
    }

    /**
     * @param array<string, mixed> $action
     * @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    private function normalizeCompanyUpdateAction(array $action, array $state): array
    {
        $reference = trim((string) ($action['companyId'] ?? $action['companyName'] ?? $action['name'] ?? ''));
        $companies = collect(is_array($state['companies'] ?? null) ? $state['companies'] : []);
        $stateCompany = $companies->first(static fn (mixed $item): bool => is_array($item)
            && (
                (string) ($item['id'] ?? '') === $reference
                || strtolower(trim((string) ($item['name'] ?? ''))) === strtolower($reference)
            ));

        $companyQuery = Company::query()->whereNull('deleted_at');
        $company = $reference === ''
            ? null
            : $companyQuery->where(function ($query) use ($reference): void {
                $query->whereKey($reference)->orWhereRaw('LOWER(name) = ?', [strtolower($reference)]);
            })->first();

        if (! $company && is_array($stateCompany)) {
            $company = Company::query()
                ->whereKey((string) ($stateCompany['id'] ?? ''))
                ->whereNull('deleted_at')
                ->first();
        }
        if (! $company) {
            throw new RuntimeException('L’entreprise à modifier est introuvable ou inactive.');
        }

        $allowedFields = [
            'name',
            'manager',
            'email',
            'phone',
            'country',
            'sector',
            'primaryColor',
            'accentColor',
            'sidebarColor',
        ];
        $changes = [];
        $requestedChanges = is_array($action['changes'] ?? null) ? $action['changes'] : $action;
        foreach ($allowedFields as $field) {
            if (! array_key_exists($field, $requestedChanges)) {
                continue;
            }
            $value = trim((string) ($requestedChanges[$field] ?? ''));
            if ($value === '') {
                throw new RuntimeException("La valeur du champ « {$field} » ne peut pas être vide.");
            }
            $changes[$field] = $value;
        }

        if ($changes === []) {
            throw new RuntimeException('Indiquez au moins une modification à appliquer à l’entreprise.');
        }
        foreach (['name' => 160, 'manager' => 180, 'email' => 255, 'phone' => 40, 'country' => 100, 'sector' => 120] as $field => $maxLength) {
            if (isset($changes[$field]) && mb_strlen($changes[$field]) > $maxLength) {
                throw new RuntimeException("Le champ « {$field} » dépasse {$maxLength} caractères.");
            }
        }
        if (isset($changes['name']) && mb_strlen($changes['name']) < 2) {
            throw new RuntimeException('Le nom de l’entreprise doit contenir au moins 2 caractères.');
        }
        if (isset($changes['manager']) && mb_strlen($changes['manager']) < 2) {
            throw new RuntimeException('Le nom du responsable doit contenir au moins 2 caractères.');
        }
        if (isset($changes['email'])) {
            $changes['email'] = Str::lower($changes['email']);
            if (! filter_var($changes['email'], FILTER_VALIDATE_EMAIL)) {
                throw new RuntimeException('L’adresse email de l’entreprise est invalide.');
            }
            if (Company::query()
                ->whereNull('deleted_at')
                ->where('email', $changes['email'])
                ->where('id', '!=', $company->id)
                ->exists()) {
                throw new RuntimeException('Une autre entreprise utilise déjà cette adresse email.');
            }
        }
        foreach (['primaryColor', 'accentColor', 'sidebarColor'] as $field) {
            if (isset($changes[$field]) && ! preg_match('/^#[0-9a-fA-F]{6}$/', $changes[$field])) {
                throw new RuntimeException("La couleur « {$field} » doit être au format hexadécimal.");
            }
        }

        return [
            'type' => 'update_company',
            'id' => (string) $company->id,
            'companyId' => (string) $company->id,
            'companyName' => (string) $company->name,
            'name' => (string) $company->name,
            'changes' => $changes,
        ];
    }

    /**
     * @param array<string, mixed> $action
     * @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    private function normalizeModuleAction(array $action, array $state): array
    {
        $name = trim((string) ($action['name'] ?? ''));
        $description = trim((string) ($action['description'] ?? ''));
        $features = $this->uniqueStrings($action['features'] ?? []);
        $id = Str::slug((string) ($action['id'] ?? $name));

        if ($id === '' || $name === '' || $description === '') {
            throw new RuntimeException('Un module doit avoir un identifiant, un nom et une description.');
        }
        if ($features === []) {
            throw new RuntimeException('Un module doit contenir au moins une fonctionnalité.');
        }
        if ($this->findModule($state, $id) !== null) {
            throw new RuntimeException('Un module portant cet identifiant existe déjà.');
        }

        $packs = [];
        foreach (is_array($action['featurePacks'] ?? null) ? $action['featurePacks'] : [] as $pack) {
            if (!is_array($pack)) {
                continue;
            }
            $packs[] = $this->normalizePack($pack, $id, $features, $packs);
        }

        return [
            'type' => 'create_module',
            'id' => $id,
            'name' => $name,
            'description' => $description,
            'features' => $features,
            'featurePacks' => $packs,
        ];
    }

    /**
     * @param array<string, mixed> $action
     * @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    private function normalizePackAction(array $action, array $state): array
    {
        $moduleId = Str::slug((string) ($action['moduleId'] ?? ''));
        $module = $this->findModule($state, $moduleId);
        if ($module === null) {
            throw new RuntimeException('Le module demandé est introuvable dans le catalogue.');
        }

        $features = is_array($module['features'] ?? null) ? $module['features'] : [];
        $existingPacks = is_array($module['featurePacks'] ?? null) ? $module['featurePacks'] : [];
        $pack = $this->normalizePack($action, $moduleId, $features, $existingPacks);
        $existingNames = array_map(
            static fn (mixed $item): string => strtolower(trim((string) (is_array($item) ? ($item['name'] ?? '') : ''))),
            $existingPacks,
        );
        if (in_array(strtolower($pack['name']), $existingNames, true)) {
            throw new RuntimeException('Ce module contient déjà un pack portant ce nom.');
        }

        return [
            'type' => 'create_pack',
            'moduleId' => $moduleId,
            ...$pack,
        ];
    }

    /**
     * @param array<string, mixed> $action
     * @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    private function normalizeOrganizationAction(array $action, array $state): array
    {
        $companyReference = trim((string) ($action['companyId'] ?? ''));
        $company = collect(is_array($state['companies'] ?? null) ? $state['companies'] : [])
            ->first(static fn (mixed $item): bool => is_array($item)
                && (
                    (string) ($item['id'] ?? '') === $companyReference
                    || strtolower(trim((string) ($item['name'] ?? ''))) === strtolower($companyReference)
                ));
        if (!is_array($company)) {
            throw new RuntimeException('L’entreprise demandée est introuvable.');
        }
        $companyId = (string) ($company['id'] ?? '');

        $name = trim((string) ($action['name'] ?? ''));
        $code = trim((string) ($action['code'] ?? ''));
        if ($name === '' || $code === '') {
            throw new RuntimeException('Une unité doit avoir un nom et un code.');
        }

        $parentId = $action['parentId'] ?? null;
        if ($parentId !== null && $parentId !== '') {
            $parent = $this->findOrganizationNode($state, (string) $parentId);
            if ($parent === null || (string) ($parent['companyId'] ?? '') !== $companyId) {
                throw new RuntimeException('L’unité parente doit appartenir à la même entreprise.');
            }
            $parentId = (string) $parentId;
        } else {
            $parentId = null;
        }

        $nodes = is_array($state['orgNodes'] ?? null) ? $state['orgNodes'] : [];
        foreach ($nodes as $node) {
            if (!is_array($node) || (string) ($node['companyId'] ?? '') !== $companyId) {
                continue;
            }
            if (strtolower(trim((string) ($node['name'] ?? ''))) === strtolower($name)
                || strtolower(trim((string) ($node['code'] ?? ''))) === strtolower($code)) {
                throw new RuntimeException('Cette entreprise contient déjà une unité avec ce nom ou ce code.');
            }
        }

        $availableModules = $this->availableModules($state);
        $moduleIds = $this->uniqueSlugs($action['moduleIds'] ?? []);
        if ($moduleIds === []) {
            throw new RuntimeException('Une unité doit recevoir au moins un module.');
        }
        foreach ($moduleIds as $moduleId) {
            if (!isset($availableModules[$moduleId])) {
                throw new RuntimeException('L’unité référence un module absent du catalogue.');
            }
        }

        $packIds = [];
        foreach (is_array($action['modulePackIds'] ?? null) ? $action['modulePackIds'] : [] as $moduleId => $ids) {
            $moduleId = Str::slug((string) $moduleId);
            if (!isset($availableModules[$moduleId])) {
                throw new RuntimeException('Le pack référence un module absent du catalogue.');
            }
            $knownPackIds = collect($availableModules[$moduleId]['featurePacks'] ?? [])
                ->filter(fn (mixed $pack): bool => is_array($pack))
                ->pluck('id')
                ->map(fn (mixed $id): string => (string) $id)
                ->all();
            $selected = $this->uniqueSlugs($ids);
            if (array_diff($selected, $knownPackIds) !== []) {
                throw new RuntimeException('L’unité référence un pack absent du module sélectionné.');
            }
            $packIds[$moduleId] = $selected;
        }

        return [
            'type' => 'create_organization_unit',
            'id' => 'org-'.Str::lower(Str::random(12)),
            'companyId' => $companyId,
            'companyName' => (string) ($company['name'] ?? $companyId),
            'name' => $name,
            'code' => $code,
            'parentId' => $parentId,
            'moduleIds' => $moduleIds,
            'modulePackIds' => $packIds,
            'moduleFeatures' => is_array($action['moduleFeatures'] ?? null) ? $action['moduleFeatures'] : [],
        ];
    }

    /**
     * Add a feature to a module draft. A feature is deliberately scoped to a
     * module because the catalogue does not expose standalone feature records.
     *
     * @param array<string, mixed> $action
     * @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    private function normalizeFeatureAction(array $action, array $state): array
    {
        $moduleId = $this->resolveModuleId($state, (string) ($action['moduleId'] ?? ''));
        $module = $moduleId ? $this->findModule($state, $moduleId) : null;
        $name = trim((string) ($action['name'] ?? ''));
        $id = Str::slug((string) ($action['id'] ?? $name));

        if (! $module || $moduleId === '') {
            throw new RuntimeException('Le module cible de la fonctionnalité est introuvable.');
        }
        if ($id === '' || $name === '') {
            throw new RuntimeException('Une fonctionnalité doit avoir un identifiant et un nom.');
        }

        $existing = $this->uniqueStrings($module['features'] ?? []);
        if (in_array($id, array_map(fn (string $value): string => Str::slug($value), $existing), true)) {
            throw new RuntimeException('Cette fonctionnalité existe déjà dans le module.');
        }

        $dependencies = $this->uniqueSlugs($action['dependencies'] ?? []);
        $knownFeatures = array_values(array_unique([
            ...array_map(fn (string $value): string => Str::slug($value), $existing),
            ...collect($module['featurePacks'] ?? [])->flatMap(
                fn (mixed $pack): array => is_array($pack) ? $this->uniqueSlugs($pack['featureIds'] ?? []) : [],
            )->all(),
        ]));
        if (array_diff($dependencies, $knownFeatures) !== []) {
            throw new RuntimeException('Une dépendance de la fonctionnalité est absente du module.');
        }

        return [
            'type' => 'create_feature',
            'id' => $id,
            'name' => $name,
            'description' => trim((string) ($action['description'] ?? '')),
            'moduleId' => $moduleId,
            'dependencies' => $dependencies,
        ];
    }

    /**
     * @param array<string, mixed> $action
     * @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    private function normalizeSectorAction(array $action, array $state): array
    {
        $name = trim((string) ($action['name'] ?? ''));
        $id = Str::slug((string) ($action['id'] ?? $name));
        $moduleIds = [];
        foreach (is_array($action['moduleIds'] ?? null) ? $action['moduleIds'] : [] as $reference) {
            $moduleId = $this->resolveModuleId($state, (string) $reference);
            if (! $moduleId) {
                throw new RuntimeException("Le module « {$reference} » est absent du catalogue.");
            }
            $moduleIds[] = $moduleId;
        }
        $moduleIds = array_values(array_unique($moduleIds));

        if ($name === '' || $id === '' || $moduleIds === []) {
            throw new RuntimeException('Un secteur doit avoir un nom et au moins un module.');
        }

        $existingSectors = $state['catalogDraft']['sectorPresets'] ?? $state['sectorPresets'] ?? [];
        foreach (is_array($existingSectors) ? $existingSectors : [] as $sector) {
            if (! is_array($sector)) {
                continue;
            }
            if (($sector['id'] ?? null) === $id || strtolower((string) ($sector['name'] ?? '')) === strtolower($name)) {
                throw new RuntimeException('Un secteur portant ce nom ou cet identifiant existe déjà.');
            }
        }

        $modulePackIds = $this->normalizePackSelections($state, $moduleIds, $action['modulePackIds'] ?? []);
        $moduleFeatures = [];
        foreach (is_array($action['moduleFeatures'] ?? null) ? $action['moduleFeatures'] : [] as $reference => $features) {
            $moduleId = $this->resolveModuleId($state, (string) $reference);
            if (! $moduleId || ! in_array($moduleId, $moduleIds, true)) {
                throw new RuntimeException('Une fonctionnalité du secteur référence un module absent.');
            }
            $moduleFeatures[$moduleId] = $this->uniqueSlugs($features);
        }

        return [
            'type' => 'create_sector',
            'id' => $id,
            'name' => $name,
            'moduleIds' => $moduleIds,
            'modulePackIds' => $modulePackIds,
            'moduleFeatures' => $moduleFeatures,
            'businessProfiles' => is_array($action['businessProfiles'] ?? null) ? $action['businessProfiles'] : [],
        ];
    }

    /**
     * Store a complete configuration proposal without activating a company.
     *
     * @param array<string, mixed> $action
     * @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    private function normalizeCompanyPlanAction(array $action, array $state): array
    {
        $name = trim((string) ($action['name'] ?? ''));
        $sector = trim((string) ($action['sector'] ?? ''));
        $moduleIds = [];
        foreach (is_array($action['moduleIds'] ?? null) ? $action['moduleIds'] : [] as $reference) {
            $moduleId = $this->resolveModuleId($state, (string) $reference);
            if (! $moduleId) {
                throw new RuntimeException("Le module « {$reference} » est absent du catalogue.");
            }
            $moduleIds[] = $moduleId;
        }
        $moduleIds = array_values(array_unique($moduleIds));

        if ($name === '' || $sector === '' || $moduleIds === []) {
            throw new RuntimeException('Le plan d’entreprise doit avoir un nom, un secteur et au moins un module.');
        }
        $email = trim((string) ($action['companyEmail'] ?? ''));
        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new RuntimeException('Le contact de l’entreprise doit être une adresse e-mail valide.');
        }

        return [
            'type' => 'create_company_plan',
            'id' => 'company-plan-'.Str::lower(Str::random(12)),
            'name' => $name,
            'sector' => $sector,
            'managerName' => trim((string) ($action['managerName'] ?? '')),
            'companyEmail' => $email,
            'moduleIds' => $moduleIds,
            'modulePackIds' => $this->normalizePackSelections($state, $moduleIds, $action['modulePackIds'] ?? []),
            'moduleFeatures' => is_array($action['moduleFeatures'] ?? null) ? $action['moduleFeatures'] : [],
            'requirements' => $this->uniqueStrings($action['requirements'] ?? []),
            'nextSteps' => [
                'Valider les modules, packs et fonctionnalités proposés.',
                'Compléter les informations de contact et le mot de passe de l’administrateur.',
                'Soumettre la demande d’entreprise pour approbation MAXIMUS.',
            ],
        ];
    }

    /**
     * @param array<string, mixed> $pack
     * @param array<int, string> $moduleFeatures
     * @param array<int, array<string, mixed>> $existingPacks
     * @return array<string, mixed>
     */
    private function normalizePack(array $pack, string $moduleId, array $moduleFeatures, array $existingPacks): array
    {
        $name = trim((string) ($pack['name'] ?? ''));
        $description = trim((string) ($pack['description'] ?? ''));
        $id = Str::slug((string) ($pack['id'] ?? ($moduleId.'-'.$name)));
        $featureIds = $this->uniqueSlugs($pack['featureIds'] ?? []);
        $knownFeatureIds = collect($moduleFeatures)
            ->map(fn (mixed $feature): string => Str::slug((string) $feature))
            ->merge(
                collect($existingPacks)->flatMap(
                    static fn (mixed $item): array => is_array($item) && is_array($item['featureIds'] ?? null)
                        ? $item['featureIds']
                        : [],
                ),
            )
            ->filter()
            ->unique()
            ->values()
            ->all();

        if ($id === '' || $name === '' || $description === '') {
            throw new RuntimeException('Un pack doit avoir un identifiant, un nom et une description.');
        }
        if ($featureIds === []) {
            throw new RuntimeException('Un pack doit contenir au moins une fonctionnalité.');
        }
        if (array_diff($featureIds, $knownFeatureIds) !== []) {
            throw new RuntimeException('Le pack référence une fonctionnalité absente du module.');
        }

        return [
            'id' => $id,
            'name' => $name,
            'description' => $description,
            'featureIds' => $featureIds,
            'featurePermissions' => is_array($pack['featurePermissions'] ?? null) ? $pack['featurePermissions'] : [],
        ];
    }

    /**
     * @param array<string, mixed> $action
     */
    private function updateCompany(array $action): void
    {
        $company = Company::query()
            ->whereKey((string) $action['companyId'])
            ->whereNull('deleted_at')
            ->lockForUpdate()
            ->first();
        if (! $company) {
            throw new RuntimeException('L’entreprise à modifier est introuvable ou inactive.');
        }

        $changes = [];
        foreach ([
            'name' => 'name',
            'manager' => 'manager',
            'email' => 'email',
            'phone' => 'phone',
            'country' => 'country',
            'sector' => 'sector',
            'primaryColor' => 'primary_color',
            'accentColor' => 'accent_color',
            'sidebarColor' => 'sidebar_color',
        ] as $inputKey => $column) {
            if (! array_key_exists($inputKey, $action['changes'])) {
                continue;
            }
            $value = (string) $action['changes'][$inputKey];
            $changes[$column] = in_array($inputKey, ['primaryColor', 'accentColor', 'sidebarColor'], true)
                ? strtoupper($value)
                : $value;
        }

        $company->update($changes);
        if (isset($changes['email']) || isset($changes['manager'])) {
            AuthUser::query()
                ->where('company_id', $company->id)
                ->where('role', 'company_admin')
                ->update([
                    ...(isset($changes['email']) ? ['email' => $changes['email']] : []),
                    ...(isset($changes['manager']) ? ['display_name' => $changes['manager']] : []),
                    'updated_at' => now(),
                ]);
        }
    }

    /**
     * @param array<string, mixed> $state
     * @param array<string, mixed> $action
     */
    private function apply(array &$state, array $action): void
    {
        $state['catalogDraft'] = is_array($state['catalogDraft'] ?? null)
            ? $state['catalogDraft']
            : [
                'moduleOverrides' => $state['moduleOverrides'] ?? [],
                'moduleStatuses' => $state['moduleStatuses'] ?? [],
                'removedModules' => $state['removedModules'] ?? [],
                'sectorPresets' => $state['sectorPresets'] ?? [],
                'customModules' => $state['customModules'] ?? [],
                'updatedAt' => now()->toISOString(),
            ];
        $state['catalogDraft']['customModules'] ??= $state['customModules'] ?? [];

        if ($action['type'] === 'create_module') {
            $state['catalogDraft']['customModules'][] = [
                'id' => $action['id'],
                'name' => $action['name'],
                'description' => $action['description'],
                'features' => $action['features'],
                'featurePacks' => $action['featurePacks'],
                'status' => 'ACTIF',
            ];
        } elseif ($action['type'] === 'create_pack') {
            $moduleId = (string) $action['moduleId'];
            $customIndex = collect($state['catalogDraft']['customModules'])->search(
                static fn (mixed $module): bool => is_array($module) && ($module['id'] ?? null) === $moduleId,
            );
            if ($customIndex !== false) {
                $state['catalogDraft']['customModules'][$customIndex]['featurePacks'][] = [
                    'id' => $action['id'],
                    'name' => $action['name'],
                    'description' => $action['description'],
                    'featureIds' => $action['featureIds'],
                    'featurePermissions' => $action['featurePermissions'],
                ];
            } else {
                $override = $state['catalogDraft']['moduleOverrides'][$moduleId] ?? [];
                $base = $this->findModule($state, $moduleId) ?? [];
                $override['featurePacks'] = [
                    ...(is_array($base['featurePacks'] ?? null) ? $base['featurePacks'] : []),
                    ...(is_array($override['featurePacks'] ?? null) ? $override['featurePacks'] : []),
                    [
                        'id' => $action['id'],
                        'name' => $action['name'],
                        'description' => $action['description'],
                        'featureIds' => $action['featureIds'],
                        'featurePermissions' => $action['featurePermissions'],
                    ],
                ];
                $state['catalogDraft']['moduleOverrides'][$moduleId] = $override;
            }
        } elseif ($action['type'] === 'create_organization_unit') {
            $state['orgNodes'] ??= [];
            $state['orgNodes'][] = [
                'id' => $action['id'],
                'companyId' => $action['companyId'],
                'code' => $action['code'],
                'name' => $action['name'],
                'parentId' => $action['parentId'],
                'moduleIds' => $action['moduleIds'],
                'modulePackIds' => $action['modulePackIds'],
                'moduleFeatures' => $action['moduleFeatures'],
            ];
            $state['organizationVersion'] = ((int) ($state['organizationVersion'] ?? 0)) + 1;
        } elseif ($action['type'] === 'create_feature') {
            $moduleId = (string) $action['moduleId'];
            $customIndex = collect($state['catalogDraft']['customModules'])->search(
                static fn (mixed $module): bool => is_array($module) && ($module['id'] ?? null) === $moduleId,
            );
            if ($customIndex !== false) {
                $module = $state['catalogDraft']['customModules'][$customIndex];
                $module['features'] = $this->uniqueStrings([
                    ...($module['features'] ?? []),
                    (string) $action['name'],
                ]);
                if (($action['dependencies'] ?? []) !== []) {
                    $module['featureDependencies'] = [
                        ...($module['featureDependencies'] ?? []),
                        (string) $action['id'] => $action['dependencies'],
                    ];
                }
                $state['catalogDraft']['customModules'][$customIndex] = $module;
            } else {
                $override = $state['catalogDraft']['moduleOverrides'][$moduleId]
                    ?? $state['moduleOverrides'][$moduleId]
                    ?? [];
                $override['features'] = $this->uniqueStrings([
                    ...($override['features'] ?? ($this->findModule($state, $moduleId)['features'] ?? [])),
                    (string) $action['name'],
                ]);
                if (($action['dependencies'] ?? []) !== []) {
                    $override['featureDependencies'] = [
                        ...($override['featureDependencies'] ?? []),
                        (string) $action['id'] => $action['dependencies'],
                    ];
                }
                $state['catalogDraft']['moduleOverrides'][$moduleId] = $override;
            }
        } elseif ($action['type'] === 'create_sector') {
            $state['catalogDraft']['sectorPresets'] ??= $state['sectorPresets'] ?? [];
            $state['catalogDraft']['sectorPresets'][] = [
                'id' => $action['id'],
                'name' => $action['name'],
                'moduleIds' => $action['moduleIds'],
                'modulePackIds' => $action['modulePackIds'],
                'moduleFeatures' => $action['moduleFeatures'],
                'businessProfiles' => $action['businessProfiles'],
            ];
        } elseif ($action['type'] === 'create_company_plan') {
            $state['companySetupPlans'] ??= [];
            $state['companySetupPlans'][] = [
                ...$action,
                'status' => 'DRAFT',
                'createdAt' => now()->toISOString(),
            ];
        } elseif ($action['type'] === 'update_company') {
            $state['companies'] ??= [];
            $companyIndex = collect($state['companies'])->search(
                static fn (mixed $company): bool => is_array($company)
                    && (string) ($company['id'] ?? '') === (string) $action['companyId'],
            );
            if ($companyIndex !== false) {
                foreach ($action['changes'] as $field => $value) {
                    $state['companies'][$companyIndex][$field] = $value;
                }
            }
        }

        $state['catalogDraft']['updatedAt'] = now()->toISOString();
    }

    /**
     * @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    private function workspaceStateFrom(array $state): array
    {
        return $state;
    }

    /**
     * @param mixed $payload
     * @return array<string, mixed>
     */
    private function decodePayload(mixed $payload): array
    {
        $decoded = is_string($payload) ? json_decode($payload, true) : $payload;
        return is_array($decoded) ? $decoded : [];
    }

    /** @return array<string, mixed> */
    private function workspaceState(): array
    {
        $row = DB::table('maximus_app_states')->where('scope', 'workspace')->first();
        return $this->decodePayload($row?->payload);
    }

    /**
     * @param array<string, mixed> $state
     * @return array<string, mixed>|null
     */
    private function findModule(array $state, string $moduleId): ?array
    {
        $custom = collect($state['catalogDraft']['customModules'] ?? [])
            ->merge($state['customModules'] ?? [])
            ->first(static fn (mixed $module): bool => is_array($module) && ($module['id'] ?? null) === $moduleId);
        if (is_array($custom)) {
            return $custom;
        }

        $definition = collect(ModuleCatalog::definitions())->first(
            static fn (array $module): bool => ($module['id'] ?? null) === $moduleId,
        );
        if (!is_array($definition)) {
            return null;
        }

        $override = $state['catalogDraft']['moduleOverrides'][$moduleId]
            ?? $state['moduleOverrides'][$moduleId]
            ?? [];
        return [
            ...$definition,
            'featurePacks' => [
                ...($definition['feature_packs'] ?? []),
                ...($override['featurePacks'] ?? []),
            ],
            'features' => $override['features'] ?? ($definition['features'] ?? []),
        ];
    }

    private function resolveModuleId(array $state, string $reference): ?string
    {
        $needle = Str::slug($reference);
        if ($needle === '') {
            return null;
        }

        foreach ($this->availableModules($state) as $moduleId => $module) {
            if (Str::slug((string) $moduleId) === $needle || Str::slug((string) ($module['name'] ?? '')) === $needle) {
                return (string) $moduleId;
            }
        }

        return null;
    }

    /**
     * @param array<string, mixed> $state
     * @param array<int, string> $moduleIds
     * @param mixed $selections
     * @return array<string, array<int, string>>
     */
    private function normalizePackSelections(array $state, array $moduleIds, mixed $selections): array
    {
        if (! is_array($selections)) {
            return [];
        }

        $modules = $this->availableModules($state);
        $normalized = [];
        foreach ($selections as $moduleReference => $packReferences) {
            $moduleId = $this->resolveModuleId($state, (string) $moduleReference);
            if (! $moduleId || ! in_array($moduleId, $moduleIds, true)) {
                throw new RuntimeException('Une sélection de pack référence un module absent.');
            }
            $module = $modules[$moduleId] ?? null;
            $packs = is_array($module['featurePacks'] ?? null) ? $module['featurePacks'] : [];
            $normalized[$moduleId] = [];
            foreach (is_array($packReferences) ? $packReferences : [$packReferences] as $packReference) {
                $packNeedle = Str::slug((string) $packReference);
                $pack = collect($packs)->first(
                    static fn (mixed $candidate): bool => is_array($candidate)
                        && (
                            Str::slug((string) ($candidate['id'] ?? '')) === $packNeedle
                            || Str::slug((string) ($candidate['name'] ?? '')) === $packNeedle
                        ),
                );
                if (! is_array($pack)) {
                    throw new RuntimeException("Le pack « {$packReference} » est absent du module « {$moduleId} ».");
                }
                $normalized[$moduleId][] = (string) $pack['id'];
            }
            $normalized[$moduleId] = array_values(array_unique($normalized[$moduleId]));
        }

        return $normalized;
    }

    /** @return array<string, array<string, mixed>> */
    private function availableModules(array $state): array
    {
        $modules = [];
        foreach (ModuleCatalog::definitions() as $module) {
            $modules[(string) $module['id']] = $this->findModule($state, (string) $module['id']) ?? $module;
        }
        foreach (array_merge($state['customModules'] ?? [], $state['catalogDraft']['customModules'] ?? []) as $module) {
            if (is_array($module) && is_string($module['id'] ?? null)) {
                $modules[$module['id']] = $module;
            }
        }
        return $modules;
    }

    /**
     * @param array<string, mixed> $state
     * @return array<string, mixed>|null
     */
    private function findOrganizationNode(array $state, string $nodeId): ?array
    {
        $node = collect($state['orgNodes'] ?? [])->first(
            static fn (mixed $item): bool => is_array($item) && ($item['id'] ?? null) === $nodeId,
        );
        return is_array($node) ? $node : null;
    }

    /** @param mixed $values @return array<int, string> */
    private function uniqueStrings(mixed $values): array
    {
        if (!is_array($values)) {
            return [];
        }
        return collect($values)
            ->filter(fn (mixed $value): bool => is_string($value) && trim($value) !== '')
            ->map(fn (string $value): string => trim($value))
            ->unique(fn (string $value): string => strtolower($value))
            ->values()
            ->all();
    }

    /** @param mixed $values @return array<int, string> */
    private function uniqueSlugs(mixed $values): array
    {
        if (!is_array($values)) {
            return [];
        }
        return collect($values)
            ->filter(fn (mixed $value): bool => is_string($value) && trim($value) !== '')
            ->map(fn (string $value): string => Str::slug($value))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    /** @param array<string, mixed> $action */
    private function previewMessage(array $action): string
    {
        return match ($action['type']) {
            'create_module' => "MAXI a préparé la création du module « {$action['name']} » dans le brouillon du catalogue. Confirmez pour l’enregistrer.",
            'create_pack' => "MAXI a préparé la création du pack « {$action['name']} » dans le module « {$action['moduleId']} ». Confirmez pour l’enregistrer.",
            'create_feature' => "MAXI a préparé l’ajout de la fonctionnalité « {$action['name']} » au module « {$action['moduleId']} ». Confirmez pour l’enregistrer dans le brouillon.",
            'create_sector' => "MAXI a préparé le secteur « {$action['name']} » avec {$this->count($action['moduleIds'] ?? [])} module(s). Confirmez pour l’enregistrer dans le brouillon.",
            'create_company_plan' => "MAXI a préparé le plan de configuration de l’entreprise « {$action['name']} ». Confirmez pour enregistrer ce plan sans activer l’entreprise.",
            'create_organization_unit' => "MAXI a préparé la création de l’unité « {$action['name']} » dans « {$action['companyName']} ». Confirmez pour l’enregistrer.",
            'update_company' => "MAXI a préparé la modification de l’entreprise « {$action['companyName']} ». Champs concernés : {$this->changedFields($action)}. Confirmez pour l’enregistrer.",
            default => 'MAXI a préparé une action contrôlée. Confirmez pour continuer.',
        };
    }

    /** @param array<string, mixed> $action */
    private function executedMessage(array $action): string
    {
        return match ($action['type']) {
            'create_module' => "Le module « {$action['name']} » a été ajouté au brouillon du catalogue. Validez puis publiez le catalogue depuis son espace pour l’activer.",
            'create_pack' => "Le pack « {$action['name']} » a été ajouté au brouillon du catalogue. Validez puis publiez le catalogue depuis son espace.",
            'create_feature' => "La fonctionnalité « {$action['name']} » a été ajoutée au brouillon du module « {$action['moduleId']} ». Validez puis publiez le catalogue.",
            'create_sector' => "Le secteur « {$action['name']} » a été ajouté au brouillon du catalogue. Vérifiez ses packs et publiez le catalogue avant de le proposer à une entreprise.",
            'create_company_plan' => "Le plan de configuration de « {$action['name']} » est enregistré en brouillon. Complétez le contact, puis soumettez la demande d’entreprise pour approbation.",
            'create_organization_unit' => "L’unité « {$action['name']} » a été créée dans « {$action['companyName']} » avec les modules et packs validés.",
            'update_company' => "L’entreprise « {$action['companyName']} » a été modifiée. Les informations ont été synchronisées avec son compte administrateur.",
            default => 'L’action MAXI a été exécutée.',
        };
    }

    /** @param array<string, mixed> $action */
    private function changedFields(array $action): string
    {
        $labels = [
            'name' => 'nom',
            'manager' => 'responsable',
            'email' => 'email',
            'phone' => 'téléphone',
            'country' => 'pays',
            'sector' => 'secteur',
            'primaryColor' => 'couleur principale',
            'accentColor' => 'couleur d’accent',
            'sidebarColor' => 'couleur du menu',
        ];

        return collect(array_keys(is_array($action['changes'] ?? null) ? $action['changes'] : []))
            ->map(fn (string $field): string => $labels[$field] ?? $field)
            ->implode(', ');
    }

    private function count(mixed $value): int
    {
        return is_countable($value) ? count($value) : 0;
    }

    /** @param array<string, mixed> $state @param array<string, mixed> $action @param array<string, mixed> $actor */
    private function appendAudit(array &$state, array $action, array $actor): void
    {
        $state['auditEntries'] ??= [];
        $state['auditEntries'][] = [
            'id' => 'audit-'.Str::lower(Str::random(16)),
            'action' => 'MAXI_ACTION_CONFIRMED',
            'summary' => $this->executedMessage($action),
            'actorName' => (string) ($actor['displayName'] ?? $actor['email'] ?? 'Administration MAXIMUS'),
            'entityType' => $action['type'],
            'entityId' => $action['id'] ?? null,
            'createdAt' => now()->toISOString(),
        ];
    }
}