---
name: Fenêtres des modules
description: Règle d’affichage commune des fenêtres de saisie et de leurs tableaux.
---

Les fenêtres de saisie des modules doivent s’ouvrir en haut de la zone visible plutôt qu’être centrées ou ancrées en bas. Leur en-tête et leur bouton de fermeture restent visibles pendant que le contenu défile lorsque la fenêtre dépasse la hauteur disponible.

**Why:** Les formulaires longs doivent laisser le contexte et la fermeture accessibles immédiatement, surtout sur les petits écrans, sans cacher le haut de la fenêtre après l’ouverture.

**How to apply:** Utiliser les classes communes de fenêtre (`modal-backdrop`, `modal-panel`, `modal-header`) et ne réintroduire un centrage ou un ancrage bas que pour un cas explicitement différent.