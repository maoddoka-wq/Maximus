---
name: Responsabilités des rôles
description: Règle de séparation entre responsabilité organisationnelle et permissions métier dans MAXIMUS.
---

Les comptes MAXIMUS restent dans une seule page entreprise. Leur responsabilité transversale vient du rôle assigné : administrateur entreprise, responsable informatique, Direction générale, manager d’unité ou employé. Le responsable informatique activé par l’entreprise est un administrateur de cet espace existant et en contrôle la page complète. Cette responsabilité ne doit pas être déduite d’un second mode de gouvernance ni d’une case indépendante sur le compte.

**Why:** Le modèle le plus simple demandé par le produit est une navigation et une page uniques. L’entreprise peut déléguer l’administration complète de cette page à son responsable informatique ; la Direction générale et les autres rôles restent filtrés selon leur responsabilité. Les droits métier ne sont pas ajoutés par une case séparée : ils suivent le rôle administrateur activé.

**How to apply:** Lorsqu’un compte est créé ou modifié, dériver l’administration de l’espace, les rapports, validations et pilotage d’unité depuis le rôle. Un `it_admin` doit recevoir le même périmètre d’espace que l’administrateur entreprise, tandis que les permissions métier des rôles non administrateurs restent séparées. Faire respecter les mêmes rôles dans l’API Laravel.