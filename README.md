# MAXIMUS ERP

MAXIMUS est un ERP SaaS multi-entreprises en français. L’application permet à
une équipe MAXIMUS d’administrer les entreprises, puis à chaque entreprise de
configurer ses unités, ses rôles, ses employés, ses modules et ses permissions.

Le produit couvre actuellement :

- l’administration globale MAXIMUS ;
- les espaces entreprise et employés KORA ;
- les modules Commerce, Gestion de stock, Présences et Contrôle & coordination ;
- l’organisation hiérarchique par secteurs et unités ;
- les rôles, permissions détaillées et dépendances entre fonctionnalités ;
- la personnalisation visuelle de chaque entreprise ;
- la persistance PostgreSQL des parcours opérationnels ;
- des données et comptes de démonstration provisionnés de façon idempotente.

## Architecture en une minute

Le dépôt est un monorepo pnpm :

```text
artifacts/
├── maximus/          # frontend React + Vite
├── api-server/       # API active Laravel + PostgreSQL
└── mockup-sandbox/   # previews de composants isolés

lib/
├── api-client-react/ # client et hooks générés depuis OpenAPI
├── api-spec/         # contrat OpenAPI et codegen
├── api-zod/          # schémas partagés
└── db/               # schéma Drizzle de la couche Express legacy

docs/                 # documentation technique et exports
scripts/              # scripts du workspace
```

### Runtime actif

- **Frontend** : React, TypeScript, Vite, Tailwind CSS et Wouter.
- **API active** : Laravel HTTP kernel, Eloquent et PostgreSQL.
- **API legacy** : Express 5 et Drizzle restent présents pour la migration
  progressive et la comparaison de parité. Ils ne servent pas le preview actif.
- **Session** : cookie `HttpOnly` géré côté serveur.
- **Stockage** : PostgreSQL pour l’authentification et les données métier ;
  `localStorage` reste réservé aux préférences d’interface et à la session.

La règle importante est donc : une correction de sécurité ou de périmètre doit
d’abord être faite dans Laravel. Express ne doit pas être supprimé tant que la
parité n’est pas prouvée.

## Installation

Prérequis :

- Node.js 24 ;
- pnpm ;
- PHP 8.2 ou supérieur pour Laravel ;
- PostgreSQL accessible avec les variables de connexion du workspace.

```bash
pnpm install
```

## Développement

### Frontend MAXIMUS

Le workflow Replit configure automatiquement `PORT` et `BASE_PATH`. En local,
ces variables sont obligatoires pour Vite :

```bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/maximus run dev
```

L’application est alors disponible sur `http://localhost:5173`.

### API Laravel

Depuis `artifacts/api-server` :

```bash
cd artifacts/api-server/laravel
DB_CONNECTION=pgsql php artisan migrate
DB_CONNECTION=pgsql php -S 0.0.0.0:8080 ../server.php
```

Le workflow actif démarre directement le serveur PHP. Les données de
démonstration de l’environnement Replit résident dans sa base PostgreSQL et ne
sont pas recréées depuis le dépôt :

```bash
cd laravel
DB_CONNECTION=pgsql php -S 0.0.0.0:${PORT} server.php
```

En production, le démarrage ne provisionne aucune donnée de démonstration.
Il applique les migrations PostgreSQL puis crée uniquement l’administrateur
MAXIMUS à partir des secrets `ADMIN_USER` et `ADMIN_PASSWORD`. `APP_KEY` est
également obligatoire ; le service refuse de démarrer s’il est absent.
Le seeder Laravel est également neutralisé hors des environnements local et de
test : `db:seed` ne peut donc pas créer l’utilisateur de démonstration sur
Render.

```bash
cd artifacts/api-server/laravel
DB_CONNECTION=pgsql php artisan migrate --force --no-interaction
DB_CONNECTION=pgsql php artisan maximus:provision-admin --no-interaction
DB_CONNECTION=pgsql php -S 0.0.0.0:${PORT} server.php
```

### Workflows du projet

Les trois workflows habituels sont :

| Workflow | Responsabilité |
| --- | --- |
| `artifacts/maximus: web` | frontend Vite |
| `artifacts/api-server: API Server` | Laravel + PostgreSQL |
| `artifacts/mockup-sandbox: Component Preview Server` | previews de composants |

