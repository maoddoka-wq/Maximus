---
name: Portefeuille vendeur
description: Règles de solde et de retrait pour les entreprises qui vendent via le module E-commerce.
---

Le vendeur est l’entreprise qui possède le module E-commerce, pas le client acheteur. Après confirmation DiamanoPay, le montant est visible comme solde confirmé mais reste en attente ; il devient retirable après livraison ou après sept jours sans litige. Une demande de retrait réserve le montant jusqu’au succès ou à l’échec du payout.

**Why:** Cette réserve protège MAXIMUS contre les annulations, remboursements et litiges après paiement tout en donnant au vendeur une visibilité immédiate sur ses ventes.

**How to apply:** Séparer solde confirmé, solde en attente, solde disponible et solde réservé ; traiter les crédits et retraits de façon idempotente et atomique ; conserver un registre financier auditable par entreprise.