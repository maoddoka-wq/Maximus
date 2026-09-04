---
name: Thème du menu entreprise
description: Règle de cohérence entre la couleur du menu latéral d’une entreprise et ses états actif et survol.
---

La couleur de fond du menu latéral reste indépendante, tandis que les éléments actif/survol du menu doivent reprendre la couleur principale de l’entreprise : `primaryColor` alimente la couleur d’état du menu.

**Why:** Utiliser `sidebarColor` pour l’état actif transforme la sélection en bleu nuit lorsque le fond du menu est bleu, alors que l’identité de l’espace est portée par la couleur principale.

**How to apply:** Lors d’une évolution du thème entreprise, conserver une variable dédiée d’état du menu dérivée de `primaryColor`, et faire utiliser cette même variable par le composant Sidebar, l’état actif, le survol et l’ombre associée. Garder `sidebarColor` pour le fond et les accents neutres du menu.