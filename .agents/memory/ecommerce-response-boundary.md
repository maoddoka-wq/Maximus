---
name: Normalisation des réponses E-commerce
description: Protection des écrans boutique contre les commandes ou collections historiques incomplètes.
---

Les réponses E-commerce doivent être normalisées à la frontière frontend avant rendu : les collections manquantes deviennent des collections vides et les lignes de commande absentes deviennent un tableau vide.

**Why:** une commande ancienne ou partiellement migrée peut contenir une forme différente sans que toute la boutique doive devenir inutilisable.

**How to apply:** normaliser le bootstrap après l’appel API et conserver des garde-fous dans les vues qui parcourent les commandes, produits, locations et demandes de livraison.