---
name: Gouvernance des comptes entreprise
description: Séparation entre administration technique du service informatique et compte métier nominatif de la Direction générale.
---

L’administrateur de l’entreprise représente l’administration technique : configuration de l’espace, modules, rôles, comptes et sécurité. La Direction générale utilise un compte employé nominatif rattaché à l’unité racine « Direction générale », avec des permissions métier et de consultation adaptées, sans héritage automatique des droits techniques.

**Why:** Un compte partagé ou tout-puissant mélange la configuration informatique et les décisions métier, empêche une traçabilité correcte et expose la Direction générale à des actions opérationnelles inutiles.

**How to apply:** Présenter clairement le compte `company_admin` comme administrateur technique, proposer la case unique « Direction générale » à côté de « Manager » lors de la création, persister son marqueur sur le compte authentifié, puis privilégier un rôle de lecture/reporting.