---
name: Codegen OpenAPI et Zod
description: Contrainte de version du générateur Orval dans le monorepo MAXIMUS.
---

Orval 8 peut détecter Zod 4 automatiquement, alors que le workspace utilise Zod 3.25. La configuration de génération doit donc fixer explicitement `zod.version` à `3`.

**Why:** Sans cette option, les fichiers générés utilisent `zod.int()`, qui n’existe pas dans la version Zod installée, et le typecheck des bibliothèques échoue.

**How to apply:** Après toute modification d’OpenAPI, relancer le codegen puis vérifier le typecheck des bibliothèques ; ne pas mettre à niveau Zod globalement pour contourner ce conflit.