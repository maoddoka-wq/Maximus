---
name: Tuiles de carte publiques
description: Robustesse des tuiles publiques et respect des politiques d’usage OpenStreetMap.
---

Pour les cartes Taxi client et chauffeur, utiliser la même URL canonique `https://tile.openstreetmap.org/{z}/{x}/{y}.png` sans rotation vers les sous-domaines `a`, `b`, `c`. Ne pas basculer automatiquement vers CARTO : une image « API KEY REQUIRED » peut être renvoyée comme une réussite et ne déclencher aucun `tileerror`. Les autres cartes peuvent conserver un fournisseur secondaire si leur propre parcours le documente.

**Why:** La politique OSM demande l’hôte exact `tile.openstreetmap.org`; les cartes Chauffeur ont affiché des tuiles 403 avec le texte « App is not following the tile usage policy » tandis que leur tracé restait visible. L’image d’erreur CARTO peut aussi ressembler à une tuile valide.

**How to apply:** Garder la même URL canonique sur web et natif, fournir un User-Agent qui identifie l’app native, conserver attribution et cache HTTP, et ne charger que les tuiles visibles. Si l’hôte canonique renvoie encore 403, afficher l’indisponibilité et choisir un fournisseur autorisé plutôt que de réessayer les sous-domaines.

Les données OSM sont libres, mais les serveurs de tuiles sont à capacité limitée, sans SLA. Ne pas précharger ni proposer de cartes hors ligne avec le service public standard; respecter son User-Agent, son attribution et ses en-têtes de cache.