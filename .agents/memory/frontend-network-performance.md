---
name: Performance réseau frontend
description: Règles de réactivité perçue et de synchronisation des écrans MAXIMUS.
---

Les écrans prioritaires ne doivent pas attendre les données secondaires : afficher le catalogue ou les données cœur dès leur réponse, restaurer la session et le portefeuille en parallèle, et charger l’historique lourd seulement quand l’onglet le demande. Les mutations doivent rendre le contrôle à l’interface dès que l’API confirme l’écriture ; le rechargement de cohérence doit rester en arrière-plan. Les GET identiques en cours peuvent être partagés, mais les écritures ne doivent jamais être dédupliquées automatiquement.

**Why:** Sur un réseau lent, les requêtes indépendantes en série et les historiques chargés au premier écran retardent inutilement le premier affichage et donnent l’impression que l’application est bloquée.

**How to apply:** Utiliser `Promise.all` pour les bootstrap indépendants, rendre le premier écran avec les données cœur, découper les bootstrap lourds par section avec fusion locale, conserver un état local visible pendant le rafraîchissement, afficher l’état occupé sur l’action concernée, réessayer une fois les erreurs réseau transitoires, ne jamais afficher un espace vide comme s’il était valide, appliquer un délai explicite aux requêtes réseau et ne jamais rejouer automatiquement une mutation financière ou idempotente sans clé dédiée. Une mise en cache courte peut partager les GET publics côté client, mais les zones, stocks et permissions doivent rester fraîches après une mutation.