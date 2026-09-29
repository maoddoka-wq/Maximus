---
name: Montage du scanner caméra dans un portail
description: Cycle de vie des éléments vidéo de scan rendus dans un Radix Dialog ou Portal.
---

Le démarrage du scanner doit dépendre de l’élément vidéo réellement monté, pas seulement de l’état d’ouverture du dialogue. Radix peut différer l’insertion du portail; un effet qui lit seulement `ref.current` puis retourne silencieusement ne sera pas réexécuté quand l’élément arrive.

**Why:** Le passage du scanner Présences en dialogue plein écran a déplacé la vidéo dans un Portal conditionnel. L’effet pouvait s’exécuter avant le montage vidéo, ignorer le délai de démarrage et laisser un flux caméra actif sans élément vidéo.

**How to apply:** Pour un scanner dans un Dialog ou Portal, synchroniser le démarrage sur l’élément callback-ref, garder un délai couvrant l’initialisation et arrêter les pistes du `MediaStream` lorsque le dialogue se ferme ou que l’effet se nettoie.