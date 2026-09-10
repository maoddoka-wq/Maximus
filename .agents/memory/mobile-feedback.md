---
name: Notifications mobiles
description: Positionnement des notifications d’action sur les petits écrans et les PWA.
---

Les notifications de succès et d’échec doivent être ancrées explicitement en bas de la fenêtre sur mobile, avec une marge `safe-area-inset-bottom`, plutôt que de dépendre d’un positionnement statique en haut.

**Why:** Le viewport Radix initial pouvait rester invisible ou être recouvert dans la version mobile alors que les handlers d’action déclenchaient bien les toasts.

**How to apply:** Conserver un conteneur toast pleine largeur sur mobile, au-dessus des autres couches UI, puis revenir à l’ancrage bas-droite sur les écrans plus larges.