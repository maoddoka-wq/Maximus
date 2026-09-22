---
name: Identifiants du menu Transport
description: Correspondance entre les libellés visibles du module Transport et les identifiants persistés des fonctionnalités.
---

Le menu et l’état interne des onglets Transport doivent utiliser les identifiants canoniques (`overview`, `trips`, `drivers`, `vehicles`), jamais les slugs issus des libellés français. Les anciens slugs ne sont acceptés qu’en lecture.

**Why:** Les libellés `Courses`, `Chauffeurs` et `Véhicules` produisent des slugs différents (`courses`, `chauffeurs`, `vehicules`) ; mélanger ces clés avec celles du menu peut afficher une vue Transport différente de celle demandée.

**How to apply:** Utiliser `getModuleFeatureOptions` pour filtrer les droits et générer les liens `/entreprise/transport?tab=<identifiant>`. Résoudre les alias historiques vers le même identifiant canonique avant de rendre ou changer l’onglet.