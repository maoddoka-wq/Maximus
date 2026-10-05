---
name: Paiement à la livraison
description: Frontière financière des commandes e-commerce payables lors de la livraison.
---

Une commande avec `CASH_ON_DELIVERY` reste `UNPAID` à sa création. Ne pas ouvrir DiamanoPay, déclarer le paiement reçu ni créditer un portefeuille automatiquement. Le paiement ne devient reçu qu'après confirmation explicite de l'encaissement.

**Why:** Le moyen choisi décrit l'intention du client; la création de la commande ne prouve pas que l'argent a été collecté.

**How to apply:** Séparer le statut de commande, la confirmation de réception des fonds et les écritures de portefeuille. Toute action qui confirme l'encaissement doit être autorisée, vérifiable et idempotente.