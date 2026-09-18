---
name: Version des installations dédiées
description: Contrat de version entre MAXIMUS central sur Render, le bootstrap et les archives Windows/on-premise.
---

Le premier enrôlement exige que le package local, le bootstrap et MAXIMUS central correspondent au même commit. Après cet enrôlement strict, la synchronisation de configuration peut accepter un écart de commit si le protocole reste compatible, avec avertissement observable et validation stricte de l’identité entreprise/installation. Cela n’autorise pas une mise à jour automatique du logiciel.

**Why:** un bootstrap et des données corrects ne suffisent pas si le dossier Windows contient une ancienne application ; la synchronisation peut alors exécuter un contrat de catalogue différent de celui du central.

**Why:** Exiger ensuite le même commit à chaque échange empêcherait d’actualiser les autorisations d’une installation autonome dès que le central est mis à jour. La compatibilité du protocole, et non l’égalité permanente des commits, délimite ces échanges après enrôlement.

**How to apply:** pour une première installation, cloner GitHub, vérifier le commit du clone contre le bootstrap et Render, puis laisser l’installateur créer `MAXIMUS_BUILD_VERSION`. Ensuite, utiliser l’outil de mise à jour Git contrôlé ; il attend que Render serve le même commit et ne modifie pas les données persistantes.