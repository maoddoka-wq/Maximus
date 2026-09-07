---
name: Slugs publics Commerce
description: Règle de génération et de portée des slugs produits et catégories.
---

Les slugs publics des produits et catégories sont facultatifs dans les formulaires, générés depuis le nom côté serveur et suffixés automatiquement en cas de collision dans la même entreprise. Deux entreprises peuvent partager le même slug.

**Why:** Une unicité globale bloquait l’enregistrement de produits légitimes entre tenants et obligeait les gestionnaires à saisir manuellement des identifiants techniques.

**How to apply:** Résoudre l’entreprise depuis la session, conserver les contraintes d’unicité composées par entreprise, et ne jamais réintroduire une contrainte globale sur les slugs de catalogue.