---
name: Publication GitHub de secours
description: Procédure à suivre lorsque le push Git classique refuse l’authentification mais que l’intégration GitHub Replit est active.
---

Si l’authentification du remote GitHub refuse un `git push`, l’intégration GitHub Replit peut publier les fichiers modifiés sur `main` via l’API de contenu, en séquence, sans demander de credential dans le chat.

**Why:** Le remote peut accepter la lecture (`fetch`) tout en refusant l’authentification d’écriture du client Git. Un force-push contournerait le problème au prix d’une réécriture dangereuse de l’historique.

**How to apply:** Un envoi, même via l’API GitHub, exige une autorisation explicite. Si l’utilisateur veut seulement débloquer son propre push, ne rien envoyer. Après `git fetch origin main`, intégrer les commits distants par une fusion locale non destructive, en conservant les améliorations locales plus récentes ; ne pas remplacer la branche locale par la distante ni forcer le push.

**Why:** Les écritures faites via l’API GitHub créent des commits distincts des checkpoints locaux, même lorsque les fichiers sont identiques. Les deux historiques peuvent donc diverger sans changement de contenu à appliquer ; une fusion conserve leur ascendance et permet un push normal.

Pour modifier un fichier sous `.github/workflows/`, un token GitHub classique doit avoir les scopes `repo` et `workflow`. L’intégration OAuth Replit et un secret PAT sont des identifiants distincts; l’un peut manquer de droits même si l’autre est configuré.

**Why:** GitHub refuse explicitement les mises à jour de workflows sans le scope `workflow`. Une API capable de lire une branche peut aussi refuser `CreateCommitOnBranch`.

**How to apply:** Avant un push qui touche un workflow, vérifier uniquement l’en-tête `X-OAuth-Scopes` du credential réellement utilisé, sans afficher sa valeur. Utiliser un PAT correctement scoped via un askpass temporaire et `git -c credential.helper=`; pousser normalement, jamais avec `--force`.

Si le CLI `gh` renvoie 401 alors que `git push` fonctionne, traiter leurs credentials comme deux chemins distincts. Pour un workflow déclenché par tag, pousser le tag annoté via le remote Git qui fonctionne, en le ciblant explicitement sur le `origin/main` vérifié ; comparer le hash `^{}` du tag annoté au commit ciblé, pas le hash de l’objet tag.

**Why:** Le credential du remote Git peut être valide alors que celui conservé par `gh` est périmé ; un tag annoté a son propre hash, distinct du commit qu’il référence.

**How to apply:** Vérifier que la version est unique, pousser uniquement la référence du tag et contrôler ensuite l’exécution Actions. Ne pas embarquer les commits locaux sans rapport.