<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class ModuleCatalog
{
    public static function definitions(): array
    {
        return [
            [
                'id' => 'commerce',
                'name' => 'Gestion commerciale',
                'description' => 'Piloter les ventes, les clients, les achats et la performance commerciale.',
                'features' => ['Clients', 'Devis et commandes', 'Chiffre d’affaires'],
                'feature_ids' => ['dashboard', 'sales', 'products', 'clients', 'suppliers', 'purchases', 'expenses', 'cash', 'credit', 'invoices', 'returns', 'reports', 'activity', 'team', 'settings'],
                'feature_packs' => [
                    ['id' => 'commerce-consultation', 'name' => 'Consultation commerciale', 'description' => 'Consulter les clients et le suivi commercial.', 'feature_ids' => ['dashboard', 'clients']],
                    ['id' => 'commerce-gestion', 'name' => 'Gestion commerciale', 'description' => 'Gérer les ventes, clients et indicateurs.', 'feature_ids' => ['dashboard', 'clients', 'sales', 'products', 'reports']],
                    [
                        'id' => 'commerce-employe',
                        'name' => 'Employé commercial',
                        'description' => 'Gérer les clients et suivre les ventes confiées à l’employé.',
                        'feature_ids' => ['dashboard', 'clients', 'sales'],
                        'feature_permissions' => [
                            'dashboard' => ['voir'],
                            'clients' => ['voir', 'créer', 'modifier'],
                            'sales' => ['voir', 'créer', 'modifier'],
                        ],
                    ],
                    [
                        'id' => 'commerce-manager',
                        'name' => 'Manager commercial',
                        'description' => 'Piloter les ventes, les clients, les produits et les résultats de l’équipe.',
                        'feature_ids' => ['dashboard', 'sales', 'products', 'clients', 'suppliers', 'purchases', 'expenses', 'cash', 'credit', 'invoices', 'returns', 'reports', 'activity'],
                        'feature_permissions' => [
                            'dashboard' => ['voir'],
                            'sales' => ['voir', 'créer', 'modifier'],
                            'products' => ['voir', 'créer', 'modifier'],
                            'clients' => ['voir', 'créer', 'modifier'],
                            'suppliers' => ['voir', 'créer', 'modifier'],
                            'purchases' => ['voir', 'créer', 'modifier'],
                            'expenses' => ['voir', 'créer', 'modifier'],
                            'cash' => ['voir', 'modifier'],
                            'credit' => ['voir', 'modifier'],
                            'invoices' => ['voir', 'créer', 'modifier'],
                            'returns' => ['voir', 'créer', 'modifier'],
                            'reports' => ['voir'],
                            'activity' => ['voir'],
                        ],
                    ],
                ],
            ],
            [
                'id' => 'ecommerce',
                'name' => 'E-commerce',
                'description' => 'Boutique en ligne, catalogue public et commandes clients.',
                    'features' => ['Tableau de bord', 'Catalogue', 'Vente physique', 'Vente numérique', 'Catégories', 'Commandes', 'Clients', 'Promotions', 'Location', 'Livraisons', 'Finances', 'Paramètres'],
                'feature_ids' => ['dashboard', 'catalogue', 'vente-physique', 'vente-numerique', 'categories', 'commandes', 'clients', 'promotions', 'location', 'livraisons', 'finances', 'parametres'],
                'feature_packs' => [
                    ['id' => 'ecommerce-catalogue', 'name' => 'Catalogue en ligne', 'description' => 'Publier une boutique et présenter vos produits.', 'feature_ids' => ['dashboard', 'catalogue', 'vente-physique', 'categories', 'finances', 'parametres']],
                    ['id' => 'ecommerce-gestion', 'name' => 'Gestion e-commerce', 'description' => 'Piloter le catalogue, les ventes physiques et les clients.', 'feature_ids' => ['dashboard', 'catalogue', 'vente-physique', 'categories', 'commandes', 'clients', 'finances', 'parametres']],
                    ['id' => 'ecommerce-vente-numerique', 'name' => 'Vente de produits numériques', 'description' => 'Publier des fichiers numériques et les délivrer après paiement.', 'feature_ids' => ['dashboard', 'catalogue', 'vente-numerique', 'categories', 'commandes', 'clients', 'finances', 'parametres']],
                    ['id' => 'ecommerce-vente-complete', 'name' => 'Ventes physiques et numériques', 'description' => 'Vendre des produits physiques et des produits numériques dans la même boutique.', 'feature_ids' => ['dashboard', 'catalogue', 'vente-physique', 'vente-numerique', 'categories', 'commandes', 'clients', 'finances', 'parametres']],
                    ['id' => 'ecommerce-location', 'name' => 'Location & réservation', 'description' => 'Présenter et gérer les offres de location de maisons, bâches, véhicules et équipements.', 'feature_ids' => ['dashboard', 'catalogue', 'vente-physique', 'categories', 'location', 'commandes', 'clients', 'parametres']],
                    ['id' => 'ecommerce-supervision', 'name' => 'Supervision boutique', 'description' => 'Superviser les ventes physiques et numériques, les promotions, la location, les livraisons et les retraits.', 'feature_ids' => ['dashboard', 'catalogue', 'vente-physique', 'vente-numerique', 'categories', 'commandes', 'clients', 'promotions', 'location', 'livraisons', 'finances', 'parametres']],
                    [
                        'id' => 'ecommerce-employe',
                        'name' => 'Employé e-commerce',
                        'description' => 'Traiter les commandes et accompagner les clients sans modifier la configuration de la boutique.',
                        'feature_ids' => ['dashboard', 'commandes', 'clients'],
                        'feature_permissions' => [
                            'dashboard' => ['voir'],
                            'commandes' => ['voir', 'modifier'],
                            'clients' => ['voir'],
                        ],
                    ],
                    [
                        'id' => 'ecommerce-manager',
                        'name' => 'Manager e-commerce',
                        'description' => 'Piloter la boutique, le catalogue, les ventes, les livraisons et les résultats.',
                        'feature_ids' => ['dashboard', 'catalogue', 'vente-physique', 'vente-numerique', 'categories', 'commandes', 'clients', 'promotions', 'location', 'livraisons', 'finances', 'parametres'],
                        'feature_permissions' => [
                            'dashboard' => ['voir'],
                            'catalogue' => ['voir', 'créer', 'modifier'],
                            'vente-physique' => ['voir', 'créer', 'modifier'],
                            'vente-numerique' => ['voir', 'créer', 'modifier'],
                            'categories' => ['voir', 'créer', 'modifier'],
                            'commandes' => ['voir', 'créer', 'modifier'],
                            'clients' => ['voir'],
                            'promotions' => ['voir', 'créer', 'modifier'],
                            'location' => ['voir', 'créer', 'modifier'],
                            'livraisons' => ['voir', 'créer', 'modifier'],
                            'finances' => ['voir', 'créer', 'modifier'],
                            'parametres' => ['voir', 'modifier'],
                        ],
                    ],
                ],
                'feature_dependencies' => [
                    'commandes' => ['catalogue'],
                    'categories' => ['catalogue'],
                    'promotions' => ['catalogue'],
                    'location' => ['catalogue'],
                    'vente-physique' => ['catalogue'],
                    'vente-numerique' => ['catalogue'],
                    'livraisons' => ['commandes'],
                ],
            ],
            [
                'id' => 'stocks',
                'name' => 'Gestion de stock',
                'description' => 'Suivre les articles, les entrées, les sorties et les niveaux de stock.',
                'features' => ['Articles', 'Entrées et sorties', 'Alertes de seuil'],
                'feature_packs' => [
                    ['id' => 'stock-consultation', 'name' => 'Consultation du stock', 'description' => 'Consulter les articles et les niveaux de stock.', 'feature_ids' => ['dashboard', 'products', 'reports']],
                    ['id' => 'stock-gestion', 'name' => 'Gestionnaire de stock', 'description' => 'Gérer les entrées, sorties et inventaires.', 'feature_ids' => ['dashboard', 'products', 'entries', 'exits', 'inventory', 'reports']],
                    ['id' => 'stock-responsable', 'name' => 'Responsable de stock', 'description' => 'Piloter les opérations et les paramètres du stock.', 'feature_ids' => ['dashboard', 'products', 'entries', 'exits', 'requests', 'inventory', 'reports', 'references', 'users', 'settings']],
                    [
                        'id' => 'stocks-employe',
                        'name' => 'Employé de stock',
                        'description' => 'Consulter les articles et enregistrer les mouvements de stock autorisés.',
                        'feature_ids' => ['dashboard', 'products', 'entries', 'exits', 'requests'],
                        'feature_permissions' => [
                            'dashboard' => ['voir'],
                            'products' => ['voir'],
                            'entries' => ['voir', 'créer'],
                            'exits' => ['voir', 'créer'],
                            'requests' => ['voir', 'créer'],
                        ],
                    ],
                    [
                        'id' => 'stocks-manager',
                        'name' => 'Manager de stock',
                        'description' => 'Superviser les mouvements, les inventaires, les référentiels et les utilisateurs du stock.',
                        'feature_ids' => ['dashboard', 'products', 'entries', 'exits', 'requests', 'inventory', 'reports', 'references', 'users', 'settings'],
                        'feature_permissions' => [
                            'dashboard' => ['voir'],
                            'products' => ['voir', 'créer', 'modifier'],
                            'entries' => ['voir', 'créer', 'modifier'],
                            'exits' => ['voir', 'créer', 'modifier'],
                            'requests' => ['voir', 'créer', 'modifier'],
                            'inventory' => ['voir', 'créer', 'modifier'],
                            'reports' => ['voir'],
                            'references' => ['voir', 'créer', 'modifier'],
                            'users' => ['voir', 'modifier'],
                            'settings' => ['voir', 'modifier'],
                        ],
                    ],
                ],
            ],
            [
                'id' => 'presences',
                'name' => 'Présences',
                'description' => 'Présences et suivi quotidien des équipes.',
                'features' => ['Tableau de bord', 'Pointage', 'Présences', 'Absences', 'Horaires', 'Congés', 'Historique', 'Rapports'],
                'feature_packs' => [
                    ['id' => 'presence-consultation', 'name' => 'Consultation des présences', 'description' => 'Consulter les indicateurs, présences, absences et historiques.', 'feature_ids' => ['tableau-de-bord', 'présences', 'absences', 'historique']],
                    ['id' => 'presence-gestion', 'name' => 'Gestionnaire des présences', 'description' => 'Saisir le pointage et gérer les absences, horaires et congés.', 'feature_ids' => ['tableau-de-bord', 'présences', 'absences', 'historique', 'pointage', 'horaires', 'congés']],
                    ['id' => 'presence-supervision', 'name' => 'Responsable des présences', 'description' => 'Superviser l’activité, corriger les données et produire les rapports.', 'feature_ids' => ['tableau-de-bord', 'présences', 'absences', 'historique', 'pointage', 'horaires', 'congés', 'rapports']],
                    [
                        'id' => 'presence-employe',
                        'name' => 'Employé Présences',
                        'description' => 'Pointer, consulter son historique et suivre ses absences et congés.',
                        'feature_ids' => ['tableau-de-bord', 'pointage', 'absences', 'congés', 'historique'],
                        'feature_permissions' => [
                            'tableau-de-bord' => ['voir'],
                            'pointage' => ['voir', 'créer'],
                            'absences' => ['voir', 'créer'],
                            'congés' => ['voir', 'créer'],
                            'historique' => ['voir'],
                        ],
                    ],
                    [
                        'id' => 'presence-manager',
                        'name' => 'Manager Présences',
                        'description' => 'Piloter les horaires, les absences, les congés et les rapports de l’équipe.',
                        'feature_ids' => ['tableau-de-bord', 'présences', 'absences', 'historique', 'pointage', 'horaires', 'congés', 'rapports'],
                        'feature_permissions' => [
                            'tableau-de-bord' => ['voir'],
                            'présences' => ['voir', 'créer', 'modifier'],
                            'absences' => ['voir', 'créer', 'modifier'],
                            'historique' => ['voir', 'créer', 'modifier'],
                            'pointage' => ['voir', 'créer', 'modifier'],
                            'horaires' => ['voir', 'créer', 'modifier'],
                            'congés' => ['voir', 'créer', 'modifier'],
                            'rapports' => ['voir', 'créer', 'modifier'],
                        ],
                    ],
                ],
                'feature_dependencies' => [
                    'présences' => ['pointage'],
                    'rapports' => ['pointage', 'présences'],
                ],
            ],
            [
                'id' => 'paie',
                'name' => 'Paie',
                'description' => 'Enregistrer les bénéficiaires, préparer les salaires et lancer les virements groupés.',
                'features' => ['Tableau de bord', 'Bénéficiaires', 'Préparer une paie', 'Validation', 'Virements', 'Solde de paie', 'Historique'],
                'feature_packs' => [
                    [
                        'id' => 'paie-consultation',
                        'name' => 'Consultation paie',
                        'description' => 'Consulter les bénéficiaires et l’historique des paies.',
                        'feature_ids' => ['tableau-de-bord', 'bénéficiaires', 'historique'],
                        'feature_permissions' => [
                            'tableau-de-bord' => ['voir'],
                            'bénéficiaires' => ['voir'],
                            'historique' => ['voir'],
                        ],
                    ],
                    [
                        'id' => 'paie-gestion',
                        'name' => 'Gestionnaire de paie',
                        'description' => 'Préparer les paies et gérer les bénéficiaires.',
                        'feature_ids' => ['tableau-de-bord', 'bénéficiaires', 'préparer-une-paie', 'historique'],
                        'feature_permissions' => [
                            'tableau-de-bord' => ['voir'],
                            'bénéficiaires' => ['voir', 'créer', 'modifier'],
                            'préparer-une-paie' => ['voir', 'créer', 'modifier'],
                            'historique' => ['voir'],
                        ],
                    ],
                    [
                        'id' => 'paie-supervision',
                        'name' => 'Responsable paie',
                        'description' => 'Valider les paies, alimenter le solde et lancer les virements.',
                        'feature_ids' => ['tableau-de-bord', 'bénéficiaires', 'préparer-une-paie', 'validation', 'virements', 'solde-de-paie', 'historique'],
                        'feature_permissions' => [
                            'tableau-de-bord' => ['voir'],
                            'bénéficiaires' => ['voir', 'créer', 'modifier'],
                            'préparer-une-paie' => ['voir', 'créer', 'modifier'],
                            'validation' => ['voir', 'modifier'],
                            'virements' => ['voir', 'modifier'],
                            'solde-de-paie' => ['voir', 'modifier'],
                            'historique' => ['voir'],
                        ],
                    ],
                    [
                        'id' => 'paie-employe',
                        'name' => 'Employé paie',
                        'description' => 'Consulter les informations et l’historique de paie autorisés.',
                        'feature_ids' => ['tableau-de-bord', 'historique'],
                        'feature_permissions' => [
                            'tableau-de-bord' => ['voir'],
                            'historique' => ['voir'],
                        ],
                    ],
                    [
                        'id' => 'paie-manager',
                        'name' => 'Manager paie',
                        'description' => 'Superviser la préparation, la validation, le solde et les virements de paie.',
                        'feature_ids' => ['tableau-de-bord', 'bénéficiaires', 'préparer-une-paie', 'validation', 'virements', 'solde-de-paie', 'historique'],
                        'feature_permissions' => [
                            'tableau-de-bord' => ['voir'],
                            'bénéficiaires' => ['voir', 'créer', 'modifier'],
                            'préparer-une-paie' => ['voir', 'créer', 'modifier'],
                            'validation' => ['voir', 'modifier'],
                            'virements' => ['voir', 'modifier'],
                            'solde-de-paie' => ['voir', 'modifier'],
                            'historique' => ['voir'],
                        ],
                    ],
                ],
            ],
            [
                'id' => 'transport',
                'name' => 'Transport',
                'description' => 'Organiser les chauffeurs, les véhicules et les courses Taxi.',
                'features' => ['Vue d’ensemble', 'Courses', 'Chauffeurs', 'Véhicules', 'Historique', 'Paramètres'],
                'feature_packs' => [
                    ['id' => 'transport-consultation', 'name' => 'Consultation Taxi', 'description' => 'Suivre l’activité Taxi, les courses et la flotte.', 'feature_ids' => ['overview', 'trips', 'drivers', 'vehicles']],
                    [
                        'id' => 'transport-gestion',
                        'name' => 'Gestionnaire Taxi',
                        'description' => 'Gérer les courses, les chauffeurs et les véhicules.',
                        'feature_ids' => ['overview', 'trips', 'drivers', 'vehicles'],
                        'feature_permissions' => [
                            'overview' => ['voir'],
                            'trips' => ['voir', 'créer', 'modifier'],
                            'drivers' => ['voir', 'créer', 'modifier'],
                            'vehicles' => ['voir', 'créer', 'modifier'],
                        ],
                    ],
                    [
                        'id' => 'transport-chauffeur',
                        'name' => 'Espace chauffeur Taxi',
                        'description' => 'Permettre au chauffeur de suivre ses courses, son historique et les paramètres opérationnels.',
                        'feature_ids' => ['overview', 'trips', 'historique', 'parametres'],
                        'feature_permissions' => [
                            'overview' => ['voir'],
                            'trips' => ['voir', 'modifier'],
                            'historique' => ['voir'],
                            'parametres' => ['voir'],
                        ],
                    ],
                    [
                        'id' => 'transport-employe',
                        'name' => 'Employé Transport',
                        'description' => 'Suivre les courses et l’activité de la flotte sans administrer les chauffeurs.',
                        'feature_ids' => ['overview', 'trips', 'drivers', 'vehicles', 'historique'],
                        'feature_permissions' => [
                            'overview' => ['voir'],
                            'trips' => ['voir', 'modifier'],
                            'drivers' => ['voir'],
                            'vehicles' => ['voir'],
                            'historique' => ['voir'],
                        ],
                    ],
                    [
                        'id' => 'transport-manager',
                        'name' => 'Manager Transport',
                        'description' => 'Piloter les courses, les chauffeurs, les véhicules et l’historique Taxi.',
                        'feature_ids' => ['overview', 'trips', 'drivers', 'vehicles', 'historique', 'parametres'],
                        'feature_permissions' => [
                            'overview' => ['voir'],
                            'trips' => ['voir', 'créer', 'modifier'],
                            'drivers' => ['voir', 'créer', 'modifier'],
                            'vehicles' => ['voir', 'créer', 'modifier'],
                            'historique' => ['voir'],
                            'parametres' => ['voir', 'modifier'],
                        ],
                    ],
                ],
            ],
        ];
    }

    public static function ensureCatalog(): void
    {
        foreach (self::definitionsWithCustom() as $definition) {
            $values = [
                'name' => $definition['name'],
                'description' => $definition['description'],
                'features' => json_encode($definition['features'], JSON_UNESCAPED_UNICODE),
                'feature_dependencies' => json_encode($definition['feature_dependencies'] ?? [], JSON_UNESCAPED_UNICODE),
                'updated_at' => now(),
            ];
            if (DB::table('maximus_modules')->where('id', $definition['id'])->exists()) {
                DB::table('maximus_modules')->where('id', $definition['id'])->update($values);
            } else {
                DB::table('maximus_modules')->insert($values + [
                    'id' => $definition['id'],
                    'status' => 'ACTIF',
                    'created_at' => now(),
                ]);
            }
        }
    }

    public static function ensureCompanyAccess(string $companyId, ?array $moduleIds = null, string $status = 'ACTIF'): void
    {
        self::ensureCatalog();
        $definitions = self::definitionsWithCustom();
        $allowed = $moduleIds ?? array_column($definitions, 'id');
        foreach ($allowed as $moduleId) {
            if (! collect($definitions)->contains('id', $moduleId)) {
                continue;
            }

            if (! DB::table('maximus_company_modules')
                ->where('company_id', $companyId)
                ->where('module_id', $moduleId)
                ->exists()) {
                DB::table('maximus_company_modules')->insert([
                    'id' => 'company-module-'.Str::slug($companyId.'-'.$moduleId),
                    'company_id' => $companyId,
                    'module_id' => $moduleId,
                    'status' => $status,
                    'feature_ids' => json_encode([], JSON_UNESCAPED_UNICODE),
                    // An access row created by the legacy provisioning path
                    // keeps the legacy "whole module" behavior. Modern
                    // registration and explicit edits write featureScope
                    // themselves.
                    'configuration' => json_encode([], JSON_UNESCAPED_UNICODE),
                    'updated_at' => now(),
                    'created_at' => now(),
                ]);
            }
        }
    }

    public static function isPublishedModule(string $moduleId): bool
    {
        $definition = collect(self::definitionsWithCustom())->firstWhere('id', $moduleId);
        if (! $definition) {
            return false;
        }

        $row = DB::table('maximus_app_states')->where('scope', 'workspace')->first();
        $payload = is_string($row?->payload)
            ? json_decode($row->payload, true)
            : ($row?->payload ?? []);
        $state = is_array($payload) ? $payload : [];
        if (in_array($moduleId, is_array($state['removedModules'] ?? null) ? $state['removedModules'] : [], true)) {
            return false;
        }

        $status = $state['moduleStatuses'][$moduleId] ?? ($definition['status'] ?? 'ACTIF');
        return in_array($status, ['ACTIF', 'BETA'], true);
    }

    /**
     * Normalize and bound company/module selections to the published catalog.
     *
     * @return array{featureIds: array<int, string>, configuration: array<string, mixed>}
     */
    public static function normalizeSelection(
        string $moduleId,
        array $featureIds = [],
        array $configuration = [],
    ): array {
        $definition = collect(self::definitionsWithCustom())->firstWhere('id', $moduleId);
        if (! $definition || ! self::isPublishedModule($moduleId)) {
            throw new \InvalidArgumentException("Le module « {$moduleId} » n’est pas publié.");
        }

        $packs = is_array($definition['feature_packs'] ?? null) ? $definition['feature_packs'] : [];
        $packById = collect($packs)->keyBy('id');
        $packIds = $configuration['packIds'] ?? [];
        if (! is_array($packIds)) {
            throw new \InvalidArgumentException("Les packs du module « {$moduleId} » sont invalides.");
        }
        $packIds = array_values(array_unique(array_map('strval', $packIds)));
        $unknownPacks = array_values(array_diff($packIds, $packById->keys()->all()));
        if ($unknownPacks !== []) {
            throw new \InvalidArgumentException("Le module « {$moduleId} » référence un pack absent.");
        }

        $validFeatureIds = collect($packs)
            ->flatMap(fn (array $pack): array => is_array($pack['feature_ids'] ?? null) ? $pack['feature_ids'] : [])
            ->merge(is_array($definition['feature_ids'] ?? null) ? $definition['feature_ids'] : [])
            ->merge(collect(is_array($definition['features'] ?? null) ? $definition['features'] : [])
                ->map(fn (mixed $feature): string => Str::slug((string) $feature)))
            ->map(fn (mixed $feature): string => (string) $feature)
            ->filter()
            ->unique()
            ->values()
            ->all();
        $featureIds = array_values(array_unique(array_map('strval', $featureIds)));
        // A company request can outlive a catalog revision. Unknown feature ids
        // cannot grant access, so discard them instead of blocking the whole
        // company creation or installation synchronization.
        $featureIds = array_values(array_intersect($featureIds, $validFeatureIds));

        $packFeatureIds = $packIds === []
            ? []
            : collect($packIds)
                ->flatMap(fn (string $packId): array => $packById->get($packId)['feature_ids'] ?? [])
                ->unique()
                ->values()
                ->all();
        if ($packIds !== [] && array_diff($featureIds, $packFeatureIds) !== []) {
            throw new \InvalidArgumentException('Une fonctionnalité sélectionnée ne appartient pas aux packs choisis.');
        }
        if ($packIds !== [] && $featureIds === []) {
            $featureIds = $packFeatureIds;
        }

        $rawPermissions = $configuration['featurePermissions'] ?? [];
        if (! is_array($rawPermissions)) {
            throw new \InvalidArgumentException('Les permissions de fonctionnalités sont invalides.');
        }
        $actions = ['voir', 'créer', 'modifier'];
        $featurePermissions = [];
        foreach ($rawPermissions as $featureId => $permissions) {
            if (! in_array((string) $featureId, $featureIds, true)) {
                continue;
            }
            if (! is_array($permissions)) {
                throw new \InvalidArgumentException('Une permission référence une fonctionnalité non sélectionnée.');
            }
            $permissions = array_values(array_unique(array_map('strval', $permissions)));
            if (array_diff($permissions, $actions) !== []) {
                throw new \InvalidArgumentException('Une action de permission est inconnue.');
            }
            $featurePermissions[(string) $featureId] = $permissions;
        }

        return [
            'featureIds' => $featureIds,
            'configuration' => [
                'featureScope' => 'explicit',
                'packIds' => $packIds,
                'featurePermissions' => $featurePermissions,
            ],
        ];
    }

    public static function isEnabled(string $companyId, string $moduleId): bool
    {
        return in_array(self::statusFor($companyId, $moduleId), ['ACTIF', 'BETA'], true);
    }

    public static function allowsFeature(string $companyId, string $moduleId, string $featureId): bool
    {
        if (! self::isEnabled($companyId, $moduleId)) {
            return false;
        }

        $row = DB::table('maximus_company_modules')
            ->where('company_id', $companyId)
            ->where('module_id', $moduleId)
            ->first(['feature_ids', 'configuration']);
        if (! $row) {
            return false;
        }

        $featureIds = json_decode($row->feature_ids ?? '[]', true);
        $configuration = json_decode($row->configuration ?? '{}', true);
        if (! is_array($featureIds)) {
            $featureIds = [];
        }
        if (! is_array($configuration)) {
            $configuration = [];
        }

        // Legacy rows with no explicit scope preserve physical sales for existing
        // catalogues, but digital sales require an explicit grant.
        // New writes set featureScope=explicit, including an intentionally empty list.
        if (($configuration['featureScope'] ?? null) === 'explicit') {
            return in_array($featureId, $featureIds, true);
        }
        if ($featureId === 'vente-numerique') {
            return false;
        }
        if ($featureId === 'vente-physique') {
            return $featureIds === [] || in_array('catalogue', $featureIds, true);
        }
        if ($featureIds !== []) {
            return in_array($featureId, $featureIds, true);
        }

        return true;
    }

    public static function statusFor(string $companyId, string $moduleId): string
    {
        return (string) (DB::table('maximus_company_modules')
            ->where('company_id', $companyId)
            ->where('module_id', $moduleId)
            ->value('status') ?? 'INACTIF');
    }

    public static function bootstrap(string $companyId): array
    {
        $access = DB::table('maximus_company_modules')
            ->where('company_id', $companyId)
            ->get()
            ->keyBy('module_id');

        return collect(self::definitionsWithCustom())->map(function (array $definition) use ($access): array {
            $row = $access->get($definition['id']);

            return [
                ...$definition,
                'status' => $row?->status ?? 'INACTIF',
                'featureIds' => $row ? json_decode($row->feature_ids ?? '[]', true) : [],
                'configuration' => $row ? json_decode($row->configuration ?? '{}', true) : [],
                'featurePacks' => collect($definition['feature_packs'] ?? [])
                    ->map(fn (array $pack): array => [
                        'id' => $pack['id'],
                        'name' => $pack['name'],
                        'description' => $pack['description'],
                        'featureIds' => $pack['feature_ids'],
                        'featurePermissions' => $pack['feature_permissions'] ?? [],
                    ])
                    ->values()
                    ->all(),
                'featureDependencies' => $definition['feature_dependencies'] ?? [],
            ];
        })->all();
    }

    /**
     * Published custom modules live in the workspace catalog because they are
     * created through the MAXI draft workflow. Built-in definitions remain the
     * source of truth for the standard modules.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function definitionsWithCustom(): array
    {
        $row = DB::table('maximus_app_states')->where('scope', 'workspace')->first();
        $payload = is_string($row?->payload)
            ? json_decode($row->payload, true)
            : ($row?->payload ?? []);
        $state = is_array($payload) ? $payload : [];
        $custom = is_array($state['customModules'] ?? null) ? $state['customModules'] : [];
        $overrides = is_array($state['moduleOverrides'] ?? null) ? $state['moduleOverrides'] : [];

        $normalizedCustom = collect($custom)
            ->filter(static fn (mixed $module): bool => is_array($module) && is_string($module['id'] ?? null))
            ->map(static fn (array $module): array => [
                'id' => (string) $module['id'],
                'name' => (string) ($module['name'] ?? $module['id']),
                'description' => (string) ($module['description'] ?? ''),
                'features' => is_array($module['features'] ?? null) ? $module['features'] : [],
                'feature_packs' => collect(is_array($module['featurePacks'] ?? null) ? $module['featurePacks'] : [])
                    ->map(static fn (mixed $pack): array => [
                        'id' => (string) ($pack['id'] ?? ''),
                        'name' => (string) ($pack['name'] ?? ''),
                        'description' => (string) ($pack['description'] ?? ''),
                        'feature_ids' => is_array($pack['featureIds'] ?? null) ? $pack['featureIds'] : [],
                        'feature_permissions' => is_array($pack['featurePermissions'] ?? null) ? $pack['featurePermissions'] : [],
                    ])
                    ->filter(static fn (array $pack): bool => $pack['id'] !== '')
                    ->values()
                    ->all(),
                'feature_dependencies' => is_array($module['featureDependencies'] ?? null) ? $module['featureDependencies'] : [],
                'status' => in_array(($module['status'] ?? 'ACTIF'), ['ACTIF', 'BETA'], true)
                    ? ($module['status'] ?? 'ACTIF')
                    : 'ACTIF',
            ])
            ->values()
            ->all();

        $definitions = [
            ...self::definitions(),
            ...$normalizedCustom,
        ];

        return collect($definitions)
            ->map(static function (array $definition) use ($overrides): array {
                $override = is_array($overrides[$definition['id']] ?? null)
                    ? $overrides[$definition['id']]
                    : [];
                if ($override === []) {
                    return $definition;
                }

                $featurePacks = $definition['feature_packs'] ?? [];
                if (array_key_exists('featurePacks', $override) && is_array($override['featurePacks'])) {
                    $featurePacks = collect($override['featurePacks'])
                        ->filter(static fn (mixed $pack): bool => is_array($pack))
                        ->map(static fn (array $pack): array => [
                            'id' => (string) ($pack['id'] ?? ''),
                            'name' => (string) ($pack['name'] ?? ''),
                            'description' => (string) ($pack['description'] ?? ''),
                            'feature_ids' => is_array($pack['featureIds'] ?? null) ? $pack['featureIds'] : [],
                            'feature_permissions' => is_array($pack['featurePermissions'] ?? null)
                                ? $pack['featurePermissions']
                                : [],
                        ])
                        ->filter(static fn (array $pack): bool => $pack['id'] !== '')
                        ->values()
                        ->all();
                }

                return [
                    ...$definition,
                    'name' => is_string($override['name'] ?? null)
                        ? $override['name']
                        : $definition['name'],
                    'description' => is_string($override['description'] ?? null)
                        ? $override['description']
                        : $definition['description'],
                    'features' => is_array($override['features'] ?? null)
                        ? array_values(array_filter($override['features'], 'is_string'))
                        : $definition['features'],
                    'feature_packs' => $featurePacks,
                    'feature_dependencies' => is_array($override['featureDependencies'] ?? null)
                        ? $override['featureDependencies']
                        : ($definition['feature_dependencies'] ?? []),
                ];
            })
            ->values()
            ->all();
    }
}
