---
name: Commission e-commerce
description: Règle de répartition des ventes e-commerce et alimentation du portefeuille MAXIMUS.
---

La répartition par défaut d’une vente est de 3 % pour DiamanoPay, 2 % pour MAXIMUS et 95 % pour le vendeur. Le portefeuille MAXIMUS reçoit sa commission dans une écriture idempotente liée à la commande, tandis que le vendeur est crédité du montant net.

**Why:** La plateforme doit distinguer le montant brut payé, les frais du prestataire et la part MAXIMUS afin d’éviter de créditer 100 % de la vente au vendeur ou de doubler une commission lors d’un webhook répété.

**How to apply:** Conserver le calcul côté serveur, réserver les écritures dans un registre propre au portefeuille MAXIMUS et afficher la ventilation sur les espaces vendeur et administration. Les évolutions de remboursement doivent aussi traiter une commission déjà retirée.