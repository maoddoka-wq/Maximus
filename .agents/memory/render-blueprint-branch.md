---
name: Branche des Blueprints Render
description: Comportement non évident du champ branch dans l’API Render publique pour un Blueprint existant.
---

Pour un Blueprint Render existant, ne pas considérer un PATCH API comme preuve de changement de branche. Le champ `branch` a renvoyé HTTP 200 sans modifier la branche réellement configurée. Changer la branche depuis le Dashboard Render, puis vérifier le champ `branch` du Blueprint et du service.

**Why:** Le schéma public de l’API ne documente pas la modification de branche; une réponse de succès peut donc être trompeuse pour ce champ.

**How to apply:** Lors d’un alignement vers une branche de release, utiliser l’interface Render pour la modification et vérifier par lecture seule avant de lancer ou valider une synchronisation.