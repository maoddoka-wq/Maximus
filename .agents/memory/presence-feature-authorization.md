---
name: Autorisation par fonctionnalité Présences
description: Règle de séparation des permissions détaillées du module Présences entre ses fonctionnalités.
---

Une demande d’action Présences qui cible une fonctionnalité précise doit vérifier uniquement la clé de cette fonctionnalité. Elle ne doit pas être autorisée parce qu’une autre fonctionnalité possède la même action.

**Why:** Un rôle autorisé à créer le pointage pouvait sinon créer ou modifier un horaire lorsque le contrôle serveur parcourait toutes les clés `presence.*` comme solution de repli.

**How to apply:** Conserver la résolution par fonctionnalité dans l’interface et l’API (`pointage`, `absences`, `horaires`, `congés`). Réserver le fallback global aux rôles historiques sans aucune permission détaillée.