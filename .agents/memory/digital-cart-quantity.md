---
name: Quantité des produits numériques
description: Règle métier et frontière de données pour les articles numériques du panier e-commerce.
---

Un produit numérique est toujours vendu par ligne à quantité 1. Il ne suit aucune logique d’expédition physique et son téléchargement est disponible uniquement après paiement confirmé.

**Why:** Une quantité variable pourrait multiplier indûment une livraison numérique et une projection de panier client dépourvue du type de fulfillment pourrait réintroduire les contrôles de quantité ou une adresse de livraison.

**How to apply:** Normaliser la quantité à 1 côté interface, panier serveur et création de commande. Inclure `fulfillment_type` dans toute réponse de panier client afin que l’interface puisse masquer les contrôles +/- et exclure l’adresse de livraison pour une commande exclusivement numérique.