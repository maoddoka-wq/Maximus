<?php

namespace App\Services;

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
            'create_organization_unit' => $this->normalizeOrganizationAction($action, $state),
            default => throw new RuntimeException('MAXI ne peut pas exécuter cette action de sécurité.'),
        };
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
            'create_organization_unit' => "MAXI a préparé la création de l’unité « {$action['name']} » dans « {$action['companyName']} ». Confirmez pour l’enregistrer.",
            default => 'MAXI a préparé une action contrôlée. Confirmez pour continuer.',
        };
    }

    /** @param array<string, mixed> $action */
    private function executedMessage(array $action): string
    {
        return match ($action['type']) {
            'create_module' => "Le module « {$action['name']} » a été ajouté au brouillon du catalogue. Validez puis publiez le catalogue depuis son espace pour l’activer.",
            'create_pack' => "Le pack « {$action['name']} » a été ajouté au brouillon du catalogue. Validez puis publiez le catalogue depuis son espace.",
            'create_organization_unit' => "L’unité « {$action['name']} » a été créée dans « {$action['companyName']} » avec les modules et packs validés.",
            default => 'L’action MAXI a été exécutée.',
        };
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