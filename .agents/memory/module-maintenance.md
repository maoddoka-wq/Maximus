---
name: Maintenance individuelle des modules
description: Règle de fonctionnement pour suspendre temporairement un module sans interrompre les autres espaces ou capacités.
---

L’état `MAINTENANCE` est porté par l’accès d’un module pour une entreprise donnée, et non par toute la plateforme. Les utilisateurs de cette entreprise reçoivent une réponse d’indisponibilité explicite ; les administrateurs MAXIMUS conservent un accès technique pour diagnostiquer et valider.

**Why:** La maintenance doit pouvoir isoler une capacité métier sans couper les autres modules ni créer de contournement côté frontend.

**How to apply:** Conserver les statuts `ACTIF`, `BETA`, `MAINTENANCE` et `INACTIF` dans le catalogue d’accès entreprise, faire appliquer le blocage par middleware serveur et refléter le statut dans la navigation et l’administration.