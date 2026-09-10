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
                    'features' => ['Tableau de bord', 'Catalogue', 'Catégories', 'Commandes', 'Clients', 'Promotions', 'Location', 'Livraisons', 'Finances', 'Paramètres'],
                'feature_packs' => [
                    ['id' => 'ecommerce-catalogue', 'name' => 'Catalogue en ligne', 'description' => 'Publier une boutique et présenter vos produits.', 'feature_ids' => ['dashboard', 'catalogue', 'categories', 'finances', 'parametres']],
                    ['id' => 'ecommerce-gestion', 'name' => 'Gestion e-commerce', 'description' => 'Piloter le catalogue, les commandes et les clients.', 'feature_ids' => ['dashboard', 'catalogue', 'categories', 'commandes', 'clients', 'finances', 'parametres']],
                    ['id' => 'ecommerce-location', 'name' => 'Location & réservation', 'description' => 'Présenter et gérer les offres de location de maisons, bâches, véhicules et équipements.', 'feature_ids' => ['dashboard', 'catalogue', 'categories', 'location', 'commandes', 'clients', 'parametres']],
                    ['id' => 'ecommerce-supervision', 'name' => 'Supervision boutique', 'description' => 'Superviser la boutique, les promotions, la location, les livraisons et les retraits.', 'feature_ids' => ['dashboard', 'catalogue', 'categories', 'commandes', 'clients', 'promotions', 'location', 'livraisons', 'finances', 'parametres']],
                ],
                'feature_dependencies' => [
                    'commandes' => ['catalogue'],
                    'categories' => ['catalogue'],
                    'promotions' => ['catalogue'],
                    'location' => ['catalogue'],
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
                ],
            ],
        ];
    }

    public static function ensureCatalog(): void
    {
        foreach (self::definitionsWithCustom() as $definition) {
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
        $definitions = self::definitionsWithCustom();
        $allowed = $moduleIds ?? array_column($definitions, 'id');
        foreach ($allowed as $moduleId) {
            if (! collect($definitions)->contains('id', $moduleId)) {
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

        return [
            ...self::definitions(),
            ...$normalizedCustom,
        ];
    }
}
