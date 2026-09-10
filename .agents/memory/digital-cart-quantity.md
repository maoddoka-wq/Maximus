---
name: Quantité des produits numériques
description: Règle métier et frontière de données pour les articles numériques du panier e-commerce.
---

Un produit numérique est toujours vendu par ligne à quantité 1. Il ne suit aucune logique d’expédition physique : après paiement confirmé, une commande composée uniquement de numérique passe directement à `LIVRÉE` et son téléchargement devient disponible.

**Why:** Une quantité variable pourrait multiplier indûment une livraison numérique, tandis qu’un statut physique comme préparation ou expédition retarderait inutilement l’accès après paiement.

**How to apply:** Normaliser la quantité à 1 côté interface, panier serveur et création de commande. Inclure `fulfillment_type` dans toute réponse de panier client. Lors de la confirmation DiamanoPay, ne passer directement à `LIVRÉE` que si toutes les lignes sont numériques ; conserver le flux physique pour les commandes mixtes ou physiques.