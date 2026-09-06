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

Les choix d’inscription doivent être matérialisés dès l’activation : unité racine, modules autorisés, fonctionnalités, rôles de packs et rôle de secours pour les modules sans pack.

**Why:** Conserver les choix uniquement dans la demande laisse les employés sans unité ni rôle compatible, même si l’entreprise voit correctement ses modules.

**How to apply:** Utiliser un provisioning idempotent partagé par l’approbation MAXIMUS et la création administrative ; il doit réutiliser l’unité racine et ne pas dupliquer les rôles automatiques.

Les modules autorisés doivent aussi être synchronisés dans `maximus_company_modules` côté Laravel ; sinon le bootstrap serveur renvoie `INACTIF` et masque les modules locaux après connexion.

**Why:** L’interface locale peut afficher brièvement les modules avant que le bootstrap serveur ne remplace les statuts par ceux de PostgreSQL.

**How to apply:** Écrire les accès serveur avant l’activation locale et resynchroniser les entreprises déjà actives lors d’une session MAXIMUS.

Les réponses d’accès modules doivent rester liées à l’entreprise demandée et ne doivent jamais être utilisées tant que leur contexte n’est pas prêt.

**Why:** Un statut chargé pour une entreprise précédente peut afficher ou masquer les modules de la mauvaise entreprise pendant une transition de session.

**How to apply:** Vérifier l’identifiant d’entreprise renvoyé par Laravel, bloquer l’interface pendant le chargement et afficher une erreur explicite en cas d’incohérence.