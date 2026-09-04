---
name: Validation des vues authentifiées
description: Contrôle visuel des écrans MAXIMUS nécessitant une session locale.
---

Les captures de preview peuvent ouvrir une nouvelle session et revenir à l’écran de connexion même lorsqu’une session a été préparée ailleurs. Pour valider une route connectée, utiliser le navigateur CDP déjà ouvert, définir la session locale dans l’origine de preview, naviguer vers la route, puis capturer la vue depuis cette même cible.

**Why:** les routes MAXIMUS et KORA dépendent d’un état de session côté navigateur, qui n’est pas toujours partagé par l’outil de capture de preview.

**How to apply:** valider séparément l’écran public de connexion avec la capture standard, puis les routes authentifiées avec la même cible CDP et des métriques desktop/mobile.