---
name: Frontière des abonnements
description: Distinction durable entre accès fonctionnels d’une entreprise et données de souscription/facturation.
---

Un abonnement doit être modélisé comme une entité métier distincte des modules actifs : il porte le plan, le prix, la périodicité, les dates, le paiement, les limites, les factures et l’historique du cycle de vie. Les modules autorisés restent une conséquence d’accès et ne remplacent pas ces données.

**Pourquoi :** une vue calculée à partir des entreprises et de leurs modules ne donne ni échéance, ni état de paiement, ni facture, et ne répond pas à l’attente d’un vrai registre d’abonnements.

**Comment appliquer :** conserver cette séparation dans l’interface, le store local de démonstration et la future API PostgreSQL. Ne jamais présenter des indicateurs de modules comme des données de facturation réelles.