---
name: Replit artifact production paths
description: Production commands for artifact services run from the repository root.
---

Les commandes `services.production.build` et `services.production.run` des artefacts Replit doivent utiliser des chemins depuis la racine du dépôt, par exemple `artifacts/api-server/laravel`, et non des chemins relatifs au dossier de l’artefact.

**Why:** Le build Cloud Run peut échouer avant toute compilation avec `cd: laravel: No such file or directory` lorsque le chemin suppose que le processus démarre dans `artifacts/api-server`.

**How to apply:** Vérifier les chemins de `artifact.toml` contre le répertoire de lancement publié et préférer `composer --working-dir=artifacts/...` ainsi que des chemins explicites vers `artisan` et `server.php`.