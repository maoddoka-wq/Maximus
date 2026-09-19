# Audit de conservation lors de l’archivage

Audit ciblé du chemin serveur Laravel. Une absence de défaut prouvé ci-dessous signifie que le code lu conserve les lignes; elle ne constitue pas une preuve de restauration métier complète.

| Périmètre | Présence après archivage | Accès / effet serveur | Conclusion |
|---|---|---|---|
| Présences | `CompanyRegistry::removeTenantData` ne supprime pas les tables de présences | Les identités sont retirées et les modules d’entreprise suspendus | Historique conservé; aucun défaut de suppression prouvé |
| Paie | Les bénéficiaires, lots, virements et historiques ne sont pas supprimés par l’archivage | L’accès interactif est coupé avec l’identité et le module | Historique conservé; aucun défaut de suppression prouvé |
| Public e-commerce / Transport | Boutiques, domaines, produits, commandes, clients et courses historiques restent en base; boutique et domaine sont normalement révoqués | `RequireInstallationPublicCompany` revérifie désormais `companies.status = ACTIF` et `deleted_at IS NULL` pour slug, domaine et identifiant explicite, y compris avec d’anciennes lignes encore publiées | Défaut prouvé corrigé: une archive héritée ne peut plus exposer une boutique ni créer une réservation |
| Financier | Commandes, portefeuilles et grands livres ne sont pas supprimés | Le webhook DiamanoPay signé reste hors du middleware public afin de rapprocher de façon idempotente les anciens paiements | Conservation et rapprochement intentionnels; ne pas placer le webhook derrière le garde public |
| Catalogue | Affectations de modules conservées mais suspendues; catégories et produits e-commerce conservés | Les publications publiques sont bloquées par l’état autoritatif de l’entreprise, indépendamment des lignes de module ou de publication périmées | Données conservées, exposition coupée |

## Matrice des sélecteurs publics

| Sélecteur | Entreprise active | Entreprise archivée / `deleted_at` |
|---|---:|---:|
| Slug de boutique publié | Autorisé | 404 |
| Domaine actif vérifié | Autorisé | 404 |
| Identifiant d’entreprise explicite (images/fichiers) | Autorisé | 404 |
| Installation dédiée à l’entreprise | Autorisé si le périmètre correspond | 404 |
| Webhook financier signé | Traité | Traité pour réconciliation historique |

La défense est placée dans le middleware commun aux routes publiques e-commerce et Transport. Les contrôleurs conservent leurs contrôles de publication et de fonctionnalités; les lignes historiques et financières ne sont ni purgées ni modifiées par ce correctif.