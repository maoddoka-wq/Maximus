---
name: Source de vérité des autorisations modules
description: Règle de distinction entre demande d’inscription et activation effective d’un module pour une entreprise.
---

L’autorisation effective d’un module doit être reconstruite depuis les lignes d’accès persistées de l’entreprise. `requested_modules` décrit uniquement les modules demandés lors de l’inscription et peut être incomplet après une activation ou une désactivation faite par MAXIMUS. Le payload de synchronisation central doit appliquer la même règle, tandis que les changements d’accès doivent maintenir `requested_modules` cohérent pour les anciens consommateurs.

**Why:** Une entreprise peut recevoir un module après son inscription. Utiliser uniquement la demande initiale masque alors un module pourtant actif côté serveur.

**How to apply:** Pour charger un espace entreprise ou construire une configuration d’installation, utiliser les statuts d’accès persistés (`ACTIF`/`BETA`/`MAINTENANCE`) avec un repli sur la demande initiale lorsqu’aucune ligne d’accès n’existe encore ; ajouter ou retirer aussi l’identifiant de `requested_modules` lors d’une modification MAXIMUS.

Une sélection de fonctionnalités persistée avec `featureScope=explicit` est une liste d’autorisation, y compris lorsqu’elle est vide. Les écritures d’initialisation doivent créer une ligne absente sans réinitialiser une ligne existante.

**Why:** Une liste vide non distinguée d’une absence de restriction réactivait Location et pouvait effacer les droits d’une entreprise lors d’une synchronisation.

**How to apply:** Les contrôles serveur et le frontend doivent lire la ligne d’accès entreprise, préserver ses fonctionnalités lors d’un changement de statut et ne jamais utiliser une initialisation globale pour écraser cette configuration.

Les permissions détaillées d’une fonctionnalité priment sur le droit global du module : dès qu’une configuration détaillée existe, une fonctionnalité sans `voir` ne doit pas apparaître, même si le module possède `voir`.

**Why:** Un rôle chauffeur pouvait conserver une sélection de fonctionnalités complète tout en ne possédant des droits détaillés que sur quelques rubriques, ce qui affichait des onglets non autorisés.

**How to apply:** Filtrer les menus, onglets et routes Transport par la permission détaillée `voir` lorsque des permissions détaillées sont présentes ; n’utiliser le droit global qu’en l’absence de détail.

Pour un rôle issu d’un pack, les fonctionnalités du pack sont aussi une limite supérieure : une sélection de secteur plus large ne peut pas ajouter de fonctionnalité hors pack.

**Why:** Les rôles chauffeur pouvaient hériter d’une liste de secteur contenant toutes les rubriques Transport, alors que le pack chauffeur n’en incluait que quatre.

**How to apply:** Intersecter la sélection explicite de l’unité avec les `featureIds` du pack avant de calculer les fonctionnalités visibles.

Pour un employé, le plafond de fonctionnalités de l’entreprise doit être appliqué même lorsque le rôle est manuel ou ne porte pas de `packId`; l’espace ne doit jamais retomber sur toutes les rubriques du module.

**Why:** Un employé chauffeur pouvait recevoir un rôle global Transport et une sélection d’unité large, puis voir des fonctionnalités absentes du pack entreprise.

**How to apply:** Calculer le plafond depuis l’accès serveur, les packs entreprise ou la sélection persistée, puis l’intersecter avec la sélection du rôle avant de transmettre les identifiants à l’espace Transport.

Les droits détaillés issus des packs doivent être persistés avec l’accès module et dans la fiche entreprise, pas uniquement dans l’état local du navigateur.

**Why:** Après actualisation ou connexion d’un employé, un état local absent pouvait ramener les droits d’une fonctionnalité à `voir` et réactiver un contrôle global de création/modification.

**How to apply:** Lors de l’enregistrement d’un accès module, synchroniser `featureIds`, `packIds` et `featurePermissions` vers la ligne d’accès serveur et le registre entreprise ; une entrée détaillée vide reste un refus explicite.

L’éditeur de rôle doit exposer les trois actions aussi au niveau général du module ; la sauvegarde ne doit pas réduire ce niveau à `voir` avant l’application du plafond entreprise.

**Why:** Un rôle pouvait afficher `Créer` et `Modifier` sur des sous-fonctionnalités, mais le niveau module restait limité à `Voir`, ce qui bloquait les écrans qui contrôlent l’action sur le module.

**How to apply:** Afficher et enregistrer `voir`, `créer` et `modifier` pour le module, avec `Créer`/`Modifier` dépendant de `Voir`, puis plafonner ces actions selon les permissions détaillées autorisées par l’entreprise.