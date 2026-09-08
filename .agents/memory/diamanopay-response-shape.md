---
name: Réponse DiamanoPay
description: Contrat observé pour les réponses de création de charge DiamanoPay.
---

Les réponses DiamanoPay de création de charge ne doivent pas être supposées plates. Le provider peut renvoyer une enveloppe `success`, `statusCode`, `message`, `data`, avec les identifiants et URL dans `data`. Les variantes observées ou nécessaires sont `id`/`charge_id`/`chargeId` et `checkout_url`/`checkoutUrl`/`payment_url`/`paymentUrl`.

Le contrat développeur actuel attend un unique `redirectUrl` pour le retour navigateur et `webhook` pour la notification serveur. Il ne faut pas envoyer simultanément les anciens champs `successUrl` et `errorUrl` : le checkout peut alors rester sur la page DiamanoPay au lieu de revenir dans la boutique. Le retour navigateur doit seulement identifier la commande ; le statut fiable vient du webhook puis de l’endpoint public de statut.

**Why:** Le premier payload valide a franchi l’authentification et la validation `provider`, mais l’application renvoyait ensuite 502 parce qu’elle ne lisait que `id` et `checkout_url` à la racine.

**How to apply:** Lors d’une évolution de l’intégration DiamanoPay, normaliser d’abord l’enveloppe `data`, accepter les variantes de nommage, puis valider que l’identifiant et l’URL de checkout sont non vides avant de persister la commande.