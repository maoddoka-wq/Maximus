---
name: Réconciliation des règlements MAXIMUS
description: Règles de récupération des ventes payées dont les écritures vendeur ou MAXIMUS sont incomplètes.
---

Une commande `PAID` doit pouvoir reconstruire séparément l’écriture vendeur et la commission MAXIMUS, chacune protégée par sa propre clé d’idempotence. L’existence de l’écriture vendeur ne doit jamais empêcher la création de la commission MAXIMUS.

**Why:** Un paiement peut avoir été confirmé avant l’ajout du portefeuille MAXIMUS, ou une ancienne exécution peut avoir laissé les deux registres dans un état partiel.

**How to apply:** Toute vue ou opération d’administration qui expose le portefeuille MAXIMUS peut déclencher une réconciliation idempotente des commandes `PAID`; les commissions nulles ne créent pas d’écriture artificielle.