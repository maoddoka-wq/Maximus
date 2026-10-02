---
name: Imports des tests Node strip-types
description: Résolution ESM des fichiers TypeScript testés directement par Node.
---

Les tests lancés avec `node --experimental-strip-types` résolvent les imports ESM comme Node, pas comme le bundler TypeScript : les imports relatifs vers un autre fichier TypeScript doivent inclure l’extension `.ts`.

**Why:** Un import sans extension peut passer le chargement TypeScript mais échouer dans Node avec `ERR_MODULE_NOT_FOUND`.

**How to apply:** Pour un module TypeScript importé directement par un test Node, utiliser l’extension `.ts` et activer `allowImportingTsExtensions` dans le tsconfig du consommateur, avec la compilation en mode `noEmit`.