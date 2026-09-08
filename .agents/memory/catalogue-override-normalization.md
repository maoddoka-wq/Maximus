---
name: Overrides de catalogue tolérants
description: Règle de robustesse pour les modules, packs et permissions issus d’anciens états persistés.
---

Les overrides de catalogue sont des données persistées et peuvent contenir des tableaux nuls, des packs incomplets ou des permissions mal formées. Ils doivent être normalisés à la frontière du store avant d’être fusionnés avec les modules intégrés.

**Why:** un état ancien ou partiellement migré pouvait faire planter les écrans administratifs avec `.map()` ou `.flatMap()` et masquer toute la page derrière le fallback React générique.

**How to apply:** faire passer les écrans d’administration, d’inscription, de secteurs et de test de packs par le même module configuré normalisé, puis couvrir les formes JSON incomplètes par un test de régression.