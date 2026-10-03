---
name: Publication GitHub de secours
description: Procédure à suivre lorsque le push Git classique refuse l’authentification mais que l’intégration GitHub Replit est active.
---

Si l’authentification du remote GitHub refuse un `git push`, l’intégration GitHub Replit peut publier les fichiers modifiés sur `main` via l’API de contenu, en séquence, sans demander de credential dans le chat.

**Why:** Le remote peut accepter la lecture (`fetch`) tout en refusant l’authentification d’écriture du client Git. Un force-push contournerait le problème au prix d’une réécriture dangereuse de l’historique.

**How to apply:** Un envoi, même via l’API GitHub, exige une autorisation explicite. Si l’utilisateur veut seulement débloquer son propre push, ne rien envoyer. Après `git fetch origin main`, intégrer les commits distants par une fusion locale non destructive, en conservant les améliorations locales plus récentes ; ne pas remplacer la branche locale par la distante ni forcer le push.

**Why:** Les écritures faites via l’API GitHub créent des commits distincts des checkpoints locaux, même lorsque les fichiers sont identiques. Les deux historiques peuvent donc diverger sans changement de contenu à appliquer ; une fusion conserve leur ascendance et permet un push normal.

Pour modifier un fichier sous `.github/workflows/`, un token GitHub classique doit avoir les scopes `repo` et `workflow`. L’intégration OAuth Replit et un secret PAT sont des identifiants distincts; l’un peut manquer de droits même si l’autre est configuré.

**Why:** GitHub refuse explicitement les mises à jour de workflows sans le scope `workflow`. Une API capable de lire une branche peut aussi refuser les écritures Git Data. Les permissions du compte retournées par le dépôt, même `admin: true`, ne prouvent pas que le credential de l’intégration autorise ces écritures.

**How to apply:** Avant un push qui touche un workflow, vérifier uniquement l’en-tête `X-OAuth-Scopes` du credential réellement utilisé, sans afficher sa valeur. Utiliser un PAT correctement scoped via un askpass temporaire et `git -c credential.helper=`; pousser normalement, jamais avec `--force`.