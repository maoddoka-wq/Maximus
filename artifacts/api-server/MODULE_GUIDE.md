# Guide de développement des modules MAXIMUS

Ce document est la règle de travail pour ajouter un module métier à MAXIMUS.
Un module est conçu indépendamment de toute entreprise, comme un outil métier
complet que différentes entreprises peuvent choisir d’utiliser. Il existe dans
le catalogue MAXIMUS avant d’être attribué à une entreprise.

## 1. Le modèle mental

Le produit est unique :

```text
MAXIMUS
├── Stocks
├── Commerce
├── Présences
├── Contrôle
└── Prochains modules
```

Le code et la définition d’un module sont communs à toutes les entreprises.
L’entreprise est une utilisatrice du module, pas sa propriétaire. Elle ne
change que :

- l’activation du module ;
- sa configuration ;
- les employés autorisés ;
- ses données ;
- ses couleurs et son identité.

Un module ne doit jamais dépendre d’une entreprise fictive pour être créé, testé
ou faire évoluer son catalogue.

## 2. Règle d’isolation obligatoire

Pour chaque route interne :

1. Laravel authentifie la session avec `maximus.auth`.
2. Laravel résout l’entreprise depuis l’acteur connecté avec
   `maximus.company`.
3. Le contrôleur récupère le périmètre avec :

   ```php
   $companyId = $request->attributes->get('companyId');
   ```

4. Chaque lecture et chaque écriture applique ce `companyId`.
5. Un `companyId` envoyé par le navigateur peut confirmer le contexte, mais ne
   peut jamais le changer.
6. Un administrateur MAXIMUS peut choisir explicitement une entreprise.
7. Un utilisateur d’entreprise qui tente d’en choisir une autre reçoit `403`.

Ne jamais écrire ceci dans un nouveau module :

```php
$companyId = $request->input('companyId');
```

sans vérifier le contexte serveur. Ne jamais ajouter de fallback d’entreprise
dans le code métier.

Les routes publiques d’un futur site commercial doivent être séparées des
routes internes MAXIMUS. Elles auront leur propre contrat et ne doivent pas
exposer les bootstraps administratifs.

## 3. Structure d’un module

### Backend Laravel

Pour un module `orders` :

```text
artifacts/api-server/laravel/
├── app/Http/Controllers/Api/OrdersController.php
├── app/Models/Order.php
├── app/Support/OrdersAuthorization.php
├── database/migrations/...._create_orders_tables.php
├── routes/orders.php
└── tests/Feature/OrdersTest.php
```

Ajouter le fichier de routes dans `routes/api.php` :

```php
require __DIR__.'/orders.php';
```

Protéger les routes internes :

```php
Route::middleware(['maximus.auth', 'maximus.company'])
    ->prefix('orders')
    ->group(function (): void {
        // routes du module
    });
```

Le contrôleur doit rester mince :

- validation de la requête ;
- récupération du contexte ;
- appel d’un service ou d’une transaction ;
- réponse JSON stable.

Les règles complexes, les transitions d’état et les opérations
multi-tables doivent vivre dans un service ou une classe de support dédiée.

### Frontend MAXIMUS

Pour le même module :

```text
artifacts/maximus/src/
├── lib/orders-api.ts
├── pages/orders-module.tsx
├── components/orders/
└── ...
```

Le frontend doit :

- utiliser l’API Laravel ;
- utiliser un identifiant de module stable ;
- afficher uniquement les fonctionnalités autorisées ;
- gérer les réponses `401`, `403` et `404` ;
- ne jamais écrire directement dans PostgreSQL ;
- ne jamais considérer un élément masqué comme sécurisé.

## 4. Identité et activation du module

Chaque module reçoit un identifiant stable, par exemple :

```text
stocks
commerce
presences
control
orders
```

Cet identifiant est utilisé pour :

- le catalogue des modules ;
- l’activation par entreprise ;
- les permissions ;
- les routes frontend ;
- les tests ;
- les traces d’audit.

Les fonctionnalités doivent aussi avoir des identifiants stables. Ne pas
utiliser le texte traduit comme identifiant permanent.

Une entreprise ne peut utiliser un module que si :

```text
module existant
AND module activé pour l’entreprise
AND rôle autorisé
AND action autorisée
```

L’activation et les permissions sont différentes :

- activation : l’entreprise possède-t-elle le module ?
- permission : cet employé peut-il utiliser cette fonctionnalité ?

## 5. Données et migrations

Chaque table métier doit contenir un `company_id`, sauf table explicitement
globale comme le catalogue des modules.

Une migration doit :

- vérifier les contraintes existantes ;
- ne pas supprimer les données ;
- ajouter les index utiles ;
- préserver les identifiants ;
- être testée sur SQLite et PostgreSQL lorsque le comportement diffère.

Les opérations qui modifient plusieurs tables doivent utiliser :

```php
DB::transaction(function (): void {
    // opération complète
});
```

Les mouvements de stock, commandes, validations et annulations doivent être
idempotents ou protégés contre les doublons.

## 6. Tests obligatoires

Un module n’est pas terminé sans tests pour :

- absence de session → `401` ;
- entreprise différente → `403` ;
- entreprise correcte → succès ;
- rôle interdit → `403` ;
- fonctionnalité désactivée → refus ;
- création ;
- modification ;
- archivage ou suppression ;
- données persistées ;
- transaction ou règle métier principale ;
- audit si l’action est sensible.

Exécuter les tests Laravel :

```bash
cd artifacts/api-server/laravel
php artisan test
```

Puis vérifier le workflow API et le parcours frontend avec une entreprise de
test créée explicitement.

## 7. Checklist de livraison humaine

Avant de déclarer un module terminé, le développeur coche :

- [ ] L’identifiant du module est stable et documenté.
- [ ] Le module peut être attribué à n’importe quelle entreprise autorisée.
- [ ] Aucun identifiant d’entreprise fictive n’est utilisé dans le code métier.
- [ ] Les routes internes utilisent `maximus.auth` et `maximus.company`.
- [ ] Toutes les requêtes sont filtrées par le contexte serveur.
- [ ] Les rôles et actions sont vérifiés côté Laravel.
- [ ] Les migrations sont non destructives.
- [ ] Les erreurs sont explicites.
- [ ] Les tests de rôle et d’isolation passent.
- [ ] Le frontend utilise le client API du module.
- [ ] L’interface masque les fonctionnalités non autorisées sans compter sur ce
      masquage pour la sécurité.
- [ ] Le module est visible dans le catalogue et activable par entreprise.
- [ ] Le parcours complet a été vérifié avec des données de test explicites.
- [ ] Les décisions non évidentes sont ajoutées à la documentation.

## 8. Definition of Done

Un module est livré quand un autre développeur peut :

1. comprendre son objectif en lisant ce guide et ses tests ;
2. l’activer pour une deuxième entreprise sans copier le code ;
3. vérifier ses permissions ;
4. modifier son interface sans toucher aux autres modules ;
5. vérifier son API avec les tests ;
6. expliquer pourquoi une donnée ne peut pas sortir de son entreprise.