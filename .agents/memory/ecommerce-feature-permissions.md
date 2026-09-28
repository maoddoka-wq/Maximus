---
name: Permissions des paramètres e-commerce
description: Règle de correspondance entre les permissions détaillées et les contrôles serveur du module e-commerce.
---

Les contrôles d’autorisation e-commerce doivent recevoir l’identifiant canonique de la fonctionnalité tel qu’il existe dans le catalogue et dans les rôles persistés. Pour les paramètres de boutique, cet identifiant est `parametres`, pas l’alias anglais `settings`.

Pour `parametres`/`settings`, les opérations administratives dédiées restent contrôlées par leur permission directe et ne doivent pas exiger `créer` comme un CRUD métier standard.

**Why:** l’interface et les rôles détaillés peuvent autoriser `ecommerce:menu:parametres` alors qu’un endpoint vérifiant `settings` retourne un refus 403. Un rôle avec `voir` et `modifier` doit pouvoir gérer un réglage sans permission de création; les comptes administrateur peuvent masquer ces écarts pendant les tests.

**How to apply:** avant d’ajouter ou de modifier un endpoint e-commerce, vérifier l’identifiant dans le catalogue de fonctionnalités, les packs et `ModuleAuthorization`, distinguer les réglages des enregistrements CRUD, puis ajouter un test avec un rôle détaillé plutôt qu’uniquement avec `company_admin`.