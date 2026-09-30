---
name: Gouvernance par unité
description: Règle d’accès pour les managers responsables d’un secteur ou d’une unité.
---

Une entreprise choisit librement son périmètre de modules, fonctionnalités et actions. Un manager de secteur doit être explicitement désigné par l’administrateur de l’entreprise ; il peut créer et modifier les rôles, permissions et employés de son unité et de ses unités descendantes, mais ne peut jamais dépasser le périmètre choisi par l’entreprise ni administrer les autres secteurs.

**Why:** L’entreprise doit pouvoir composer son espace selon son activité, tandis que les droits métier doivent être définis au plus près des équipes concernées sans permettre à un manager comptabilité de dépasser les choix de l’entreprise ou de contrôler les équipes stock, RH ou commerciales.

**How to apply:** Conserver la séparation entre le périmètre choisi par l’entreprise, le périmètre organisationnel du manager et les permissions métier des rôles ; un employé sans rôle valide ne reçoit aucun module métier, et toute permission de rôle est plafonnée par les choix de l’entreprise. Les écritures d’état et les comptes existants doivent refuser toute modification hors secteur, même si le client envoie une copie complète de l’espace.

Les exceptions accordées aux managers pour les collections `employees` et `roles` ne s’étendent pas à `orgNodes`. Seul l’effacement strict d’un `managerEmployeeId` déjà présent sur un nœud existant de leur périmètre est permis sans droit RH, pour nettoyer une affectation lors d’une modification ou suppression d’employé. Toute nouvelle attribution, réattribution ou autre modification du nœud reste soumise aux droits RH.

**Why:** Une action de gestion des employés peut aussi nettoyer un lien de manager devenu obsolète dans le même instantané; cette opération ne doit pas conférer le pouvoir d’administrer la structure organisationnelle.

**How to apply:** Lorsqu’un refus survient pendant une action sur un employé, vérifier toutes les collections modifiées par l’instantané. Toute exception `orgNodes` doit être limitée à ce retrait en place, avec la validation habituelle de tenant et de périmètre; l’attribution ou la réaffectation de manager reste protégée par l’autorisation RH.