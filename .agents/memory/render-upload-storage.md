---
name: Stockage des téléversements en production
description: Les fichiers téléversés sur le disque local de Render peuvent disparaître après redémarrage ou redéploiement.
---

Les fichiers utilisateurs destinés à rester visibles publiquement doivent être conservés dans un stockage durable (base PostgreSQL ou stockage objet), pas uniquement dans `storage/app/public`.

**Why:** Le service Render actuel n’a pas de disque persistant configuré ; le catalogue reste en base, mais un fichier local peut disparaître alors que son URL est toujours enregistrée.

**How to apply:** Pour toute nouvelle image produit ou autre ressource publique, prévoir une copie durable et garder le disque local seulement comme compatibilité ou cache.

Les logos d’entreprise et de boutique sont traités comme deux ressources indépendantes dans PostgreSQL : les octets et le type MIME sont conservés en base, tandis que chaque URL publique reste stable. Une boutique ne doit jamais utiliser automatiquement le logo de son entreprise.

**Why:** Le profil entreprise et la vitrine peuvent avoir des identités visuelles différentes, et les fichiers doivent rester disponibles après redémarrage, changement d’instance ou changement de machine.

**How to apply:** Pour chaque logo, servir d’abord la copie en base et ne garder le disque local que pour lire les anciennes images déjà enregistrées; ne jamais réintroduire un fallback entre entreprise et boutique.