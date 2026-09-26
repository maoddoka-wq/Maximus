---
name: Limites du défilement mobile
description: Règles de confinement horizontal des vues MAXIMUS tout en gardant les surfaces de données accessibles.
---

Confiner le débordement horizontal à la page et corriger les composants flex/grid qui dépassent, mais conserver le défilement interne des tableaux de données et des rails de produits.

**Why:** masquer les débordements globaux rend des colonnes ou des produits inaccessibles; certains parcours publics et modules restent naturellement longs.

**How to apply:** avant d’ajouter `overflow: hidden` ou `clip`, identifier le propriétaire du défilement et vérifier les vues authentifiées ainsi que les pages publiques sur un petit viewport. Ne pas supprimer un défilement interne sans proposer une autre présentation mobile des données.