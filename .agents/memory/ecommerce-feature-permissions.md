---
name: Permissions des paramètres e-commerce
description: Règle de correspondance entre les permissions détaillées et les contrôles serveur du module e-commerce.
---

Les contrôles d’autorisation e-commerce doivent recevoir l’identifiant canonique de la fonctionnalité tel qu’il existe dans le catalogue et dans les rôles persistés. Pour les paramètres de boutique, cet identifiant est `parametres`, pas l’alias anglais `settings`.

**Why:** l’interface et les rôles détaillés peuvent autoriser `ecommerce:menu:parametres` alors qu’un endpoint vérifiant `settings` retourne un refus 403. Les comptes administrateur d’entreprise contournent ce contrôle, ce qui peut masquer le problème pendant les tests manuels.

**How to apply:** avant d’ajouter ou de modifier un endpoint e-commerce, vérifier l’identifiant dans le catalogue de fonctionnalités, les packs et `ModuleAuthorization`, puis ajouter un test avec un rôle détaillé plutôt qu’uniquement avec `company_admin`.