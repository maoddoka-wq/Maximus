---
name: Frontière de la fonctionnalité Transport
description: La fonctionnalité Transport contrôle séparément Taxi tout en restant rattachée à Livraisons.
---

La fonctionnalité `transport` est une autorisation d’entreprise distincte de `livraisons`, avec `livraisons` comme dépendance catalogue. Elle contrôle l’affichage administratif et public de Taxi, les routes chauffeur et toutes les mutations Taxi.

**Why:** une entreprise peut proposer les livraisons sans autoriser le transport, et les permissions administratives de livraison ne doivent pas donner implicitement accès aux profils ou courses Taxi.

**How to apply:** toute nouvelle route, vue ou capacité Taxi doit vérifier `transport`; le matching et les données restent en plus bornés par l’entreprise issue de la session. Après connexion, un employé avec un profil Taxi valide ouvre directement son dashboard chauffeur; les autres employés restent sur le dashboard entreprise. Dans l’administration, Transport est un onglet distinct de Livraisons, tandis que la vitrine publique peut conserver Taxi dans le parcours Livraison.