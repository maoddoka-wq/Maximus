---
name: Performance réseau frontend
description: Règles de réactivité perçue et de synchronisation des écrans MAXIMUS.
---

Les mutations doivent rendre le contrôle à l’interface dès que l’API confirme l’écriture ; le rechargement de cohérence doit rester en arrière-plan. Les GET identiques en cours peuvent être partagés, mais les écritures ne doivent jamais être dédupliquées automatiquement.

**Why:** Sur un réseau lent, attendre une seconde lecture complète après chaque écriture donne l’impression que le bouton est bloqué et augmente les courses entre rafraîchissements.

**How to apply:** Conserver un état local visible pendant le rafraîchissement, afficher l’état occupé sur l’action concernée, appliquer un délai explicite aux requêtes réseau et ne jamais rejouer automatiquement une mutation financière ou idempotente sans clé dédiée.