---
name: Catalogue de fonctionnalités LABO
description: Règles de catalogue partagé, association aux modules et isolation des enregistrements LABO.
---

Le montage LABO ne crée pas de fiches de saisie et ne doit pas être un simple lien vers la source. Une fonctionnalité native de A reste fonctionnelle dans A ; montée dans B, elle s’exécute dans le contexte de B, avec les règles et permissions de B et des données distinctes de celles de A. Les données de A ne sont ni copiées ni exposées dans B.

Les fiches LABO historiques restent lisibles et leurs données ne sont pas supprimées, mais le parcours de composition ne doit pas en créer de nouvelles. Une fonctionnalité montée requiert un adaptateur vers le vrai écran et les opérations métier de la fonction source, tout en utilisant la portée du module cible pour ses opérations et son stockage.

**Why:** L’utilisateur veut composer des modules avec des fonctionnalités réelles : l’original conserve son comportement, tandis qu’une instance montée suit le contexte du module cible sans partager les données source.

**How to apply:** Proposer les fonctionnalités natives comme sources et enregistrer le module source, l’identifiant de fonction et le module effectif cible. Faire vérifier chaque opération par les permissions de la cible et filtrer le stockage par entreprise, module effectif et fonctionnalité ; tester qu’une modification dans A ne se voit pas dans B.