---
name: Tuiles de carte publiques
description: Robustesse des tuiles publiques et respect des politiques d’usage OpenStreetMap.
---

Pour les cartes Taxi client et chauffeur, utiliser uniquement les tuiles publiques OpenStreetMap et répartir/réessayer les sous-domaines `a`, `b`, `c`. Ne pas les basculer vers CARTO : une image « API KEY REQUIRED » peut être renvoyée comme une réussite et ne déclencher aucun `tileerror`. Les autres cartes peuvent conserver un fournisseur secondaire si leur propre parcours le documente.

**Why:** Chauffeur et client doivent voir le même fond sans clé de carte; l’image d’erreur CARTO ne ressemble pas à une panne réseau pour le composant et peut donc masquer la carte.

**How to apply:** Sur les cartes Taxi, garder les tuiles sous-domainées OSM sur web et natif, et signaler explicitement une indisponibilité après les tentatives OSM. Pour un autre produit cartographique, n’ajouter un fournisseur secondaire qu’avec un test de bascule et une attribution correcte.

Pour `tile.openstreetmap.org`, utiliser l’URL HTTPS standard, un `User-Agent` stable qui identifie l’application, une attribution visible et le cache HTTP normal. Ne demander que les tuiles affichées ; ne pas précharger ni proposer de cartes hors ligne.

**Why:** Les données OSM sont libres, mais les serveurs de tuiles standards sont à capacité limitée, sans garantie de disponibilité et peuvent bloquer les clients non identifiables ou les téléchargements massifs.

**How to apply:** Garder l’identifiant applicatif et l’attribution sur les vues natives comme web, respecter les en-têtes de cache et ne demander que les tuiles visibles.