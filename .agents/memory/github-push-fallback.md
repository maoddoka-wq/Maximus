---
name: Publication GitHub de secours
description: Procédure à suivre lorsque le push Git classique refuse l’authentification mais que l’intégration GitHub Replit est active.
---

Quand un push Git est refusé, l’intégration GitHub n’est pas un remplacement complet de Git. Vérifier qu’elle peut écrire tous les chemins et créer le type de commit requis avant de publier une branche de pull request. Un droit `repo` ne garantit pas que chaque endpoint GraphQL ou chaque chemin `.github` soit accessible. Ne pas contourner un blocage Cloudflare par encodage d’URL.

**Why:** Une connexion OAuth a pu créer une référence et écrire certains fichiers, mais les écritures nécessaires dans `.github` ont été bloquées par Cloudflare; les API Git tree et GraphQL ont aussi refusé la création du commit complet. Une approche partielle peut laisser une branche distante sans les correctifs attendus.

**How to apply:** Avec l’autorisation explicite, publier sur une branche dédiée, jamais directement sur `main`. Si un chemin requis échoue, ne pas ouvrir une PR incomplète; garder le commit complet local, supprimer uniquement la branche créée par cette tentative après avoir vérifié qu’elle n’a pas changé, puis demander un mode de publication fonctionnel plutôt que de contourner le blocage. Sérialiser les écritures Contents API pour éviter les limites de débit. Après `git fetch`, conserver l’historique local et distant sans force-push.