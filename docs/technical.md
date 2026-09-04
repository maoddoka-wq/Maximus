# Documentation technique — MAXIMUS ERP

## 1. Vue d’ensemble

MAXIMUS ERP est une application web React/TypeScript construite dans un monorepo pnpm. Elle simule un ERP SaaS multi-entreprises avec :

- un espace d’administration MAXIMUS ;
- des espaces entreprise et employés ;
- un catalogue de modules activables ;
- une organisation hiérarchique par unités ;
- des rôles et permissions par fonctionnalité ;
- des écrans métier pour Commerce, Stocks, Présences et les modules opérationnels ;
- une personnalisation visuelle par entreprise.

L’application MAXIMUS est principalement un prototype fonctionnel côté navigateur. Son état de démonstration est conservé dans `localStorage`.

## 2. Structure du monorepo

```text
artifacts/
├── maximus/       # frontend React/Vite de MAXIMUS ERP
└── api-server/    # serveur API Express

lib/               # packages partagés
scripts/            # scripts de workspace et post-merge
docs/               # documentation du projet
```

Le workspace est défini dans `pnpm-workspace.yaml`. Les packages situés dans `artifacts/*`, `lib/*` et `scripts` sont gérés par pnpm.

## 3. Frontend MAXIMUS

### 3.1 Entrée et rendu

- `artifacts/maximus/src/main.tsx` monte l’application React.
- `artifacts/maximus/src/App.tsx` orchestre la session, l’état global de démonstration, la navigation, le thème et les écrans.
- `artifacts/maximus/src/index.css` contient les tokens visuels, les variables de thème et les règles responsive.
- `artifacts/maximus/vite.config.ts` configure Vite, l’alias `@`, le chemin de base et le proxy `/api`.

Vite attend les variables suivantes :

- `PORT` : port du serveur de développement ou de preview ;
- `BASE_PATH` : chemin de base de l’artefact.

Le serveur Vite écoute sur `0.0.0.0` et autorise les hôtes du preview Replit.

### 3.2 Routes applicatives

Le routage est assuré par Wouter :

- `/` : connexion ;
- `/inscription` : inscription ou création administrative d’une entreprise ;
- `/maximus/...` : espace d’administration MAXIMUS ;
- `/kora/...` : espace entreprise et employés.

Les routes sont centralisées dans `artifacts/maximus/src/routes/app-routes.tsx` :

- `AdminRouter` sélectionne les écrans MAXIMUS ;
- `KoraRouter` sélectionne les écrans d’entreprise ;
- les routes sont filtrées par session, modules autorisés et permissions.

Les paramètres d’onglet sont transmis dans la query string, par exemple :

```text
/kora/commerce?tab=products
/kora/stocks?tab=inventory
```

Les routeurs comparent le chemin sans la query string. Les écrans utilisent `src/lib/query-tab.ts` pour lire l’onglet actif et gérer les alias historiques.

## 4. État et persistance

### 4.1 Store local

`artifacts/maximus/src/lib/store.ts` contient :

- les types métier ;
- le catalogue des modules ;
- les sous-rubriques Stocks ;
- les presets de secteurs d’activité ;
- les entreprises, employés, rôles et unités de démonstration ;
- les fonctions `loadData()` et `saveData()`.

La clé principale de persistance est :

```text
maximus-data-v1
```

La lecture du store :

1. tente de charger les données JSON existantes ;
2. restaure la structure attendue ;
3. complète les données héritées si nécessaire ;
4. utilise les données de démonstration lorsque le store est absent ou invalide.

### 4.2 Session et préférences

Les informations suivantes sont conservées dans `localStorage` ou `sessionStorage` :

- `maximus-session` : session active ;
- `maximus-sidebar-collapsed` : état replié du menu ;
- `maximus-company-search` : recherche d’entreprise dans l’administration ;
- préférences de notification et de confirmation du module Stocks ;
- états locaux de Commerce par entreprise.

La synchronisation entre onglets repose sur l’événement navigateur `storage`.

### 4.3 Couche de contrôle et de coordination

Le centre **Contrôle & coordination** est accessible depuis MAXIMUS et depuis les espaces entreprise :

- `/maximus/controle` : vue transverse pour l’administration MAXIMUS ;
- `/kora/controle` : vue limitée au périmètre de l’entreprise, de l’unité ou de l’employé.

Le store conserve trois flux complémentaires :

- `controlTasks` : actions, validations et décisions attendues ;
- `domainEvents` : événements métier produits par une opération ;
- `auditEntries` : journal attribué des changements et validations.

Une validation de tâche met à jour son statut et écrit simultanément un événement, une trace d’audit et une notification. Cette chaîne constitue le premier socle d’un futur moteur de workflows :

```text
Événement → tâche → approbation → mise à jour → audit → notification
```

Les tâches sont filtrées par entreprise. Un employé voit les tâches qui lui sont affectées ; un administrateur d’entreprise ou un manager de secteur voit le périmètre qui lui est confié.

## 5. Modèle d’accès et permissions

La chaîne de contrôle est :

```text
Entreprise → unité → rôle → sous-fonctionnalité → action
```

### 5.1 Plafonds d’accès

- `Company.allowedModules` définit les modules disponibles pour l’entreprise.
- `OrgNode.moduleIds` réduit les modules accessibles à une unité.
- `Role.modulePermissions` définit les permissions du rôle.
- Les permissions détaillées utilisent des clés de fonctionnalité propres au module.

