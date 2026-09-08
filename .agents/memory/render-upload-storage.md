---
name: Stockage des téléversements en production
description: Les fichiers téléversés sur le disque local de Render peuvent disparaître après redémarrage ou redéploiement.
---

Les fichiers utilisateurs destinés à rester visibles publiquement doivent être conservés dans un stockage durable (base PostgreSQL ou stockage objet), pas uniquement dans `storage/app/public`.

**Why:** Le service Render actuel n’a pas de disque persistant configuré ; le catalogue reste en base, mais un fichier local peut disparaître alors que son URL est toujours enregistrée.

**How to apply:** Pour toute nouvelle image produit ou autre ressource publique, prévoir une copie durable et garder le disque local seulement comme compatibilité ou cache.