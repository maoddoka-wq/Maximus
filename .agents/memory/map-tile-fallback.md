---
name: Tuiles de carte publiques
description: Robustesse des tuiles publiques et respect des politiques d’usage OpenStreetMap.
---

Le trajet et les marqueurs doivent rester visibles même si le fournisseur de tuiles principal ne répond pas : utiliser un fond public principal avec un repli détecté sur `tileerror`.

**Why:** Une carte peut sembler blanche alors que Leaflet et les données GPS fonctionnent ; l’échec des images de tuiles est silencieux dans l’interface.

**How to apply:** Tester le rendu sur mobile et prévoir un second fournisseur de tuiles avant de conclure à une panne de page.

Pour `tile.openstreetmap.org`, utiliser l’URL HTTPS standard, un `User-Agent` stable qui identifie l’application, une attribution visible et le cache HTTP normal. Ne demander que les tuiles affichées ; ne pas précharger ni proposer de cartes hors ligne.

**Why:** Les données OSM sont libres, mais les serveurs de tuiles standards sont à capacité limitée, sans garantie de disponibilité et peuvent bloquer les clients non identifiables ou les téléchargements massifs.

**How to apply:** Garder l’identifiant applicatif et l’attribution sur les vues natives comme web, respecter les en-têtes de cache, et conserver un fournisseur de repli explicite.