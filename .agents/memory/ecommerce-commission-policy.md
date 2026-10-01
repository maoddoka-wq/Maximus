---
name: Commission e-commerce
description: Règle de répartition des ventes e-commerce et alimentation du portefeuille MAXIMUS.
---

Les nouvelles ventes e-commerce ne prélèvent aucune commission MAXIMUS. Les frais de traitement DiamanoPay (3 % par défaut) restent distincts; les ventes comptoir en espèces, Wave ou Orange Money sont réglées hors MAXIMUS après confirmation du caissier et ne créent aucune écriture de portefeuille ni charge DiamanoPay. Les commissions et soldes historiques déjà inscrits restent inchangés.

**Why:** Le revenu MAXIMUS relève de l’abonnement de l’entreprise, pas d’une commission par vente; l’utilisateur a précisé que les paiements comptoir Wave/Orange Money se font hors MAXIMUS et qu’il ne faut pas intégrer DiamanoPay à ce parcours; l’historique comptable doit rester vérifiable.

**How to apply:** Forcer la part MAXIMUS à 0 pour les nouvelles ventes, conserver les frais de paiement séparément, et ne jamais effacer les écritures historiques. Une vente comptoir mobile exige une confirmation explicite du caissier, mais aucune référence opérateur; elle ne déclenche pas de checkout ni de webhook. Une annulation ou un remboursement peut encore devoir traiter une commission historique correspondante. Ne pas simuler un abonnement récurrent avec un checkout ponctuel non documenté.