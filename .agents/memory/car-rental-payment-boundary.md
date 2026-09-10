---
name: Réservations automobiles et paiement
description: Règles de cohérence entre créneaux, holds temporaires, confirmation fournisseur et accès aux factures.
---

Une réservation automobile reste un hold temporaire jusqu’à confirmation réelle du paiement. Un paiement reçu après expiration ne doit jamais confirmer un créneau repris par une autre réservation.

**Why:** Les retours navigateur ne prouvent pas le paiement et les webhooks peuvent arriver en retard. Confirmer sans revérifier le hold et les chevauchements peut attribuer la même voiture à deux clients.

**How to apply:** Lors de la création du paiement et du traitement fournisseur, verrouiller la réservation, vérifier son statut, son expiration et les chevauchements. Les factures invitées utilisent un jeton public hashé et WhatsApp reste masqué avant le statut payé.