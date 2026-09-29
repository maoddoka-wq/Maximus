---
name: Limites des téléversements PHP
description: Plafonds du serveur PHP intégré pour les fichiers envoyés à Laravel.
---

Le serveur PHP intégré de l’environnement Replit utilise `upload_max_filesize=2M` et `post_max_size=8M`. Une limite de validation Laravel supérieure à ces directives est trompeuse : PHP peut écarter le fichier avant que Laravel ne le valide.

**Why:** Un article pourrait être enregistré sans sa photo si l’interface annonce une taille que le serveur ne reçoit pas.

**How to apply:** Vérifier les directives dans le runtime effectif, aligner les contrôles client et Laravel, et faire échouer explicitement une requête qui annonçait une image mais ne l’a pas reçue.