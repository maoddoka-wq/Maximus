---
name: Comptabilisation de l’inventaire E-commerce
description: Règles durables pour le journal, les soldes d’ouverture et les ventes physiques e-commerce.
---

Les ventes comptoir et les commandes en ligne doivent écrire leur mouvement dans la même transaction que la variation du stock. Une commande en ligne physique sort du stock à sa création, pas au webhook de paiement; une restitution sur échec ou annulation doit être protégée contre les appels répétés. Une relance réseau avec le même ajustement doit réutiliser la même clé d’idempotence.

À l’activation du suivi, les produits physiques déjà présents reçoivent un solde d’ouverture basé sur leur stock courant. Les mouvements historiques disponibles sont conservés, sans prétendre reconstituer des niveaux antérieurs inconnus.

**Why:** le stock peut changer avant la confirmation du paiement, et les ajustements historiques manuels ne sont pas toujours retraçables. Un instantané de départ est fiable; un historique reconstruit ne le serait pas.

**How to apply:** toute modification du flux POS, de commande en ligne, d’annulation ou d’ajustement doit garder la mise à jour du produit et son écriture de journal atomiques, tenant-scoped et idempotentes. Garder ce journal distinct des entrepôts du module Gestion de stock sans correspondance explicite.