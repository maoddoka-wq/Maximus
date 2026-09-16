---
name: Autorisation par fonctionnalité Présences
description: Règle de séparation des permissions détaillées du module Présences entre ses fonctionnalités.
---

Une demande d’action Présences qui cible une fonctionnalité précise doit vérifier uniquement la clé de cette fonctionnalité. Elle ne doit pas être autorisée parce qu’une autre fonctionnalité possède la même action. Le frontend doit appliquer la même règle à l’affichage et au déclenchement des actions de validation, suppression et export, pas seulement à la création.

**Why:** Un rôle autorisé à créer le pointage pouvait sinon créer ou modifier un horaire lorsque le contrôle serveur parcourait toutes les clés `presence.*` comme solution de repli. Un contrôle frontend global pouvait aussi afficher une validation ou une suppression autorisée par une autre rubrique, puis provoquer un 403 serveur.

**How to apply:** Conserver la résolution par fonctionnalité dans l’interface et l’API (`pointage`, `absences`, `horaires`, `congés`). Réserver le fallback global aux rôles historiques sans aucune permission détaillée, dériver chaque bouton d’action de la permission de sa fonctionnalité et filtrer le bootstrap serveur avec la même permission de lecture.

Pour un compte `employee`, toutes les données Présences doivent rester liées à son propre `employeeId`. L’interface doit lui transmettre uniquement son dossier ; l’API doit refuser les créations sans employé ou ciblant un autre employé.

**Why:** Le formulaire Congés recevait encore la liste générale des employés alors que l’API devait déjà limiter les écritures. Les fonctionnalités sélectionnées pouvaient aussi rester visibles lorsqu’un rôle n’avait plus la permission de lecture détaillée.

La validation d’une demande d’absence ou de congé est une opération de supervision : un compte employé ne peut pas changer le statut d’une demande, même si une permission de modification lui a été ajoutée par erreur.

**Why:** La propriété du dossier limite le compte à ses propres données, mais ne suffit pas à empêcher l’auto-approbation d’une demande.

**How to apply:** Réserver l’action `validate` à l’administrateur d’entreprise ou au manager de secteur dans l’interface, et refuser côté API toute transition de validation provenant d’un acteur de rôle `employee`.