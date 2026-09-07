---
name: Intégration DiamanoPay
description: Règles durables pour l’intégration officielle DiamanoPay et la confirmation des paiements.
---

DiamanoPay doit être traité comme une API OAuth2 officielle : créer une charge avec les champs documentés, puis confirmer un webhook en relisant la transaction côté serveur. Le webhook ne doit pas être considéré comme une preuve autonome ; son statut, sa référence et son montant doivent être recoupés avec la transaction récupérée auprès du fournisseur.

Une erreur de création ne doit jamais être convertie en `PENDING` générique : un paiement non initialisé doit être `FAILED` avec une erreur explicite, tandis qu’un `PENDING` n’est valide qu’après une charge réellement créée avec une URL de paiement.

**Why:** La documentation officielle ne décrit pas de signature HMAC de webhook et sépare l’identifiant de demande de paiement (`paymentRequestId`) de l’identifiant de transaction (`transactionId`). Confondre ces identifiants ou créditer directement depuis le webhook crée des erreurs de rapprochement et des risques de double crédit.

**How to apply:** Conserver l’idempotence des événements, rechercher le paiement avec la référence ou l’identifiant de demande, vérifier `transactionId` via l’API DiamanoPay, puis seulement créditer le wallet. Utiliser le remboursement complet documenté pour Wave et un payout pour le cas Orange Money.