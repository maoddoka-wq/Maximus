---
name: Galerie photo Transport
description: Contrainte durable pour les uploads multi-images de la vitrine Taxi.
---

Les galeries Transport envoyées dans une seule requête JSON doivent rester sous la limite `post_max_size` de l’environnement PHP ; privilégier peu d’images compressées plutôt que plusieurs fichiers lourds.

**Why:** les images sont encodées en base64, ce qui augmente la taille de la requête et peut faire échouer une sélection pourtant valide côté navigateur.

**How to apply:** avant d’augmenter le nombre ou la taille maximale des photos Taxi, vérifier la limite PHP de la cible ou passer à un upload séparé persistant.