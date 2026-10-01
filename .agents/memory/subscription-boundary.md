---
name: Frontière des abonnements
description: Distinction durable entre accès fonctionnels d’une entreprise et données de souscription/facturation.
---

Un abonnement doit être modélisé comme une entité métier distincte des modules actifs : il porte le plan, le prix, la périodicité, les dates, le paiement, les limites, les factures et l’historique du cycle de vie. La Vente comptoir est une fonctionnalité du module E-commerce et relève de l’abonnement de l’entreprise via ce module, sans tarif POS ou commission par vente inventé. Une souscription enregistrée ne prouve pas qu’un prélèvement réel a eu lieu.

**Pourquoi :** une vue calculée à partir des entreprises et de leurs modules ne donne ni échéance, ni état de paiement, ni facture; le rattachement du POS à E-commerce évite aussi de créer une tarification séparée sans décision de prix.

**Comment appliquer :** conserver cette séparation dans l’interface, le store local de démonstration et la future API PostgreSQL. Rattacher le POS au module E-commerce dans les accès et le forfait, sans nouvelle ligne d’abonnement. Ne jamais présenter les droits de module comme preuve de facturation ou de paiement réel.

Un paiement d’abonnement réellement confirmé en XOF crédite intégralement le compte MAXIMUS, sans appliquer les pourcentages des ventes e-commerce. Chaque paiement utilise une clé d’idempotence liée à son identifiant; les anciens paiements `PAID` sans écriture sont réconciliés une seule fois.

**Pourquoi :** le revenu d’abonnement est distinct des commissions de vente; appliquer leur partage ferait comptabiliser un montant différent de l’abonnement payé.

**Comment appliquer :** créditer seulement depuis le paiement persistant au statut `PAID`, puis vérifier les reprises historiques par le registre avant tout nouvel incrément.

Les souscriptions et factures des entreprises supprimées ou archivées restent conservées pour l’audit, mais ne doivent plus apparaître dans la vue courante ni contribuer à ses indicateurs.

**Pourquoi :** la suppression d’une entreprise révoque son accès, sans effacer les traces financières qui peuvent être nécessaires à la réconciliation.

**Comment appliquer :** filtrer les vues et totaux selon les entreprises encore visibles; ne pas supprimer les souscriptions ou factures historiques lors de l’archivage.