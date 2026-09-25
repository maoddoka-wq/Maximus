---
name: Catalogue de fonctionnalités LABO
description: Règles de catalogue partagé, association aux modules et isolation des enregistrements LABO.
---

Le montage LABO ne crée pas de fiches de saisie. Il permet d’ajouter à un module cible un accès à une fonctionnalité native d’un autre module, en conservant la source et ses données intactes. Une même référence peut être montée dans plusieurs modules.

Les fiches LABO historiques restent lisibles et leurs données ne sont pas supprimées, mais le parcours de composition ne doit pas en créer de nouvelles. Le runtime d’une fonctionnalité montée renvoie vers son module source.

**Why:** L’utilisateur a précisé que le besoin est de monter facilement des fonctionnalités existantes, pas de concevoir des fiches de saisie.

**How to apply:** Proposer les fonctionnalités natives comme sources, enregistrer les montages par identifiant dans le catalogue partagé et préserver les liens d’origine. Ne pas convertir une référence montée en fiche LABO.