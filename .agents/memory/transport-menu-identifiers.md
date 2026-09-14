---
name: Identifiants du menu Transport
description: Correspondance entre les libellés visibles du module Transport et les identifiants persistés des fonctionnalités.
---

Le menu Transport doit toujours construire ses entrées depuis les options de fonctionnalités canoniques (`overview`, `trips`, `drivers`, `vehicles`), jamais depuis la conversion automatique des libellés français.

**Why:** Les libellés `Courses`, `Chauffeurs` et `Véhicules` produisent des slugs différents (`courses`, `chauffeurs`, `vehicules`) et peuvent faire disparaître un module pourtant activé.

**How to apply:** Utiliser `getModuleFeatureOptions` pour filtrer les droits et générer les liens `/entreprise/transport?tab=<identifiant>`, puis convertir le paramètre d’URL vers l’onglet visuel.