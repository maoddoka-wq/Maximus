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
            [
                'id' => 'ecommerce',
                'name' => 'E-commerce',
                'description' => 'Boutique en ligne, catalogue public et commandes clients.',
                'features' => ['Tableau de bord', 'Catalogue', 'Commandes', 'Clients', 'Promotions', 'Livraisons', 'Paramètres'],
                'feature_dependencies' => [
                    'commandes' => ['catalogue'],
                    'promotions' => ['catalogue'],
                    'livraisons' => ['commandes'],
                ],
            ],
            ['id' => 'stocks', 'name' => 'Gestion de stock', 'description' => 'Articles, entrées, sorties et niveaux de stock.', 'features' => ['Articles', 'Entrées et sorties', 'Alertes de seuil']],
            [
                'id' => 'presences',
                'name' => 'Présences',
                'description' => 'Présences et suivi quotidien des équipes.',
                'features' => ['Tableau de bord', 'Pointage', 'Présences', 'Absences', 'Horaires', 'Congés', 'Historique', 'Rapports'],
                'feature_dependencies' => [
                    'présences' => ['pointage'],
                    'rapports' => ['pointage', 'présences'],
                ],
            ],
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
            ];
        })->all();
    }
}
