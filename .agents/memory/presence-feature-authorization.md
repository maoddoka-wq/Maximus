---
name: Autorisation par fonctionnalité Présences
description: Règle de séparation des permissions détaillées du module Présences entre ses fonctionnalités.
---

Une demande d’action Présences qui cible une fonctionnalité précise doit vérifier uniquement la clé de cette fonctionnalité. Elle ne doit pas être autorisée parce qu’une autre fonctionnalité possède la même action. Le frontend doit appliquer la même règle à l’affichage et au déclenchement des actions de validation, suppression et export, pas seulement à la création.

**Why:** Un rôle autorisé à créer le pointage pouvait sinon créer ou modifier un horaire lorsque le contrôle serveur parcourait toutes les clés `presence.*` comme solution de repli. Un contrôle frontend global pouvait aussi afficher une validation ou une suppression autorisée par une autre rubrique, puis provoquer un 403 serveur.

**How to apply:** Conserver la résolution par fonctionnalité dans l’interface et l’API (`pointage`, `absences`, `horaires`, `congés`). Réserver le fallback global aux rôles historiques sans aucune permission détaillée, et dériver chaque bouton d’action de la permission de sa fonctionnalité.