---
name: Intégration DiamanoPay
description: Règles durables pour l’intégration officielle DiamanoPay et la confirmation des paiements.
---

DiamanoPay doit être traité comme une API OAuth2 officielle : créer une charge avec les champs documentés, puis confirmer un webhook en relisant la transaction côté serveur. Le webhook ne doit pas être considéré comme une preuve autonome ; son statut, sa référence et son montant doivent être recoupés avec la transaction récupérée auprès du fournisseur.

Une erreur de création ne doit jamais être convertie en `PENDING` générique : un paiement non initialisé doit être `FAILED` avec une erreur explicite, tandis qu’un `PENDING` n’est valide qu’après une charge réellement créée avec une URL de paiement.

**Why:** La documentation officielle ne décrit pas de signature HMAC de webhook et sépare l’identifiant de demande de paiement (`paymentRequestId`) de l’identifiant de transaction (`transactionId`). Confondre ces identifiants ou créditer directement depuis le webhook crée des erreurs de rapprochement et des risques de double crédit.

**How to apply:** Conserver l’idempotence des événements, rechercher le paiement avec la référence ou l’identifiant de demande, vérifier `transactionId` via l’API DiamanoPay, puis seulement créditer le wallet. Utiliser le remboursement complet documenté pour Wave et un payout pour le cas Orange Money.

La configuration DiamanoPay doit être évaluée uniquement côté backend à partir de `config()`, avec l’URL API et un mode d’authentification valides ; les URLs de retour ne doivent pas faire passer des credentials valides pour une absence de configuration. En production, reconstruire explicitement le cache Laravel après injection des variables Render.

**Why:** Une URL callback manquante ou un cache de configuration construit avant les variables de production pouvait produire un faux message « non configuré », alors que le token ou les credentials existaient.

**How to apply:** Enregistrer le provider comme singleton, normaliser les valeurs de configuration et ne journaliser que les erreurs techniques sans secrets. Pour une commande e-commerce, remplacer le callback global par une URL de retour HTTPS générée côté serveur avec le domaine ou le slug de la boutique et la référence de commande.

Les réponses de lancement DiamanoPay peuvent utiliser plusieurs noms pour l’URL de checkout (`paymentUrl`, `checkout_url`, `checkoutUrl` ou variantes imbriquées) ; une création de paiement ne doit être considérée réussie que si une URL HTTPS/HTTP valide est réellement extraite. Les créations doivent rester sans retry automatique, avec idempotence en base pour absorber les doubles requêtes.

**Why:** Une réponse valide pouvait être classée en échec lorsque son champ ne portait pas exactement le nom attendu, tandis qu’une concurrence entre deux clics pouvait provoquer un second passage dans le flux de création.

**How to apply:** Normaliser les variantes documentées de réponse, journaliser uniquement le statut HTTP et un identifiant de corrélation, classer les erreurs de transport/authentification séparément, et récupérer l’enregistrement existant après un conflit d’unicité plutôt que rappeler le prestataire.