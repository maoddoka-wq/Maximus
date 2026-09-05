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
            [
                'id' => 'presences',
                'name' => 'Présences',
                'description' => 'Présences et suivi quotidien des équipes.',
                'features' => ['Tableau de bord', 'Pointage', 'Présences', 'Absences', 'Retards', 'Horaires', 'Planning', 'Pauses', 'Heures travaillées', 'Heures supplémentaires', 'Missions', 'Congés', 'Jours fériés', 'Historique', 'Rapports', 'Paramètres'],
                'feature_dependencies' => [
                    'présences' => ['pointage'],
                    'retards' => ['pointage'],
                    'pauses' => ['pointage'],
                    'heures-travaillées' => ['pointage'],
                    'heures-supplémentaires' => ['heures-travaillées'],
                    'rapports' => ['présences', 'heures-travaillées'],
                ],
            ],
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