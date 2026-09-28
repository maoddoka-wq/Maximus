---
name: Cycle de vie GPS chauffeur
description: Règle de concurrence pour le suivi GPS natif de MAXIMUS Chauffeur.
---

Le polling de statut GPS doit rester en lecture seule. Le suivi natif de fond transmet des positions horodatées à leur capture, et l’API rejette tout relevé plus ancien que le dernier accepté. Les vérifications qui peuvent mettre le chauffeur en pause ou arrêter le service ne doivent être lancées que lors d’une transition explicite ou d’une action utilisateur. Sérialiser les démarrages et arrêts natifs, et empêcher les reprises concurrentes depuis le contexte React.

**Why:** Android et ses constructeurs peuvent faire varier temporairement l’état du service pendant la reprise d’application. Une vérification périodique mutative peut alors entrer en concurrence avec `AppState` ou l’activation et interrompre le suivi; accepter des positions reçues en retard peut aussi écraser une coordonnée plus récente.

**How to apply:** Lors d’une modification du suivi chauffeur, garder l’intervalle de rafraîchissement purement observateur; sérialiser le démarrage/arrêt de la tâche native et conserver l’heure de capture jusqu’à l’API. Vérifier le comportement d’arrière-plan sur appareil avant de le considérer validé.