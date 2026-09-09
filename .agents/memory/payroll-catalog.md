---
name: Catalogue Paie
description: Cohérence durable entre les fonctionnalités Paie, les packs, les secteurs et les permissions d’entreprise.
---

Les identifiants des fonctionnalités Paie doivent toujours être dérivés des libellés avec `featureSlug` (`tableau-de-bord`, `préparer-une-paie`, etc.). Les packs et les sélections d’entreprise doivent utiliser ces identifiants, pas d’anciens alias courts comme `dashboard` ou `preparation`.

**Why:** Les fonctionnalités génériques sont filtrées contre les slugs dérivés des libellés. Un ancien identifiant reste valide en apparence mais disparaît de la sélection effective, du rôle automatique et du menu employé.

**How to apply:** Lorsqu’un pack Paie est choisi pour une entreprise, recopier aussi ses `featurePermissions` dans `requestedModulePermissions`; sinon la présence de `requestedModuleFeatures` active la restriction d’entreprise et réduit les droits détaillés au seul niveau `voir`.

Les routes Paie côté serveur doivent vérifier les mêmes identifiants canoniques que le catalogue, notamment `solde-de-paie` pour la recharge du portefeuille. Les anciennes clés courtes peuvent rester acceptées uniquement comme compatibilité de migration.

**Why:** Une interface peut afficher une fonctionnalité autorisée alors que l’API la refuse si son contrôle utilise encore une ancienne clé comme `solde`.

**How to apply:** Garder le catalogue, l’état entreprise, les rôles, l’interface et `ModuleAuthorization` alignés sur les mêmes slugs avant toute livraison Paie.