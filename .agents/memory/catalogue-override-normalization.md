---
name: Overrides de catalogue tolérants
description: Règle de robustesse pour les modules, packs et permissions issus d’anciens états persistés.
---

Les overrides de catalogue sont des données persistées et peuvent contenir des tableaux nuls, des packs incomplets ou des permissions mal formées. Ils doivent être normalisés à la frontière du store et à la frontière Laravel avant d’être fusionnés avec les modules intégrés ou utilisés pour valider une inscription. Le serveur doit valider avec les mêmes overrides publiés que ceux exposés au formulaire.

**Why:** un état ancien ou partiellement migré pouvait faire planter les écrans administratifs avec `.map()` ou `.flatMap()` et masquer toute la page derrière le fallback React générique ; un serveur qui ignorait ensuite ces overrides refusait aussi les identifiants de packs pourtant affichés par l’inscription.

**How to apply:** faire passer les écrans d’administration, d’inscription, de secteurs et de test de packs par le même module configuré normalisé, convertir les packs camelCase en forme serveur avant validation, puis couvrir les formes JSON incomplètes et les packs publiés remplacés par des tests de régression.