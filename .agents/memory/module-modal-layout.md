---
name: Fenêtre Immobilier
description: Règle d’affichage dédiée aux fenêtres Ajouter/Modifier du module Immobilier.
---

Les fenêtres Ajouter/Modifier du module Immobilier utilisent un overlay dédié qui couvre entièrement l’application. Le formulaire s’ouvre en haut, tandis que le menu et la page sous-jacente restent masqués. Le contenu du formulaire défile si nécessaire.

**Why:** L’overlay Immobilier ne partage pas la structure des autres modales : appliquer une règle générique ne modifiait donc pas son rendu réel.

**How to apply:** Modifier le conteneur `immobilier-modal-backdrop` et son panneau enfant, sans changer le comportement global des autres modules.