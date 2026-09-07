# DiamanoPay sur Render

Le backend de paiement est prêt pour DiamanoPay sans dépendre d’un connecteur Replit. La production est servie par Render et les migrations sont exécutées par `render-entrypoint.sh` au démarrage du service.

## Variables Render

Ajouter les variables suivantes dans l’environnement **Production** du service `maximus-erp` :

- `PAYMENT_PROVIDER=diamanopay`
- `PAYMENT_DEFAULT_CURRENCY=XOF`
- `DIAMANOPAY_BASE_URL`
- `DIAMANOPAY_CLIENT_ID` et `DIAMANOPAY_CLIENT_SECRET`, ou `DIAMANOPAY_ACCESS_TOKEN`
- `DIAMANOPAY_WEBHOOK_SECRET`
- `DIAMANOPAY_CALLBACK_URL`

Les identifiants ne doivent jamais être ajoutés au dépôt, au frontend ou aux logs. Les entrées `sync: false` correspondantes sont déjà déclarées dans `render.yaml`.

## Webhook

Déclarer dans DiamanoPay l’URL publique Render suivante, avec le domaine réellement attribué au service :

`https://<domaine-public-render>/api/webhooks/diamanopay`

Le endpoint exige :

- `X-DiamanoPay-Signature` calculée en HMAC-SHA256 avec `DIAMANOPAY_WEBHOOK_SECRET` ;
- `X-DiamanoPay-Event-Id` unique ;
- une référence de paiement MAXIMUS, un montant et une devise cohérents.

Les événements répétés sont acceptés sans double crédit. Les événements inconnus, les montants incohérents et les signatures invalides sont refusés.

## Déploiement

Le prochain déploiement Render :

1. construit le frontend avec `PORT=10000` ;
2. installe Laravel avec PostgreSQL ;
3. exécute les migrations financières avec `php artisan migrate --force --no-interaction` ;
4. démarre le serveur sur `PORT`.

Tant que les variables DiamanoPay ne sont pas renseignées, les commandes restent `PENDING` et aucune écriture de paiement confirmé ni aucun crédit wallet n’est créé.