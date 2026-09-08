---
name: Catalogue vente/location et services de livraison
description: Règles métier pour distinguer les produits loués et gérer les demandes de livraison.
---

Les produits de la vitrine portent un type métier explicite (`SALE` ou `RENTAL`) et, pour une location, une unité de tarification (`JOUR`, `SEMAINE` ou `MOIS`). Les anciennes heuristiques fondées sur le nom ou la catégorie ne doivent pas décider de l’éligibilité à la location.

Les livraisons demandées par un client sont une entité séparée des commandes : elles sont rattachées à l’entreprise et, lorsqu’un compte client existe, au client. Leur statut est géré côté entreprise, avec contrôle de la capacité publique et isolation par entreprise/client.

**Pourquoi:** une location et une livraison ont des cycles de vie différents d’une vente classique; les déduire d’un texte ou les mélanger aux commandes rend les droits, la persistance et le suivi ambigus.

**Comment appliquer:** conserver les types explicites dans les contrats API, les migrations, les formulaires internes et les vues publiques; filtrer les capacités publiques côté serveur avant toute création ou affichage.