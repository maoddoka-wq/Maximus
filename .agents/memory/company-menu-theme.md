---
name: Thème du menu entreprise
description: Règle de cohérence entre la couleur du menu latéral d’une entreprise et ses états actif et survol.
---

La couleur de fond du menu latéral et la couleur des éléments actif/survol doivent rester dans la même chaîne de thème : `sidebarColor` alimente la couleur d’état du menu.

**Why:** Utiliser `primaryColor` pour l’état actif alors que le menu est configuré avec `sidebarColor` crée un menu bleu ou d’une autre teinte qui ne correspond pas à l’identité visuelle de l’espace entreprise.

**How to apply:** Lors d’une évolution du thème entreprise, conserver une variable dédiée d’état du menu dérivée de `sidebarColor`, et faire utiliser cette même variable par le composant Sidebar, l’état actif, le survol et l’ombre associée.