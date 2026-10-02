---
name: Accès aux APK Chauffeur
description: Politique de publication et de téléchargement des versions Android Chauffeur.
---

Les releases APK Chauffeur restent en brouillon dans le dépôt GitHub public. Seuls les comptes MAXIMUS autorisés au Transport obtiennent l’APK via l’API serveur authentifiée; l’application web et le QR code ne doivent jamais pointer directement vers l’asset GitHub.

**Why:** L’utilisateur a choisi un téléchargement restreint après avoir constaté que les assets d’un dépôt public sont accessibles sans session MAXIMUS.

**How to apply:** Configurer le workflow Android pour créer des releases brouillon et laisser le contrôleur PHP lire les drafts avec son jeton serveur puis diffuser l’APK uniquement après contrôle de session et de permission.