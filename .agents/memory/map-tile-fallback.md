---
name: Fonds de carte Taxi
description: Robustesse des tuiles Leaflet dans les aperçus et sur les réseaux mobiles.
---

Le trajet et les marqueurs doivent rester visibles même si le fournisseur de tuiles principal ne répond pas : utiliser un fond public principal avec un repli détecté sur `tileerror`.

**Why:** Une carte peut sembler blanche alors que Leaflet et les données GPS fonctionnent ; l’échec des images de tuiles est silencieux dans l’interface.

**How to apply:** Tester le rendu sur mobile et prévoir un second fournisseur de tuiles avant de conclure à une panne de page.