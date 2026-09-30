---
name: Gouvernance par unité
description: Règle d’accès pour les managers responsables d’un secteur ou d’une unité.
---

Une entreprise choisit librement son périmètre de modules, fonctionnalités et actions. Un manager de secteur doit être explicitement désigné par l’administrateur de l’entreprise ; il peut créer et modifier les rôles, permissions et employés de son unité et de ses unités descendantes, mais ne peut jamais dépasser le périmètre choisi par l’entreprise ni administrer les autres secteurs.

**Why:** L’entreprise doit pouvoir composer son espace selon son activité, tandis que les droits métier doivent être définis au plus près des équipes concernées sans permettre à un manager comptabilité de dépasser les choix de l’entreprise ou de contrôler les équipes stock, RH ou commerciales.

**How to apply:** Conserver la séparation entre le périmètre choisi par l’entreprise, le périmètre organisationnel du manager et les permissions métier des rôles ; un employé sans rôle valide ne reçoit aucun module métier, et toute permission de rôle est plafonnée par les choix de l’entreprise. Les écritures d’état et les comptes existants doivent refuser toute modification hors secteur, même si le client envoie une copie complète de l’espace.

Les exceptions accordées aux managers pour les collections `employees` et `roles` ne s’étendent pas à `orgNodes`. Une opération de gestion du personnel qui change `managerEmployeeId` dans un nœud reste soumise aux droits RH du module, de la fonctionnalité et de l’unité.

**Why:** Une action de gestion des employés peut aussi modifier la structure organisationnelle dans le même instantané d’état; le droit d’écrire la fiche employé ne garantit donc pas celui d’écrire le nœud.

**How to apply:** Lorsqu’un refus générique survient pendant une action sur un employé, vérifier toutes les collections modifiées par l’instantané, notamment `orgNodes`, avant d’attribuer le refus à `employees` ou `roles`.