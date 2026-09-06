# MAXIMUS ERP

Prototype web interactif d’un ERP SaaS multi-entreprises en français, avec administration des espaces, modules activables, dépendances, organisation, rôles, permissions et opérations KORA.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000, legacy Express entrypoint)
- `artifacts/api-server` workflow — runs Laravel on PostgreSQL through `server.php`; development provisions the demo idempotently, while production migrates the schema and provisions only the MAXIMUS admin from environment secrets.
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env for Laravel: `DB_CONNECTION=pgsql` and the managed PostgreSQL connection settings.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API active: Laravel HTTP kernel + Eloquent on PostgreSQL.
- API legacy: Express 5 remains available for parity work and rollback, but is not the active preview workflow.
- DB active: PostgreSQL through Laravel/Eloquent.
- DB legacy: PostgreSQL + Drizzle ORM in the Express layer.
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/maximus/src/App.tsx` — navigation, écrans et interactions du prototype.
- `artifacts/maximus/src/lib/store.ts` — modèles, dépendances et données de démonstration persistées localement.
- `artifacts/maximus/src/index.css` — tokens visuels et responsive de MAXIMUS.
- `artifacts/maximus` — application web principale servie à la racine.
- `artifacts/api-server/laravel` — API active et autorisations serveur.
- `artifacts/api-server/src` — API Express legacy conservée pendant la migration.

## Architecture decisions

- Le prototype utilise `localStorage` pour rendre les parcours de démonstration persistants sans service externe.
- Les modules disponibles et les dépendances sont définis comme des données structurées afin de préparer l’ajout de futurs modules.
- L’espace KORA calcule son menu à partir des modules autorisés et, pour un employé, des permissions de son rôle.
- Le périmètre entreprise est résolu à partir de la session serveur ; un `companyId` fourni par le navigateur ne peut pas élargir celui d’un acteur non MAXIMUS.
- Laravel reste la couche active tant que la parité PostgreSQL avec Express n’est pas prouvée par des tests de comportement et de données.

### Migration Laravel progressive

Le workflow de prévisualisation utilise Laravel avec PostgreSQL. Express est une implémentation parallèle de compatibilité, pas la source de vérité opérationnelle.

- Toute correction de sécurité ou de règle métier doit d’abord être appliquée à Laravel.
- Une fonctionnalité ne peut être supprimée d’Express qu’après comparaison des réponses, statuts HTTP, effets PostgreSQL et contrôles de périmètre.
- Le retour temporaire à Express doit rester possible jusqu’à la validation de la parité ; ne pas supprimer ses routeurs ni ses tests pendant cette phase.
- Les nouveaux endpoints doivent documenter leur middleware d’authentification, leur résolution d’entreprise, leur contrôle de module et leur permission d’action.
- Les tests Laravel doivent être exécutés avec PostgreSQL, pas uniquement avec un mock ou une base SQLite.

## Contrat de création des modules

Cette section est la référence obligatoire pour ajouter ou modifier un module métier. Un module n’est pas uniquement une page : il doit traverser tout le parcours **catalogue → entreprise → unité → rôle → employé → navigation → route → écran**.

### Sources de vérité

- `artifacts/maximus/src/lib/store.ts`
  - `ModuleId` est l’union des identifiants autorisés.
  - `Module` définit l’identifiant, le nom, la description, les fonctionnalités et le statut.
  - `modules` est le catalogue statique.
  - `getConfiguredModules()` applique `moduleOverrides` et `removedModules`.
  - `Company.allowedModules` est le plafond d’activation pour une entreprise.
  - `OrgNode.moduleIds` réduit encore le périmètre d’une unité.
- `artifacts/maximus/src/lib/permission-keys.ts` construit les clés canoniques des sous-fonctionnalités.
- `artifacts/maximus/src/lib/employee-permissions.ts` est la référence pour le calcul des droits effectifs.
- `artifacts/maximus/src/lib/navigation.ts` déclare les entrées de navigation et leurs modules.
- `artifacts/maximus/src/routes/app-routes.tsx` protège les routes et connecte les écrans aux chemins.
- `artifacts/maximus/src/lib/commerce-permissions.ts` est la référence spécifique aux onglets et alias historiques de Commerce.
- `artifacts/api-server/laravel/app/Http/Middleware/AuthenticateMaximus.php` authentifie la session serveur.
- `artifacts/api-server/laravel/app/Http/Middleware/ResolveCompanyContext.php` fixe l’entreprise effective avant le contrôleur.
- `artifacts/api-server/laravel/app/Http/Middleware/EnsureModuleEnabled.php` applique le statut du module avant l’accès métier.

### Chaîne d’accès obligatoire

Un employé peut utiliser une fonctionnalité uniquement si toutes les conditions suivantes sont satisfaites :

1. le module existe dans le catalogue configuré et n’est pas retiré ;
2. l’entreprise possède le module dans `allowedModules` ;
3. l’unité de l’employé possède le module dans `moduleIds` ;
4. le rôle appartient à la même entreprise et à l’unité de l’employé ou à l’un de ses ancêtres ;
5. le rôle possède `voir` sur le module ;
6. la sous-fonctionnalité possède sa permission `voir` ;
7. l’action demandée possède sa permission propre (`créer`, `modifier`, ou la permission métier dédiée).

Le périmètre le plus restrictif gagne toujours. Une permission de rôle ne peut jamais réactiver un module refusé par l’entreprise ou l’unité.

### Règles de permissions

- Au niveau racine du module, seule la visibilité (`voir`) doit être proposée dans l’éditeur de rôle.
- `créer` et `modifier` doivent être portés par les sous-fonctionnalités concernées, jamais accordés globalement à tout le module.
- Les modules spécialisés peuvent utiliser des permissions métier supplémentaires, mais leurs clés doivent rester stables et documentées.
- Une sous-fonctionnalité ne doit pas être visible si le module parent n’est pas visible.
- Retirer `voir` du module doit retirer ou neutraliser les droits détaillés qui ne peuvent plus être atteints.
- Toute nouvelle clé de permission doit être produite par une fonction centrale, pas construite différemment dans chaque écran.
- Les alias historiques doivent rester uniquement dans une couche de compatibilité ; les nouvelles données utilisent les identifiants canoniques.
- Les secteurs d’activité administratifs peuvent définir `moduleFeatures` dans `SectorPreset` pour choisir les fonctionnalités proposées avec chaque module lors d’une inscription.
- La configuration des secteurs affiche les fonctionnalités réelles du module, et non seulement son intitulé : onglets Commerce, sous-rubriques Stocks et fonctionnalités des autres modules.
- Lorsqu’une fonctionnalité est sélectionnée dans un profil de secteur, ses prérequis sont également sélectionnés en visibilité afin de ne pas créer de périmètre incohérent.

### Dépendances entre modules

Une dépendance signifie qu’un module requiert un autre module pour être cohérent ou fonctionner. Elle doit être traitée comme une contrainte métier, pas comme une simple information affichée.

- Ne jamais ajouter une dépendance implicite dans un écran ou une route.
- Ne pas réutiliser l’ancien champ de données `dependencies` sans migration : il est lu comme une donnée héritée puis ignoré par le chargement actuel.
- Si une dépendance réelle est introduite, elle doit être ajoutée au contrat typé du catalogue, par exemple `dependsOn: ModuleId[]`, puis utilisée dans :
  - la validation de l’activation entreprise ;
  - la validation de l’activation par unité ;
  - les formulaires d’administration ;
  - les messages d’erreur explicites ;
  - les tests de permissions et de navigation.
- Une entreprise ne peut pas activer un module sans ses dépendances obligatoires.
- Une unité ne peut pas sélectionner un module dont l’entreprise ou l’unité ne possède pas les dépendances.
- Retirer un module requis doit prévenir l’administrateur et traiter les modules dépendants ; ne jamais laisser une configuration silencieusement incohérente.
- Une dépendance circulaire doit être refusée explicitement.
- Une dépendance technique facultative ne doit pas être traitée comme une permission utilisateur.

### Dépendances entre fonctionnalités

Les fonctionnalités d’un même module peuvent aussi avoir des prérequis. Elles utilisent des identifiants stables, indépendants du libellé affiché :

- les modules génériques déclarent `featureDependencies` dans leur entrée de catalogue ;
- Commerce déclare ses dépendances d’onglets dans `commerce-permissions.ts` ;
- Gestion de stock déclare ses dépendances de sous-rubriques dans `stockSubmoduleDependencies` ;
- `resolveFeatureDependencies()` résout toute la chaîne de prérequis et se protège contre les cycles.

- Lorsqu’une sous-fonctionnalité est activée, ses prérequis sont activés automatiquement en `voir` uniquement.
- Cette cascade ne donne jamais automatiquement `créer`, `modifier` ou une permission métier au prérequis.
- Les prérequis activés automatiquement doivent être visibles dans l’éditeur de rôle afin que l’administrateur comprenne la configuration produite.
- Si un rôle ancien contient une configuration incohérente, l’enregistrement doit la normaliser en rétablissant les prérequis en `voir`.

### Checklist pour ajouter un nouveau module

1. Ajouter un identifiant stable dans `ModuleId`.
2. Ajouter une entrée complète dans `modules` avec nom, description, fonctionnalités et statut.
3. Définir les dépendances éventuelles du module et de ses fonctionnalités dans le contrat du catalogue ; ne pas les coder en dur dans un composant.
4. Ajouter l’entrée d’administration et la configuration de statut si le module doit être activable ou désactivable.
5. Ajouter l’entrée de navigation KORA avec son `module`.
6. Créer l’écran du module et le brancher au registre de `App.tsx` et à `app-routes.tsx`.
7. Vérifier que l’entreprise peut autoriser le module et que l’unité peut le sélectionner uniquement dans ce périmètre.
8. Ajouter les sous-fonctionnalités dans le catalogue et générer leurs clés via `permissionFeatureKey`.
9. Ajouter le module à l’éditeur de rôles via `getConfiguredModules()` ; ne pas créer une liste parallèle.
10. Définir les droits d’action par sous-fonctionnalité, avec `voir` au niveau module uniquement.
11. Filtrer la navigation et protéger les routes directes avec les mêmes règles de permission.
12. Ajouter ou mettre à jour les tests de permissions, de dépendances de fonctionnalités et de routage.
13. Vérifier les états vide, chargement, accès refusé et module retiré.
14. Vérifier qu’un rôle existant et un employé existant ne gagnent pas de droits par défaut après l’ajout.

### Cas particuliers déjà normalisés

- **Commerce** : les onglets canoniques et les alias historiques sont centralisés dans `commerce-permissions.ts`. Toute nouvelle fonctionnalité Commerce doit être ajoutée à cette définition.
- **Gestion de stock** : les dix sous-rubriques sont centralisées dans `stockSubmodules`. Les droits détaillés utilisent les clés `stocks:<sous-module>`.
- **Présences** : les droits spécialisés utilisent les clés `presence.<permission>` et doivent respecter le périmètre de l’unité.
- **Modules futurs** : le catalogue configuré doit alimenter automatiquement l’éditeur de rôles, les sélecteurs d’unité et les contrôles de navigation.

### Validation obligatoire avant livraison

- `pnpm --filter @workspace/maximus run typecheck`
- `pnpm --filter @workspace/maximus test`
- `git diff --check`
- build Vite de MAXIMUS réussi ;
- test d’un rôle sans permission ;
- test d’un rôle avec module visible mais sous-fonctionnalité masquée ;
- test d’un rôle avec action autorisée sur une seule sous-fonctionnalité ;
- test d’un module refusé par l’unité ;
- test d’accès direct à une route non autorisée ;
- test d’une dépendance absente ou circulaire si le module en déclare une.

## Product

MAXIMUS permet de parcourir l’administration globale, inscrire et valider des entreprises, configurer les modules et dépendances, puis piloter KORA avec des vues Finance, Commerce, Stocks, RH et Présences. Les actions de vente, paiement, organisation, collaborateurs, rôles et journal sont interactives.

## User preferences

- Interface entièrement en français et montants affichés en FCFA.
- Priorité produit : noyau Entreprises → Modules → Dépendances → Organisation → Utilisateurs → Rôles → Permissions.

## Gotchas

- Les identifiants de démonstration sont visibles sur l’écran de connexion; les comptes employés KORA utilisent le mot de passe `Kora123!`.
- La réinitialisation de la démo se fait depuis Administration → Paramètres.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
