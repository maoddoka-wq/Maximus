---
name: Dépendances du build Windows
description: Le script de mise à jour Windows doit conserver les outils de développement nécessaires à la compilation Vite.
---

Le script de mise à jour Windows doit installer les dépendances du workspace avec `pnpm install --frozen-lockfile --prod=false` avant de construire le frontend.

**Why:** Un environnement Windows peut hériter de `NODE_ENV=production` ou `npm_config_production=true`. Pnpm retire alors les devDependencies, notamment Vite, et l’étape de build échoue avec « vite n’est pas reconnu ».

**How to apply:** Forcer `--prod=false` pour l’installation des dépendances, puis définir `NODE_ENV=production` seulement pour la construction. Pour une copie existante qui n’a pas encore ce correctif, définir `NODE_ENV=development` et `npm_config_production=false` dans PowerShell avant de lancer le script. Ne pas contourner l’échec en supprimant des fichiers du workspace.