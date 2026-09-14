---
name: Capacités vitrine e-commerce
description: Règle d’exposition publique des fonctionnalités Location, Transport et Livraisons.
---

La vitrine publique doit dériver ses capacités de l’accès de l’entreprise : Location et Livraisons viennent d’E-commerce, tandis que Transport vient du module `transport`. Le module concerné doit être actif et la fonctionnalité doit être présente dans `featureIds`. Une liste `featureIds` vide conserve le comportement historique « accès non restreint ».

**Why:** Les menus visibles au client ne doivent pas contourner l’autorisation des modules de l’entreprise, tout en restant compatibles avec les anciennes entreprises dont l’accès était global.

**How to apply:** Faire calculer les capacités côté API depuis l’entreprise du store, puis masquer les routes et entrées de navigation publiques quand la capacité est absente. La page Transport publique utilise les coordonnées de la boutique pour contacter le service Taxi.