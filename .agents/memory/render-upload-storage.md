---
name: Stockage des téléversements en production
description: Les fichiers téléversés sur le disque local de Render peuvent disparaître après redémarrage ou redéploiement.
---

Les fichiers utilisateurs destinés à rester visibles publiquement doivent être conservés dans un stockage durable (base PostgreSQL ou stockage objet), pas uniquement dans `storage/app/public`.

**Why:** Le service Render actuel n’a pas de disque persistant configuré ; le catalogue reste en base, mais un fichier local peut disparaître alors que son URL est toujours enregistrée.

**How to apply:** Pour toute nouvelle image produit ou autre ressource publique, prévoir une copie durable et garder le disque local seulement comme compatibilité ou cache.

Le logo d’entreprise est une exception déjà traitée par le stockage PostgreSQL : les octets et le type MIME sont conservés en base, tandis que l’URL publique reste stable. La boutique utilise ce logo comme repli lorsqu’aucun logo spécifique de boutique n’est configuré.

**Why:** Le profil entreprise et la vitrine doivent afficher la même identité visuelle après redémarrage, changement d’instance ou changement de machine.

**How to apply:** Pour les logos d’entreprise, servir d’abord la copie en base et ne garder le disque local que pour lire les anciennes images déjà enregistrées.