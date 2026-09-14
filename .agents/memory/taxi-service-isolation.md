---
name: Service Taxi isolé
description: Règles durables du parcours Taxi intégré à Livraison.
---

Le service Taxi est une fonctionnalité de Livraison, mais ses chauffeurs et demandes sont des entités dédiées et toujours filtrées par l’entreprise issue de la session serveur.

**Why:** un chauffeur peut être un employé actif sans disposer des permissions administratives de Livraison ; il doit accéder uniquement à son espace chauffeur et aux courses de son entreprise.

**How to apply:** créer les profils Taxi à partir d’employés existants, vérifier l’entreprise côté serveur sur chaque route, calculer le matching parmi les chauffeurs vérifiés et disponibles du même tenant, puis faire progresser la demande par transitions explicites.