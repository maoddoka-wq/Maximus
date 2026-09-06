---
name: Parcours Organisation
description: Ordre de configuration de la hiérarchie, des rôles, des comptes et des managers.
---

L’administration d’une entreprise reste regroupée dans la page Organisation, avec un parcours interne : créer la hiérarchie des unités en choisissant d’abord les modules puis leurs packs, configurer les rôles et sous-autorisations, puis créer les comptes employés et désigner les managers.

**Why:** Une unité doit pouvoir composer librement son périmètre métier à partir du catalogue existant, sans confondre la sélection des capacités avec la création des rôles ou des comptes.

**How to apply:** Ne pas créer de rubriques latérales séparées pour les autorisations ou les comptes. Les onglets de la page Organisation portent ces étapes ; dans Structure & unités, masquer les packs jusqu’à la sélection du module, puis laisser les rôles préciser les menus et actions autorisés, notamment aux dix rubriques de Gestion de stock.

L’activation MAXIMUS d’une entreprise doit provisionner son compte `company_admin` dans PostgreSQL avant de passer le statut local à ACTIF ; les entreprises déjà actives sont resynchronisées lors d’une session MAXIMUS.

**Why:** Le formulaire d’inscription conserve la demande dans le navigateur, tandis que la connexion est vérifiée par Laravel. Changer uniquement le statut local rendait l’espace visuellement actif mais impossible à ouvrir.

**How to apply:** Toute validation d’entreprise doit appeler l’API protégée de provisioning et ne confirmer l’activation locale qu’après sa réussite. Garder une resynchronisation idempotente pour réparer les demandes activées avant cette règle.