---
name: Accès aux APK Chauffeur
description: Politique de publication et de téléchargement des versions Android Chauffeur.
---

Les releases APK Chauffeur restent en brouillon dans le dépôt GitHub public. Seuls les comptes MAXIMUS autorisés au Transport obtiennent l’APK via l’API serveur authentifiée; l’application web et le QR code ne doivent jamais pointer directement vers l’asset GitHub.

**Why:** L’utilisateur a choisi un téléchargement restreint après avoir constaté que les assets d’un dépôt public sont accessibles sans session MAXIMUS. Le jeton de lecture actuellement configuré a renvoyé 403 sur la release brouillon.

**How to apply:** Configurer le workflow Android pour créer des releases brouillon; avant distribution, vérifier que le jeton de lecture Render a la permission `Contents: read` sur les releases privées. Le contrôleur PHP diffuse l’APK uniquement après contrôle de session et de permission; ne pas remplacer le jeton de lecture par un jeton d’écriture plus large.

Pour un événement `push` sur un tag, GitHub Actions exécute la définition du workflow présente sur la branche par défaut. Le réglage `draft: true` doit donc être vérifié sur cette branche, pas seulement sur la branche qui porte le tag.

**Why:** Une release Chauffeur s’est retrouvée publiée parce que le workflow de la branche par défaut ne déclarait pas le brouillon, même si la branche de travail le faisait.

**How to apply:** Avant tout nouveau tag APK, contrôler le workflow de la branche par défaut et vérifier après le run que la release est en brouillon, qu’une requête anonyme sur sa page renvoie 404 et qu’aucun asset n’est public.