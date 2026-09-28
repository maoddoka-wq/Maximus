---
name: Cycle de vie GPS chauffeur
description: Règle de concurrence pour le suivi GPS natif de MAXIMUS Chauffeur.
---

Le polling de statut GPS doit rester en lecture seule. Les vérifications qui peuvent mettre le chauffeur en pause ou arrêter le service ne doivent être lancées que lors d’une transition explicite ou d’une action utilisateur. Sérialiser les démarrages et arrêts natifs, et empêcher les reprises concurrentes depuis le contexte React.

**Why:** Android et ses constructeurs peuvent faire varier temporairement l’état du service pendant la reprise d’application. Une vérification périodique mutative peut alors entrer en concurrence avec `AppState` ou l’activation et interrompre le suivi. Sans journaux Android, cette concurrence est un risque identifié, pas une cause de crash démontrée.

**How to apply:** Lors d’une modification du suivi chauffeur, garder l’intervalle de rafraîchissement purement observateur; exécuter `verifyLocationActivity()` seulement dans des parcours contrôlés et vérifier le comportement sur appareil avant d’attribuer un crash natif à cette piste.