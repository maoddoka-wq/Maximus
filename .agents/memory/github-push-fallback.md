---
name: Publication GitHub de secours
description: Procédure à suivre lorsque le push Git classique refuse l’authentification mais que l’intégration GitHub Replit est active.
---

Si l’authentification du remote GitHub refuse un `git push`, l’intégration GitHub Replit peut publier les fichiers modifiés sur `main` via l’API de contenu, en séquence, sans demander de credential dans le chat.

**Why:** Le remote peut accepter la lecture (`fetch`) tout en refusant l’authentification d’écriture du client Git. Un force-push contournerait le problème au prix d’une réécriture dangereuse de l’historique.

**How to apply:** Vérifier d’abord que le remote n’a pas avancé, publier les fichiers avec les SHA courants, puis faire `git fetch origin main`. Si l’historique local diverge, conserver un point de secours local avant d’aligner `main` sur `origin/main`.