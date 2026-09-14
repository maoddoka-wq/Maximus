---
name: Source de vérité des autorisations modules
description: Règle de distinction entre demande d’inscription et activation effective d’un module pour une entreprise.
---

L’autorisation effective d’un module doit être reconstruite depuis les lignes d’accès persistées de l’entreprise. `requested_modules` décrit uniquement les modules demandés lors de l’inscription et peut être incomplet après une activation ou une désactivation faite par MAXIMUS.

**Why:** Une entreprise peut recevoir un module après son inscription. Utiliser uniquement la demande initiale masque alors un module pourtant actif côté serveur.

**How to apply:** Pour charger un espace entreprise, utiliser les statuts d’accès persistés (`ACTIF`/`BETA`) avec un repli sur la demande initiale uniquement lorsqu’aucune ligne d’accès n’existe encore.

Une sélection de fonctionnalités persistée avec `featureScope=explicit` est une liste d’autorisation, y compris lorsqu’elle est vide. Les écritures d’initialisation doivent créer une ligne absente sans réinitialiser une ligne existante.

**Why:** Une liste vide non distinguée d’une absence de restriction réactivait Location et pouvait effacer les droits d’une entreprise lors d’une synchronisation.

**How to apply:** Les contrôles serveur et le frontend doivent lire la ligne d’accès entreprise, préserver ses fonctionnalités lors d’un changement de statut et ne jamais utiliser une initialisation globale pour écraser cette configuration.

Les permissions détaillées d’une fonctionnalité priment sur le droit global du module : dès qu’une configuration détaillée existe, une fonctionnalité sans `voir` ne doit pas apparaître, même si le module possède `voir`.

**Why:** Un rôle chauffeur pouvait conserver une sélection de fonctionnalités complète tout en ne possédant des droits détaillés que sur quelques rubriques, ce qui affichait des onglets non autorisés.

**How to apply:** Filtrer les menus, onglets et routes Transport par la permission détaillée `voir` lorsque des permissions détaillées sont présentes ; n’utiliser le droit global qu’en l’absence de détail.