Le périmètre le plus restrictif l’emporte. Un rôle ne peut jamais réactiver un module retiré par l’entreprise ou par l’unité.

### 5.2 Calcul des permissions

`artifacts/maximus/src/lib/employee-permissions.ts` centralise notamment :

- la reconstruction de l’ascendance de l’employé ;
- la vérification du rattachement du rôle à l’unité ;
- les permissions Commerce ;
- les permissions détaillées Stocks ;
- les permissions Présences ;
- la résolution des dépendances entre fonctionnalités.

`artifacts/maximus/src/lib/permission-keys.ts` produit les clés canoniques et protège la résolution des dépendances contre les cycles.

Au niveau racine d’un module, l’éditeur propose seulement `voir`. Les actions `créer` et `modifier` sont configurées dans les sous-fonctionnalités.

## 6. Catalogue des modules

Les modules sont décrits comme des données structurées dans `store.ts`.

Un module contient notamment :

```ts
{
  id,
  name,
  description,
  features,
  featureDependencies,
  status
}
```

`getConfiguredModules()` applique les réglages administratifs :

- `moduleOverrides` pour modifier le nom, la description ou les fonctionnalités ;
- `removedModules` pour retirer un module ;
- le statut d’activation ou de bêta.

### 6.1 Commerce

`src/lib/commerce-permissions.ts` définit les onglets canoniques de Commerce et conserve les alias historiques comme Clients, Devis, Commandes, Chiffre d’affaires et Facturation.

Les liens Commerce doivent toujours produire les onglets canoniques dans la query string.

### 6.2 Stocks

Les dix sous-rubriques Stocks sont conservées dans `stockSubmodules`. Elles sont utilisées par :

- la navigation verticale des employés ;
- l’éditeur de permissions ;
- le calcul des permissions détaillées ;
- le module Stocks.

Les opérations sensibles attendent une confirmation explicite avant leur exécution.

### 6.3 Presets de secteurs

`SectorPreset` permet à MAXIMUS de définir, pour un secteur d’activité :

- les modules proposés ;
- les fonctionnalités proposées pour chaque module via `moduleFeatures`.

La page **MAXIMUS → Secteurs d’activité** applique les prérequis en visibilité lorsqu’une fonctionnalité dépendante est sélectionnée. Cette configuration appartient au profil de secteur, pas à la structure interne d’une unité.

## 7. Organisation et employés

Les écrans d’organisation sont séparés par responsabilité :

- `organization-structure.tsx` : hiérarchie des unités ;
- `organization-roles.tsx` : rôles et permissions ;
- `organization-employees.tsx` : employés et affectations ;
- `company-organization.tsx` : conteneur du parcours Organisation ;
- `organization-shared.tsx` : composants et modèles partagés.

Les unités utilisent `parentId` pour construire la hiérarchie. Les rôles et employés sont affectés à une unité via `sectorId`.

Les employés ayant plusieurs modules disposent d’une navigation verticale groupée par module. Les notifications restent accessibles depuis la cloche supérieure.

## 8. Thème entreprise

`src/lib/company-theme.ts` convertit les couleurs hexadécimales de l’entreprise en variables HSL :

- `primaryColor` : couleur principale des boutons, liens et états actifs ;
- `accentColor` : couleur d’accent ;
- `sidebarColor` : fond du menu latéral ;
- `sidebar-active` : état actif et survol du menu, dérivé de `primaryColor`.

Le thème est appliqué :

1. au document racine par `applyCompanyTheme()` ;
2. à l’`app-shell` courant ;
3. au style actif transmis au composant `Sidebar`.

Cette double application garantit que les composants CSS et les styles inline utilisent la même palette d’entreprise.

## 9. API et modules de données

Le package `artifacts/api-server` fournit un serveur Express séparé avec des scripts de build et de démarrage.

Le frontend Vite réserve le préfixe `/api` au proxy vers le serveur API. Les modules métier disposent aussi d’adaptateurs locaux :

- `src/lib/stock-api.ts` pour les données et opérations Stocks ;
- `src/lib/presence-api.ts` pour les workflows Présences ;
- le module Commerce conserve son état local par entreprise lorsqu’il fonctionne en mode prototype.

Les données sensibles ou les secrets ne doivent jamais être ajoutés dans le code ni dans la documentation. Les variables d’environnement sont gérées par l’environnement Replit.

## 10. Tests et commandes

Installation :

```bash
pnpm install
```

Développement MAXIMUS :

```bash
pnpm --filter @workspace/maximus run dev
```

Typecheck :

```bash
pnpm run typecheck
pnpm --filter @workspace/maximus run typecheck
```

Tests de permissions :

```bash
pnpm --filter @workspace/maximus test
```

Build :

```bash
pnpm run build
pnpm --filter @workspace/maximus run build
```

Serveur API :

```bash
pnpm --filter @workspace/api-server run dev
```

## 11. Points d’attention pour les évolutions

Avant d’ajouter un module ou une fonctionnalité :

1. ajouter l’identifiant au catalogue typé ;
2. définir ses fonctionnalités et dépendances ;
3. créer ses clés de permission canoniques ;
4. l’ajouter à la navigation et aux routes ;
5. connecter l’entreprise, l’unité, le rôle et l’employé ;
6. protéger l’écran par les permissions effectives ;
7. ajouter les tests de parcours et de permissions ;
8. vérifier les query strings, les alias historiques et les états destructifs ;
9. vérifier le rendu dans les espaces entreprise et employés.

Les règles détaillées et décisions métier restent documentées dans [`replit.md`](../replit.md).