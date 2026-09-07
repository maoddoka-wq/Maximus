# DiamanoPay sur Render

Le backend de paiement est prêt pour DiamanoPay sans dépendre d’un connecteur Replit. La production est servie par Render et les migrations sont exécutées par `render-entrypoint.sh` au démarrage du service.

## Variables Render

Ajouter les variables suivantes dans l’environnement **Production** du service `maximus-erp` :

- `PAYMENT_PROVIDER=diamanopay`
- `PAYMENT_DEFAULT_CURRENCY=XOF`
- `DIAMANOPAY_BASE_URL`
- `DIAMANOPAY_CLIENT_ID` et `DIAMANOPAY_CLIENT_SECRET`, ou `DIAMANOPAY_ACCESS_TOKEN`
- `DIAMANOPAY_CALLBACK_URL`
- `DIAMANOPAY_WEBHOOK_URL`

Avec `CLIENT_ID` et `CLIENT_SECRET`, MAXIMUS obtient automatiquement un Bearer Token via `/oauth2/token`. Si `DIAMANOPAY_ACCESS_TOKEN` est renseigné, il est prioritaire et l’authentification OAuth2 n’est pas appelée ; ne laissez donc pas un ancien token invalide actif lorsque vous utilisez le couple client OAuth. Les identifiants ne doivent jamais être ajoutés au dépôt, au frontend ou aux logs. Les entrées `sync: false` correspondantes sont déjà déclarées dans `render.yaml`.

## Webhook

Déclarer dans DiamanoPay l’URL publique Render suivante, avec le domaine réellement attribué au service :

`https://<domaine-public-render>/api/webhooks/diamanopay`

L’URL est aussi envoyée dans le champ `webhook` de chaque charge. DiamanoPay envoie un payload contenant `status`, `paymentService`, `transactionId` et `paymentRequestId`. MAXIMUS vérifie ensuite la transaction avec `GET /api/transaction/{id}` avant de confirmer le paiement.

Les événements répétés sont acceptés sans double crédit. Les événements inconnus et les transactions non vérifiables sont refusés.

## API DiamanoPay utilisée

- Token : `POST /oauth2/token` avec `application/x-www-form-urlencoded`
- Charge : `POST /api/charges`
- Transaction : `GET /api/transaction/{id}`
- Retrait : `POST /api/payout`
- Remboursement total Wave : `POST /api/payout/refund/{transactionId}`

## Déploiement

Le prochain déploiement Render :

1. construit le frontend avec `PORT=10000` ;
2. installe Laravel avec PostgreSQL ;
3. exécute les migrations financières avec `php artisan migrate --force --no-interaction` ;
4. démarre le serveur sur `PORT`.

Si les variables DiamanoPay sont absentes ou si la création de charge échoue, le paiement est marqué `FAILED`, l’erreur est journalisée côté backend sans secret, et le frontend affiche l’erreur au client. Une commande ne doit jamais afficher `PENDING` pour masquer une absence de configuration.