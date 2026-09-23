---
name: Fenêtres Immobilier et e-commerce
description: Règle d’affichage dédiée aux fenêtres de saisie de ces deux modules.
---

Les fenêtres de saisie des modules Immobilier et e-commerce utilisent un overlay dédié rendu au niveau du document. Le formulaire s’ouvre en haut, tandis que le menu et la page sous-jacente restent masqués. Le contenu du formulaire défile si nécessaire.

**Why:** Ces modules sont rendus dans la zone de contenu défilante ; un overlay local pouvait rester sous le menu ou dans le mauvais contexte d’empilement, contrairement à Stock.

**How to apply:** Porter les overlays dédiés au document et conserver leur z-index, leur position haute et leur défilement interne sans changer le comportement global des autres modules.