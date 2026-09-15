---
name: Responsabilités des rôles
description: Règle de séparation entre responsabilité organisationnelle et permissions métier dans MAXIMUS.
---

Les comptes MAXIMUS restent dans une seule page entreprise. Leur responsabilité transversale vient du rôle assigné : administrateur entreprise, responsable informatique, Direction générale, manager d’unité ou employé. Cette responsabilité ne doit pas être déduite d’un second mode de gouvernance ni d’une case indépendante sur le compte.

**Why:** Le modèle le plus simple demandé par le produit est une navigation et une page uniques, avec des responsabilités filtrées par rôle. Les permissions des modules restent une capacité distincte afin qu’un responsable informatique ou la Direction générale ne reçoive pas automatiquement des droits métier.

**How to apply:** Lorsqu’un compte est créé ou modifié, dériver les capacités techniques, rapports, validations et pilotage d’unité depuis le rôle. Conserver les permissions de modules dans le rôle séparément, et faire respecter les mêmes rôles dans l’API Laravel.