---
name: Frontière des données Commerce
description: Règle de synchronisation des workflows commerciaux entre état local et données opérationnelles partagées.
---

Les écrans Commerce utilisent deux périmètres de données : l’état local par entreprise pour les clients, crédits, dépenses, caisses et retours, et StoreData pour les produits, ventes, achats, mouvements et journal. Toute opération commerciale qui traverse ces périmètres doit mettre à jour les deux explicitement.

**Why:** Une mise à jour dans un seul périmètre donne une interface qui semble fonctionner mais laisse le stock, le solde client ou l’historique incohérent après navigation ou rechargement.

**How to apply:** Avant d’ajouter un workflow Commerce, identifier son périmètre de persistance puis synchroniser l’autre périmètre dans la même action utilisateur, avec confirmation pour les changements irréversibles.

Le POS E-commerce maintient son propre stock sur les produits de la boutique et journalise chaque sortie comptoir avec la vente, l’article, le caissier, la référence et les quantités avant/après. Ce stock n’est pas automatiquement lié aux soldes/entrepôts du module Gestion de stock.

**Why:** Les produits e-commerce et les articles d’entrepôt utilisent des identités et des tables distinctes; écrire dans le grand livre de stock sans correspondance de produit et d’entrepôt désynchroniserait les inventaires.

**How to apply:** Conserver les ventes comptoir dans l’inventaire e-commerce. Ne synchroniser vers le module Gestion de stock qu’après définition d’une correspondance produit/entrepôt explicite.

Les évolutions Commerce destinées aux magasins de produits physiques doivent garder un modèle commun pour toutes les catégories. Les besoins meubles, informatique ou autres secteurs utilisent des options et attributs facultatifs, pas des tableaux métier séparés ni des champs obligatoires propres à un secteur.

**Why:** Les clients visés vendent des familles de produits physiques variées; un modèle spécialisé par métier rendrait le module plus coûteux à faire évoluer et moins réutilisable.

**How to apply:** Pour les changements de catalogue, caisse et stock, privilégier les attributs communs et configurables. N’activer les numéros de série, garanties, variantes ou services comme options quand le type de produit l’exige.