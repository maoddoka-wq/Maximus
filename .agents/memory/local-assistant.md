---
name: Assistant local contrôlé
description: Principes de sécurité et d’évolution pour le copilote IA intégré à MAXIMUS.
---

Le premier assistant MAXIMUS est un copilote local déterministe : il lit uniquement un contexte déjà filtré par entreprise, session, unité et modules autorisés, explique ses sources et ne déclenche aucune action métier.

**Why:** La fiabilité et l’isolation des données doivent être établies avant d’ajouter un modèle local capable d’interpréter des demandes plus libres.

**How to apply:** Toute nouvelle capacité doit recevoir un contexte borné, produire une réponse observable avec ses sources, et transformer les actions sensibles en propositions soumises à confirmation explicite.