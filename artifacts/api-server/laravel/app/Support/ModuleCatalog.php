<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class ModuleCatalog
{
    public static function definitions(): array
    {
        return [
            ['id' => 'commerce', 'name' => 'Gestion commerciale', 'description' => 'Ventes, clients et performance commerciale.', 'features' => ['Clients', 'Devis et commandes', 'Chiffre d’affaires']],
            ['id' => 'ventes', 'name' => 'Ventes', 'description' => 'Devis, commandes, factures et paiements clients.', 'features' => ['Devis', 'Commandes', 'Facturation']],
            ['id' => 'achats', 'name' => 'Achats', 'description' => 'Demandes, commandes et suivi des achats.', 'features' => ['Demandes d’achat', 'Commandes fournisseurs', 'Réceptions']],
            ['id' => 'stocks', 'name' => 'Gestion de stock', 'description' => 'Articles, entrées, sorties et niveaux de stock.', 'features' => ['Articles', 'Entrées et sorties', 'Alertes de seuil']],
            ['id' => 'finance', 'name' => 'Finance', 'description' => 'Trésorerie, paiements et pilotage financier.', 'features' => ['Suivi des paiements', 'Trésorerie', 'Rapports financiers']],
            ['id' => 'comptabilite', 'name' => 'Comptabilité', 'description' => 'Écritures, rapprochements et clôture comptable.', 'features' => ['Plan comptable', 'Journaux', 'Rapprochement']],
            ['id' => 'rh', 'name' => 'Ressources humaines', 'description' => 'Collaborateurs, rôles et organisation.', 'features' => ['Employés', 'Rôles', 'Organisation']],
            ['id' => 'presences', 'name' => 'Présences', 'description' => 'Présences et suivi quotidien des équipes.', 'features' => ['Pointage', 'Historique', 'Rapports']],
            ['id' => 'paie', 'name' => 'Paie', 'description' => 'Préparation et suivi des bulletins de salaire.', 'features' => ['Périodes de paie', 'Bulletins', 'Déclarations']],
            ['id' => 'crm', 'name' => 'CRM / Clients', 'description' => 'Fiches clients, opportunités et relances.', 'features' => ['Fiches clients', 'Opportunités', 'Relances']],
            ['id' => 'fournisseurs', 'name' => 'Fournisseurs', 'description' => 'Référentiel et relations fournisseurs.', 'features' => ['Référentiel', 'Évaluation', 'Historique']],
            ['id' => 'logistique', 'name' => 'Logistique', 'description' => 'Entrepôts, livraisons et transport.', 'features' => ['Entrepôts', 'Livraisons', 'Transport']],
            ['id' => 'documents', 'name' => 'Documents', 'description' => 'Classement et circulation des documents métier.', 'features' => ['Classement', 'Partage', 'Versions']],
            ['id' => 'rapports', 'name' => 'Rapports', 'description' => 'Synthèses et indicateurs pour décider plus vite.', 'features' => ['Rapports métier', 'Filtres', 'Exports']],
            ['id' => 'controle', 'name' => 'Contrôle', 'description' => 'Tâches, décisions, événements et audit.', 'features' => ['Tâches', 'Décisions', 'Traçabilité']],
        ];
    }

    public static function ensureCatalog(): void
    {
        foreach (self::definitions() as $definition) {
            DB::table('maximus_modules')->updateOrInsert(
                ['id' => $definition['id']],
                [
                    'name' => $definition['name'],
                    'description' => $definition['description'],
                    'features' => json_encode($definition['features'], JSON_UNESCAPED_UNICODE),
                    'feature_dependencies' => json_encode([], JSON_UNESCAPED_UNICODE),
                    'status' => 'ACTIF',
                    'updated_at' => now(),
                    'created_at' => now(),
                ],
            );

            foreach (self::featureDefinitions($definition) as $sortOrder => $feature) {
                DB::table('maximus_module_features')->updateOrInsert(
                    [
                        'module_id' => $definition['id'],
                        'feature_key' => $feature['key'],
                    ],
                    [
                        'id' => 'module-feature-'.Str::slug($definition['id'].'-'.$feature['key']),
                        'label' => $feature['label'],
                        'description' => $feature['description'],
                        'actions' => json_encode($feature['actions'], JSON_UNESCAPED_UNICODE),
                        'dependencies' => json_encode($feature['dependencies'], JSON_UNESCAPED_UNICODE),
                        'status' => 'ACTIF',
                        'sort_order' => $sortOrder,
                        'updated_at' => now(),
                        'created_at' => now(),
                    ],
                );
            }
        }
    }

    public static function featureDefinitions(array $definition): array
    {
        return array_map(
            static fn (string $label): array => [
                'key' => Str::slug($label),
                'label' => $label,
                'description' => '',
                'actions' => ['voir', 'créer', 'modifier'],
                'dependencies' => [],
            ],
            $definition['features'],
        );
    }

    public static function ensureCompanyAccess(string $companyId, ?array $moduleIds = null, string $status = 'ACTIF'): void
    {
        self::ensureCatalog();
        $allowed = $moduleIds ?? array_column(self::definitions(), 'id');
        foreach ($allowed as $moduleId) {
            if (!collect(self::definitions())->contains('id', $moduleId)) {
                continue;
            }

            DB::table('maximus_company_modules')->updateOrInsert(
                ['company_id' => $companyId, 'module_id' => $moduleId],
                [
                    'id' => 'company-module-'.Str::slug($companyId.'-'.$moduleId),
                    'status' => $status,
                    'feature_ids' => json_encode([], JSON_UNESCAPED_UNICODE),
                    'configuration' => json_encode([], JSON_UNESCAPED_UNICODE),
                    'updated_at' => now(),
                    'created_at' => now(),
                ],
            );
        }
    }

    public static function isEnabled(string $companyId, string $moduleId): bool
    {
        return DB::table('maximus_company_modules')
            ->where('company_id', $companyId)
            ->where('module_id', $moduleId)
            ->whereIn('status', ['ACTIF', 'BETA'])
            ->exists();
    }

    public static function bootstrap(string $companyId): array
    {
        self::ensureCatalog();
        $access = DB::table('maximus_company_modules')
            ->where('company_id', $companyId)
            ->get()
            ->keyBy('module_id');
        $features = DB::table('maximus_module_features')
            ->where('status', 'ACTIF')
            ->orderBy('sort_order')
            ->get()
            ->groupBy('module_id');

        return collect(self::definitions())->map(function (array $definition) use ($access, $features): array {
            $row = $access->get($definition['id']);
            $featureCatalog = $features->get($definition['id'], collect())->map(
                static fn ($feature): array => [
                    'id' => $feature->id,
                    'key' => $feature->feature_key,
                    'label' => $feature->label,
                    'description' => $feature->description,
                    'actions' => json_decode($feature->actions ?? '[]', true),
                    'dependencies' => json_decode($feature->dependencies ?? '[]', true),
                    'status' => $feature->status,
                ],
            )->values()->all();
            $featureIds = $row ? json_decode($row->feature_ids ?? '[]', true) : [];
            if (!is_array($featureIds) || $featureIds === []) {
                $featureIds = array_column($featureCatalog, 'key');
            }
            return [
                ...$definition,
                'status' => $row?->status ?? 'INACTIF',
                'featureIds' => $featureIds,
                'featureCatalog' => $featureCatalog,
                'configuration' => $row ? json_decode($row->configuration ?? '{}', true) : [],
            ];
        })->all();
    }

    public static function catalog(): array
    {
        self::ensureCatalog();
        $features = DB::table('maximus_module_features')
            ->orderBy('sort_order')
            ->get()
            ->groupBy('module_id');

        return collect(self::definitions())->map(function (array $definition) use ($features): array {
            return [
                ...$definition,
                'featureCatalog' => $features->get($definition['id'], collect())->map(
                    static fn ($feature): array => [
                        'id' => $feature->id,
                        'key' => $feature->feature_key,
                        'label' => $feature->label,
                        'description' => $feature->description,
                        'actions' => json_decode($feature->actions ?? '[]', true),
                        'dependencies' => json_decode($feature->dependencies ?? '[]', true),
                        'status' => $feature->status,
                    ],
                )->values()->all(),
            ];
        })->all();
    }
}