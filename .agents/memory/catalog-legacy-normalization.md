---
name: Normalisation du catalogue historique
description: Les brouillons de catalogue peuvent contenir d’anciens identifiants de fonctionnalités et des secteurs incompatibles avec un module désactivé.
---

Les publications de catalogue doivent normaliser les identifiants historiques avant validation et retirer automatiquement les références de secteurs vers les modules désactivés.

**Why:** une ancienne configuration Commerce bloquait toute nouvelle publication, y compris une simple désactivation de module, et empêchait ensuite la synchronisation des installations dédiées.

**How to apply:** normaliser les packs et dépendances contre les fonctionnalités canoniques, supprimer les packs devenus vides, puis nettoyer les sélections de modules des secteurs avant de publier.