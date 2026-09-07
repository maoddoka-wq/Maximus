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
                'feature_packs' => [
                    ['id' => 'commerce-consultation', 'name' => 'Consultation commerciale', 'description' => 'Consulter les clients et le suivi commercial.', 'feature_ids' => ['dashboard', 'clients']],
                    ['id' => 'commerce-gestion', 'name' => 'Gestion commerciale', 'description' => 'Gérer les ventes, clients et indicateurs.', 'feature_ids' => ['dashboard', 'clients', 'sales', 'products', 'reports']],
                ],
            ],
            [
                'id' => 'ecommerce',
                'name' => 'E-commerce',
                'description' => 'Boutique en ligne, catalogue public et commandes clients.',
                'features' => ['Tableau de bord', 'Catalogue', 'Commandes', 'Clients', 'Promotions', 'Livraisons', 'Paramètres'],
                'feature_packs' => [
                    ['id' => 'ecommerce-catalogue', 'name' => 'Catalogue en ligne', 'description' => 'Publier une boutique et présenter vos produits.', 'feature_ids' => ['dashboard', 'catalogue', 'parametres']],
                    ['id' => 'ecommerce-gestion', 'name' => 'Gestion e-commerce', 'description' => 'Piloter le catalogue, les commandes et les clients.', 'feature_ids' => ['dashboard', 'catalogue', 'commandes', 'clients', 'parametres']],
                    ['id' => 'ecommerce-supervision', 'name' => 'Supervision boutique', 'description' => 'Superviser la boutique, les promotions et les livraisons.', 'feature_ids' => ['dashboard', 'catalogue', 'commandes', 'clients', 'promotions', 'livraisons', 'parametres']],
                ],
                'feature_dependencies' => [
                    'commandes' => ['catalogue'],
                    'promotions' => ['catalogue'],
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
                ],
                'feature_dependencies' => [
                    'présences' => ['pointage'],
                    'rapports' => ['pointage', 'présences'],
                ],
            ],
            self::standardDefinition('ventes', 'Ventes', 'Gérer les ventes, les devis, les commandes et le suivi client.', ['Tableau de bord', 'Clients', 'Devis', 'Commandes', 'Facturation', 'Rapports']),
            self::standardDefinition('achats', 'Achats', 'Piloter les demandes, commandes et réceptions fournisseurs.', ['Tableau de bord', 'Demandes d’achat', 'Commandes fournisseurs', 'Réceptions', 'Rapports']),
            self::standardDefinition('finance', 'Finance', 'Suivre les flux financiers, les paiements et la trésorerie.', ['Tableau de bord', 'Trésorerie', 'Paiements', 'Dépenses', 'Budgets', 'Rapports']),
            self::standardDefinition('comptabilite', 'Comptabilité', 'Organiser les journaux, écritures et documents comptables.', ['Tableau de bord', 'Journaux', 'Écritures', 'Factures', 'Rapprochements', 'Rapports']),
            self::standardDefinition('rh', 'Ressources humaines', 'Administrer les collaborateurs, les rôles et l’organisation.', ['Tableau de bord', 'Collaborateurs', 'Organisation', 'Rôles', 'Documents', 'Rapports']),
            self::standardDefinition('paie', 'Paie', 'Préparer les périodes de paie et suivre les bulletins.', ['Tableau de bord', 'Périodes', 'Bulletins', 'Variables', 'Rapports']),
            self::standardDefinition('crm', 'CRM', 'Développer la relation client et suivre les opportunités.', ['Tableau de bord', 'Contacts', 'Opportunités', 'Activités', 'Rapports']),
            self::standardDefinition('fournisseurs', 'Fournisseurs', 'Centraliser les fiches et la performance des fournisseurs.', ['Tableau de bord', 'Référentiel', 'Évaluations', 'Contrats', 'Rapports']),
            self::standardDefinition('logistique', 'Logistique', 'Coordonner les livraisons, transporteurs et réceptions.', ['Tableau de bord', 'Expéditions', 'Livraisons', 'Transporteurs', 'Suivi', 'Rapports']),
            self::standardDefinition('documents', 'Documents', 'Classer, partager et suivre les documents de l’entreprise.', ['Tableau de bord', 'Bibliothèque', 'Dossiers', 'Versions', 'Partages', 'Rapports']),
            self::standardDefinition('rapports', 'Rapports', 'Consolider les indicateurs et produire les rapports métier.', ['Ventes', 'Stocks', 'Finance', 'Activité', 'Exports']),
        ];
    }

    private static function standardDefinition(string $id, string $name, string $description, array $features): array
    {
        $featureIds = array_map(
            fn (string $feature): string => trim((string) preg_replace('/[^a-z0-9à-ÿ]+/iu', '-', mb_strtolower($feature)), '-'),
            $features,
        );

        return [
            'id' => $id,
            'name' => $name,
            'description' => $description,
            'features' => $features,
            'feature_packs' => [
                [
                    'id' => $id.'-consultation',
                    'name' => 'Consultation '.mb_strtolower($name),
                    'description' => 'Consulter les données et indicateurs de '.mb_strtolower($name).'.',
                    'feature_ids' => array_slice($featureIds, 0, 3),
                ],
                [
                    'id' => $id.'-gestion',
                    'name' => 'Gestion '.mb_strtolower($name),
                    'description' => 'Gérer les opérations de '.mb_strtolower($name).'.',
                    'feature_ids' => $featureIds,
                ],
            ],
            'feature_dependencies' => [],
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
                    'feature_dependencies' => json_encode($definition['feature_dependencies'] ?? [], JSON_UNESCAPED_UNICODE),
                    'status' => 'ACTIF',
                    'updated_at' => now(),
                    'created_at' => now(),
                ],
            );
        }
    }

    public static function ensureCompanyAccess(string $companyId, ?array $moduleIds = null, string $status = 'ACTIF'): void
    {
        self::ensureCatalog();
        $allowed = $moduleIds ?? array_column(self::definitions(), 'id');
        foreach ($allowed as $moduleId) {
            if (! collect(self::definitions())->contains('id', $moduleId)) {
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
        return in_array(self::statusFor($companyId, $moduleId), ['ACTIF', 'BETA'], true);
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
        self::ensureCatalog();
        $access = DB::table('maximus_company_modules')
            ->where('company_id', $companyId)
            ->get()
            ->keyBy('module_id');

        return collect(self::definitions())->map(function (array $definition) use ($access): array {
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
                    ])
                    ->values()
                    ->all(),
                'featureDependencies' => $definition['feature_dependencies'] ?? [],
            ];
        })->all();
    }
}
