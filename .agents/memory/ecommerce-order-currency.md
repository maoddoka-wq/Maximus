---
name: Devise des commandes E-commerce
description: Règle de conservation et de présentation de la devise des ventes en ligne.
---

Chaque nouvelle commande en ligne doit enregistrer la devise de la boutique au moment du checkout. Les commandes historiques sans devise fiable doivent rester distinctes sous une valeur « inconnue » dans les rapports; ne pas leur attribuer la devise actuelle de la boutique.

**Why:** le schéma historique ne conservait pas la devise au moment de l’achat, et une modification ultérieure de la boutique pourrait faussement reclasser les anciennes ventes et mélanger des montants.

**How to apply:** les rapports, exports et calculs financiers utilisent l’instantané de la commande. Si la devise est absente, la traiter séparément jusqu’à ce qu’une source historique fiable permette de l’établir.