---
name: Version des installations dédiées
description: Contrat de version entre MAXIMUS central sur Render, le bootstrap et les archives Windows/on-premise.
---

Une installation dédiée ne doit pas synchroniser avec une archive locale dont le commit diffère de celui réellement servi par MAXIMUS central. Le serveur central publie son identifiant de build ; un package local l’embarque et un clone Git le compare au bootstrap avant de créer son fichier de version. Les mises à jour suivantes passent par Git et conservent `.env`, `vendor`, `storage` et la base locale.

**Why:** un bootstrap et des données corrects ne suffisent pas si le dossier Windows contient une ancienne application ; la synchronisation peut alors exécuter un contrat de catalogue différent de celui du central.

**How to apply:** pour une première installation, cloner GitHub, vérifier le commit du clone contre le bootstrap et Render, puis laisser l’installateur créer `MAXIMUS_BUILD_VERSION`. Ensuite, utiliser l’outil de mise à jour Git contrôlé ; il attend que Render serve le même commit et ne modifie pas les données persistantes.