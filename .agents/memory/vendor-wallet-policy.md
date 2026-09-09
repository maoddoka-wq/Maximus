---
name: Portefeuille vendeur
description: Règles de solde et de retrait pour les entreprises qui vendent via le module E-commerce.
---

Le vendeur est l’entreprise qui possède le module E-commerce, pas le client acheteur. Après confirmation DiamanoPay, le montant est visible comme solde confirmé mais reste en attente ; il devient retirable dès livraison ou selon la règle de maturation configurée par l’administration MAXIMUS (automatique, jours ou semaines). Une demande de retrait réserve le montant jusqu’au succès ou à l’échec du payout.

**Why:** Cette réserve protège MAXIMUS contre les annulations, remboursements et litiges après paiement tout en donnant au vendeur une visibilité immédiate sur ses ventes.

**How to apply:** Séparer solde confirmé, solde en attente, solde disponible et solde réservé ; traiter les crédits et retraits de façon idempotente et atomique ; conserver un registre financier auditable par entreprise.

La règle `AUTOMATIC` attend la livraison ; les règles `DAYS` et `WEEKS` appliquent la valeur configurée à partir de la confirmation du paiement, tout en libérant immédiatement une commande livrée.

**Why:** Le délai de sécurité est une décision de gouvernance plateforme et ne doit pas être figé dans le code ni imposé par une entreprise cliente.

**How to apply:** Lire la politique globale via le service de maturation avant chaque nouveau crédit ; exposer son libellé dans le portefeuille vendeur et réserver sa modification à `maximus_admin`.

Un payout DiamanoPay dont le statut est intermédiaire conserve les fonds en réserve ; seuls un succès terminal ou un échec terminal modifient cette réserve.

**Why:** Un retour HTTP accepté par le prestataire ne signifie pas nécessairement que le transfert Wave est finalisé.

**How to apply:** Traiter `PENDING` et les statuts équivalents comme `PROCESSING`, attendre le webhook final, et ne restituer les fonds qu’en cas d’échec explicite.

Un retrait demande un montant reçu par le vendeur et ajoute un frais fixe configuré par MAXIMUS ; le débit total est `montant + frais`, doit être couvert par le solde disponible et est réservé atomiquement.

**Why:** Un solde disponible de 1 000 XOF ne doit pas permettre un retrait de 1 000 XOF si le prestataire facture 100 XOF : les frais ne doivent jamais créer un solde négatif.

**How to apply:** Calculer et contrôler le frais uniquement côté serveur, exposer le maximum retirable, enregistrer séparément le frais dans le registre, puis restituer le montant total réservé en cas d’échec du payout.