---
name: Aperçu Expo dans le navigateur
description: Comportement de l’aperçu web Replit pour l’application Expo Chauffeur.
---

L’aperçu web Replit a échoué dans `SecureStore.getItemAsync()` avec `ExpoSecureStore.default.getValueWithKeyAsync is not a function`, bien que l’application se lance ensuite normalement. MAXIMUS Chauffeur est d’abord une application Android : le fallback web conserve seulement un jeton transitoire en mémoire, jamais dans `localStorage`, et les tâches TaskManager / expo-location sont désactivées sur web.

**Why:** L’aperçu peut charger le bundle web sans fournir les méthodes natives attendues; le premier appel au stockage pouvait empêcher même l’écran de connexion de s’afficher.

**How to apply:** Garder SecureStore comme stockage persistant sur Android. Pour un aperçu navigateur, utiliser un stockage volatile et retourner un résultat explicite pour les fonctionnalités GPS indisponibles; ne pas interpréter un test web comme une validation du GPS Android.