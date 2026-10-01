---
name: Frontière des abonnements
description: Distinction durable entre accès fonctionnels d’une entreprise et données de souscription/facturation.
---

Un abonnement doit être modélisé comme une entité métier distincte des modules actifs : il porte le plan, le prix, la périodicité, les dates, le paiement, les limites, les factures et l’historique du cycle de vie. Gestion commerciale (`commerce`) et E-commerce (`ecommerce`) restent deux modules distincts. La Vente comptoir (`vente-comptoir`) appartient uniquement au module E-commerce et relève de l’abonnement de l’entreprise via ce module, sans tarif POS ou commission par vente inventé. Une souscription enregistrée ne prouve pas qu’un prélèvement réel a eu lieu.

**Pourquoi :** une vue calculée à partir des entreprises et de leurs modules ne donne ni échéance, ni état de paiement, ni facture; le rattachement du POS à E-commerce évite aussi de créer une tarification séparée sans décision de prix.

**Comment appliquer :** conserver les identifiants, packs, permissions et accès de Gestion commerciale et d’E-commerce séparés dans l’interface, le catalogue, le store local et la future API PostgreSQL. Rattacher le POS au module E-commerce dans les accès et le forfait, sans nouvelle ligne d’abonnement. Ne jamais présenter les droits de module comme preuve de facturation ou de paiement réel.