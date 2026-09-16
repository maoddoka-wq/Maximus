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

La configuration d’un rôle Présences doit être exclusivement portée par les clés détaillées `presence.<fonctionnalité>` et les actions Voir / Créer / Modifier de cette fonctionnalité. Les droits racine `presences` et les anciennes clés opérationnelles globales ne doivent pas rouvrir toutes les fonctionnalités.

**Why:** Deux modes simultanés dans l’éditeur de rôles permettaient qu’un droit général ou une ancienne permission globale réapparaisse comme accès à des fonctionnalités non choisies.

**How to apply:** Ne pas afficher d’accès général séparé pour Présences, supprimer le fallback racine dans la sélection des fonctionnalités et exiger une permission détaillée de lecture pour afficher un onglet.

Le parcours Employé Présences est limité à la consultation des horaires, au pointage personnel et à la création de demandes d’absence ou de congé. La création, modification et suppression des horaires, les paramètres et les décisions de validation restent réservés à l’administration ou au manager.

**Why:** L’interface gestionnaire était réutilisée telle quelle pour l’employé et l’API autorisait encore la création d’un horaire si une permission de rôle trop large était présente.

**How to apply:** Appliquer la restriction dans les deux couches : masquer les actions côté écran selon `selfOnly`, puis refuser côté serveur les écritures d’horaires et les actions de supervision d’un acteur `employee`.

Les rôles générés depuis un pack deviennent des rôles personnalisés dès qu’ils sont enregistrés depuis l’éditeur. Leur sélection effective doit alors venir uniquement des permissions détaillées enregistrées, jamais du `packId` conservé en arrière-plan.

**Why:** Conserver la référence du pack faisait réapparaître toutes les fonctionnalités du pack après une modification manuelle, même lorsque l’utilisateur en avait désélectionné certaines.

**How to apply:** Retirer les droits racine de module à la sauvegarde d’un rôle et détacher le pack lors d’un enregistrement depuis l’éditeur ; calculer Voir / Créer / Modifier par fonctionnalité.

Les identifiants d’onglet Présences (`schedules`, `leave`, etc.) ne sont pas les identifiants de permission (`horaires`, `congés`, etc.) ; l’éditeur de rôles doit convertir les libellés en `featureSlug` avant de construire `presence.<feature>`.

**Why:** Utiliser l’identifiant d’onglet faisait filtrer les droits comme non autorisés lors de la sauvegarde, puis toutes les sélections revenaient désactivées à la réouverture.

**How to apply:** Garder les identifiants de navigation pour le routage et les slugs de libellés pour les clés de permissions persistées.