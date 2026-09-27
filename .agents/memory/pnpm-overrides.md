---
name: Overrides de sécurité pnpm
description: Choix du fichier manifeste pour appliquer durablement les overrides transitifs au lockfile pnpm.
---

Les overrides destinés à corriger les versions transitives doivent être déclarés dans `package.json` sous `pnpm.overrides`, puis le lockfile doit être régénéré et vérifié avec `pnpm install --frozen-lockfile`.

**Why:** Dans ce workspace, les valeurs de `pnpm-workspace.yaml` apparaissaient dans `pnpm config get overrides`, mais le lockfile conservait les résolutions vulnérables. Les overrides racine dans `package.json` ont été enregistrés dans le lockfile et ont fait passer `pnpm audit`.

**How to apply:** Pour toute mise à niveau forcée d’une dépendance transitive, vérifier sa présence dans la section `overrides` du lockfile, lancer l’audit, puis tester une installation figée avant livraison.