---
name: Version des installations dédiées
description: Contrat de version entre MAXIMUS central sur Render, le bootstrap et les archives Windows/on-premise.
---

Une installation dédiée ne doit pas synchroniser avec une archive locale dont le commit diffère de celui réellement servi par MAXIMUS central. Le serveur central publie son identifiant de build et le package local l’embarque ; l’installateur compare les deux avant la base de données.

**Why:** un bootstrap et des données corrects ne suffisent pas si le dossier Windows contient une ancienne application ; la synchronisation peut alors exécuter un contrat de catalogue différent de celui du central.

**How to apply:** déployer le central avant de créer l’archive, vérifier son identifiant via `/api/healthz`, créer l’archive depuis un dépôt Git propre au même commit, puis refuser les manifests anciens ou les packages sans build version.