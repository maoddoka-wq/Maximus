---
name: Résolution des chemins PowerShell
description: Les valeurs par défaut du bloc param peuvent évaluer PSScriptRoot trop tôt dans certains contextes Windows.
---

Ne pas calculer un chemin relatif depuis `$PSScriptRoot` dans la valeur par défaut d’un paramètre PowerShell. Déclarer le paramètre vide, puis résoudre le dossier du script dans le corps du script avec `$MyInvocation.MyCommand.Path`.

**Why:** Sur certaines exécutions Windows, `$PSScriptRoot` est vide pendant l’évaluation du bloc `param`, ce qui fait échouer `Join-Path` avant l’exécution du script.

**How to apply:** Pour les scripts lancés depuis le dossier du projet, accepter `-WorkspaceDir` facultatif puis déduire la racine depuis le chemin réel du fichier uniquement après le bloc `param`.