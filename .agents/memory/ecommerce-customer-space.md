---
name: Espace client e-commerce
description: Règles durables pour les comptes clients, sessions et commandes des boutiques publiques.
---

Les comptes clients sont propres à l’entreprise de la boutique publiée. Une session client n’est valide que si son entreprise correspond à la boutique résolue par le slug ou le domaine réel ; les commandes authentifiées reprennent l’identité serveur du client, tandis que les anciennes commandes invitées restent non attribuées.

**Why:** Un email, un slug ou un identifiant transmis par le navigateur ne suffit pas à prouver la propriété d’une commande et pourrait créer une fuite entre boutiques ou entre clients.

**How to apply:** Résoudre d’abord la boutique publiée, charger la session client avec son `company_id`, puis filtrer chaque adresse, favori, panier et commande par `customer_id` et entreprise ; ne jamais attribuer rétroactivement une commande invitée.

Une commande idempotente déjà persistée doit pouvoir reprendre l’initialisation de son paiement si la première tentative n’a pas créé de paiement, sans recréer la commande ni décrémenter le stock une seconde fois.

**Why:** Une première tentative interrompue peut laisser une commande valide sans paiement associé ; renvoyer `payment: null` bloque définitivement le checkout et transforme une reprise légitime en erreur frontend.

**How to apply:** Réutiliser l’identifiant de commande comme clé d’idempotence du paiement, rattacher le nouveau paiement à la commande existante, puis renvoyer le même `reference` avec le payload de paiement.