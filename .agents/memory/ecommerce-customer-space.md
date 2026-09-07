---
name: Espace client e-commerce
description: Règles durables pour les comptes clients, sessions et commandes des boutiques publiques.
---

Les comptes clients sont propres à l’entreprise de la boutique publiée. Une session client n’est valide que si son entreprise correspond à la boutique résolue par le slug ou le domaine réel ; les commandes authentifiées reprennent l’identité serveur du client, tandis que les anciennes commandes invitées restent non attribuées.

**Why:** Un email, un slug ou un identifiant transmis par le navigateur ne suffit pas à prouver la propriété d’une commande et pourrait créer une fuite entre boutiques ou entre clients.

**How to apply:** Résoudre d’abord la boutique publiée, charger la session client avec son `company_id`, puis filtrer chaque adresse, favori, panier et commande par `customer_id` et entreprise ; ne jamais attribuer rétroactivement une commande invitée.