# MAXIMUS ERP

Prototype web interactif d’un ERP SaaS multi-entreprises en français, avec administration des espaces, modules activables, dépendances, organisation, rôles, permissions et opérations KORA.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/maximus/src/App.tsx` — navigation, écrans et interactions du prototype.
- `artifacts/maximus/src/lib/store.ts` — modèles, dépendances et données de démonstration persistées localement.
- `artifacts/maximus/src/index.css` — tokens visuels et responsive de MAXIMUS.
- `artifacts/maximus` — application web principale servie à la racine.

## Architecture decisions

- Le prototype utilise `localStorage` pour rendre les parcours de démonstration persistants sans service externe.
- Les modules disponibles et les dépendances sont définis comme des données structurées afin de préparer l’ajout de futurs modules.
- L’espace KORA calcule son menu à partir des modules autorisés et, pour un employé, des permissions de son rôle.

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
