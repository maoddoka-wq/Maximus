# Audit du cycle de suppression d’une entreprise

## Correctifs couverts

- `companies.email` reste la coordonnée historique de l’entreprise archivée. Son unicité est désormais partielle (`deleted_at IS NULL`) sur PostgreSQL et SQLite, donc une nouvelle entreprise active peut reprendre la même adresse sans modifier l’ancienne fiche.
- L’archivage retire uniquement les identités de connexion du tenant réellement archivé : email technique déterministe et borné, statut suspendu et sessions révoquées. Une identité suspendue rattachée à une entreprise encore active n’est jamais libérée.
- La migration traite aussi les identités des entreprises déjà archivées. L’approbation contient un rattrapage transactionnel pour les anciennes lignes qui auraient conservé l’email de connexion.
- Les modules, boutiques, domaines et installations sont révoqués/suspendus, mais leurs lignes sont conservées. Les données transport, commandes, portefeuilles, employés et autres historiques métier ne sont plus supprimées par le registre.
- Les domaines archivés restent réservés et révoqués : ils ne sont pas automatiquement attribués à la nouvelle entreprise et exigent un futur parcours explicite de retrait puis de vérification.
- Le slug de connexion archivé reste réservé. L’ancienne URL est donc bloquée par le statut archivé et ne devient pas implicitement l’URL de la nouvelle entreprise.
- `CompanyRegistry::ensureActive()` ne peut plus effacer `deleted_at` ni réactiver implicitement une entreprise inactive.
- Le verrou de suppression reste obligatoire et inchangé.

## Preuves automatisées

`CompanyDeletionLifecycleTest` couvre sur SQLite :

1. création, approbation, archivage, puis recréation et approbation avec le même email ;
2. rejet d’un doublon actif ;
3. conservation d’enregistrements transport et financiers ;
4. révocation des domaines, installations et anciennes sessions ;
5. séparation des anciens et nouveaux identifiants ;
6. compatibilité d’une identité issue d’un ancien archivage ;
7. non-libération d’un compte seulement suspendu sur un tenant actif ;
8. rollback de toute la transaction si l’approbation échoue après le rattrapage d’identité ;
9. interdiction de résurrection via `ensureActive()`.

## Limites et opérations requises

- Déployer la migration Laravel `2026_09_16_000053_release_archived_company_identities.php` avant de compter sur la réutilisation d’un email en production. Aucun SQL de production n’a été exécuté pendant cet audit.
- La garde des routes publiques est traitée séparément ; ce correctif révoque leurs liaisons mais ne modifie pas leur middleware.
- La suppression d’un employé n’est pas modifiée ici. Le contrat réutilisable disponible pour ce flux est `AuthIdentityRetirement::retireUser(AuthUser $user): void`; l’appelant doit l’inclure dans sa transaction métier.