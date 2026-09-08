---
name: Isolation des aperçus de modules
description: Règle de fonctionnement des tests de modules depuis l’administration MAXIMUS.
---

Les aperçus de modules lancés depuis l’administration doivent rester autonomes et en lecture seule : ils ne doivent pas choisir une entreprise réelle ni appeler les APIs métier de production.

**Why:** un environnement Render peut ne contenir aucune entreprise exploitable pour un simple aperçu, ce qui provoque des chargements bloqués ou des refus d’autorisation.

**How to apply:** ajouter un mode preview explicite aux écrans qui dépendent de données tenant et désactiver les écritures pendant le test du module ou du pack.