Les comptes et données de chaque environnement doivent être créés dans sa base
PostgreSQL active. Aucun compte ou mot de passe de démonstration n’est embarqué
dans le dépôt ou dans le bundle frontend. Ne jamais enregistrer un mot de passe
utilisateur dans `localStorage` ou dans le store frontend.

## Organisation du frontend

Le frontend est organisé par responsabilité :

```text
artifacts/maximus/src/
├── App.tsx                    # composition de l’application et écrans historiques
├── main.tsx                   # point d’entrée React
├── components/
│   ├── app-chrome.tsx         # shell, sidebar, topbar et en-têtes
│   ├── app-ui.tsx             # champs, boutons, métriques, tableaux et badges partagés
│   └── ...                    # composants de dialogue et d’administration
├── pages/
│   ├── commerce-module.tsx
│   ├── stock-module.tsx
│   ├── presence-module.tsx
│   ├── control-center.tsx
│   └── organization-*.tsx
├── routes/
│   └── app-routes.tsx         # routes protégées MAXIMUS et KORA
├── hooks/                     # état React réutilisable
└── lib/
    ├── app-access.ts          # contexte d’accès effectif
    ├── store.ts               # modèles, catalogue et démo locale
    ├── module-registry.ts     # registre des modules et chemins
    ├── employee-permissions.ts
    ├── permission-keys.ts
    ├── *-api.ts               # accès aux endpoints Laravel
    └── *-permissions.ts       # règles propres à un module
```

### Règles de maintenance frontend

1. Les écrans métier vont dans `pages/`, pas dans un nouveau bloc de `App.tsx`.
2. Les composants visuels réutilisables vont dans `components/`.
3. Les règles d’accès, identifiants et dépendances vont dans `lib/`, jamais
   directement dans un bouton ou un écran isolé.
4. Les appels API restent dans un fichier `lib/*-api.ts` typé.
5. Une page doit traiter ses états chargement, vide, erreur et accès refusé.
6. Les paramètres d’onglet utilisent la query string centralisée et le chemin
   est comparé sans cette query string.
7. Les nouveaux composants doivent conserver des props explicites et éviter
   `any`, les listes parallèles et les valeurs magiques.

## Ajouter ou modifier un module

Un module traverse toujours le parcours :

```text
catalogue → entreprise → unité → rôle → employé → navigation → route → écran
```

Pour un nouveau module :

1. déclarer un identifiant stable dans le catalogue ;
2. décrire ses fonctionnalités et dépendances ;
3. l’ajouter au registre de navigation ;
4. créer son écran dans `src/pages/` ;
5. protéger sa route et ses permissions ;
6. vérifier l’activation entreprise et unité ;
7. ajouter les tests de permission, dépendance et navigation ;
8. vérifier les états vide, chargement et accès refusé.

La chaîne de contrôle effective est :

```text
entreprise → unité → rôle → sous-fonctionnalité → action
```

Le périmètre le plus restrictif gagne toujours. Un `companyId` fourni par le
navigateur ne peut jamais élargir l’entreprise déduite de la session serveur.

## Vérifications avant livraison

Depuis la racine :

```bash
pnpm run typecheck
pnpm --filter @workspace/maximus test
pnpm --filter @workspace/api-server test
pnpm run build
git diff --check
```

Vérifications utiles pour une modification d’accès :

- connexion MAXIMUS, entreprise et employé ;
- restauration de session après rafraîchissement ;
- accès direct à une route non autorisée ;
- module autorisé par l’entreprise mais refusé par l’unité ;
- sous-fonctionnalité visible sans permission d’action ;
- séparation entre deux entreprises ;
- création et connexion immédiate d’un nouvel employé.

## Documentation complémentaire

- [`docs/technical.md`](./docs/technical.md) — architecture technique,
  persistance, routage, API, permissions et modules ;
- [`docs/technical.docx`](./docs/technical.docx) — version Word éditable ;
- [`docs/technical.pdf`](./docs/technical.pdf) — version PDF ;
- [`replit.md`](./replit.md) — décisions de conception et contrat détaillé
  pour les modules, permissions et la migration Laravel.