---
name: Stockage des téléversements en production
description: Les fichiers téléversés sur le disque local de Render peuvent disparaître après redémarrage ou redéploiement.
---

Les fichiers utilisateurs destinés à rester visibles publiquement doivent être conservés dans un stockage durable (base PostgreSQL ou stockage objet), pas uniquement dans `storage/app/public`. Les fichiers numériques privés MAXIMUS utilisent le disque Render monté sur `/var/data`.

**Why:** Le disque Render protège les fichiers numériques contre les redéploiements, mais il reste attaché à une seule instance et impose un court arrêt pendant le remplacement du service.

**How to apply:** Garder les fichiers privés sous le chemin monté et utiliser PostgreSQL ou un stockage objet pour les ressources publiques et les architectures multi-instance.

Les logos d’entreprise et de boutique sont traités comme deux ressources indépendantes dans PostgreSQL : les octets et le type MIME sont conservés en base, tandis que chaque URL publique reste stable. Une boutique ne doit jamais utiliser automatiquement le logo de son entreprise.

**Why:** Le profil entreprise et la vitrine peuvent avoir des identités visuelles différentes, et les fichiers doivent rester disponibles après redémarrage, changement d’instance ou changement de machine.

**How to apply:** Pour chaque logo, servir d’abord la copie en base et ne garder le disque local que pour lire les anciennes images déjà enregistrées; ne jamais réintroduire un fallback entre entreprise et boutique.