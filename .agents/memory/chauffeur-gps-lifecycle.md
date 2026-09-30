---
name: Sérialisation du GPS Chauffeur
description: Éviter les démarrages concurrents du service de localisation natif après un retour des réglages Android.
---

Les demandes de permission peuvent ouvrir les réglages Android puis ramener l’application au premier plan pendant qu’une activation GPS manuelle est encore en cours. Les mutations du service de localisation (activer, reprendre, arrêter) doivent passer par une file sérialisée commune, et les reprises AppState doivent être dédupliquées.

**Why:** Un démarrage concurrent du foreground service peut provoquer une erreur native qui ferme l’application et échappe aux `catch` JavaScript.

**How to apply:** Garder la sérialisation dans le service de localisation, pas uniquement dans un écran. Tester l’activation depuis MAXIMUS, le retour des réglages Android et les événements AppState rapprochés sur un appareil réel; les journaux Metro ne valident pas un crash natif.