# MAXIMUS ERP

MAXIMUS est un prototype web d’ERP SaaS multi-entreprises, conçu en français pour piloter les opérations, les modules métier, l’organisation et les permissions des entreprises.

## Fonctionnalités principales

- espace d’administration MAXIMUS ;
- espaces entreprise et employés ;
- modules activables par entreprise et par unité ;
- rôles, permissions et sous-fonctionnalités ;
- dépendances entre fonctionnalités avec prérequis en visibilité ;
- gestion de Commerce et de Gestion de stock ;
- organisation hiérarchique, rôles et managers ;
- profils de secteurs d’activité pour préconfigurer les modules et fonctionnalités à l’inscription ;
- personnalisation des couleurs et du menu de chaque entreprise ;
- navigation adaptée aux modules autorisés de chaque utilisateur.

## Stack

- React, TypeScript et Vite ;
- pnpm workspaces ;
- Tailwind CSS ;
- Express pour le serveur API ;
- PostgreSQL et Drizzle ORM pour les packages serveur ;
- PostgreSQL via l’API pour Présences, Stocks et Contrôle & coordination, avec `localStorage` conservé pour l’état de démonstration et le repli du prototype MAXIMUS.

## Installation

```bash
pnpm install
```

## Développement

### Application MAXIMUS

```bash
pnpm --filter @workspace/maximus run dev
```

L’application web principale se trouve dans `artifacts/maximus`.

### Serveur API

```bash
pnpm --filter @workspace/api-server run dev
```

Le serveur API se trouve dans `artifacts/api-server`.

## Vérifications

```bash
pnpm run typecheck
pnpm --filter @workspace/maximus test
pnpm run build
```

Le test MAXIMUS couvre notamment la chaîne d’accès employé, les permissions Commerce et Stocks, les alias historiques et les dépendances entre fonctionnalités.

## Organisation du code

```text
artifacts/
├── maximus/       # application web MAXIMUS ERP
└── api-server/    # serveur API Express
```

Fichiers importants de l’application :

- `artifacts/maximus/src/App.tsx` : navigation, écrans et interactions principales ;
- `artifacts/maximus/src/lib/store.ts` : modèles, catalogue des modules et données de démonstration ;
- `artifacts/maximus/src/lib/employee-permissions.ts` : calcul des permissions effectives ;
- `artifacts/maximus/src/lib/company-theme.ts` : thème visuel des espaces entreprise ;
- `artifacts/maximus/src/routes/app-routes.tsx` : routes protégées et écrans associés ;
- `artifacts/maximus/src/index.css` : tokens visuels et styles responsive.

## Règle d’accès

L’accès effectif suit cette chaîne :

```text
Entreprise → unité → rôle → sous-fonctionnalité → action
```

Une permission de rôle ne peut pas réactiver un module refusé par l’entreprise ou par l’unité.

## Documentation projet

- [`docs/technical.md`](./docs/technical.md) : architecture, données, routage, permissions, modules, thème et commandes techniques ;
- [`docs/technical.docx`](./docs/technical.docx) : version Word éditable de la documentation technique ;
- [`docs/technical.pdf`](./docs/technical.pdf) : version PDF mise en page de la documentation technique ;
- [`replit.md`](./replit.md) : décisions détaillées de structure, de permissions, de dépendances et de contribution.