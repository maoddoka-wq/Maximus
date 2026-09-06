---
name: Exports Fast Refresh
description: Contraintes de rechargement à chaud pour les composants React du frontend MAXIMUS.
---

Les fichiers qui exportent des composants React doivent garder leurs exports limités aux composants et hooks associés ; les constantes de thème et utilitaires partagés vont dans un module sans JSX.

**Why:** Vite peut invalider le Fast Refresh lorsqu’un même fichier exporte des composants et des valeurs non composants, ce qui provoque un rechargement complet et rend les retours locaux moins fiables.

**How to apply:** Lorsqu’un écran partage des presets, validateurs ou fonctions de libellé, les placer dans un fichier `*-utils.ts` séparé et importer ces valeurs directement depuis ce module.