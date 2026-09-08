---
name: Catalogue vente/location et services de livraison
description: Règles métier pour distinguer les produits loués et gérer les demandes de livraison.
---

Les produits de la vitrine portent un type métier explicite (`SALE` ou `RENTAL`) et, pour une location, une unité de tarification (`JOUR`, `SEMAINE` ou `MOIS`). Les anciennes heuristiques fondées sur le nom ou la catégorie ne doivent pas décider de l’éligibilité à la location.

Les livraisons demandées par un client sont une entité séparée des commandes : elles sont rattachées à l’entreprise et, lorsqu’un compte client existe, au client. Leur statut est géré côté entreprise, avec contrôle de la capacité publique et isolation par entreprise/client.

**Pourquoi:** une location et une livraison ont des cycles de vie différents d’une vente classique; les déduire d’un texte ou les mélanger aux commandes rend les droits, la persistance et le suivi ambigus.

**Comment appliquer:** conserver les types explicites dans les contrats API, les migrations, les formulaires internes et les vues publiques; filtrer les capacités publiques côté serveur avant toute création ou affichage.

Les locations autonomes restent séparées des produits dans le catalogue, mais peuvent désormais devenir des lignes de commande avec leur propre `rental_id`. Leur disponibilité est réservée lors de la création de commande et leur montant utilise le même checkout et le même suivi de paiement que les ventes.

**Pourquoi:** séparer le modèle métier ne doit pas empêcher une location publiée d’être payée dans le parcours e-commerce commun.

**Comment appliquer:** ne pas fabriquer de produit miroir pour une location autonome; transmettre son identifiant de location dans la commande, vérifier l’entreprise, le statut publié et la disponibilité côté serveur, puis laisser le service de paiement traiter le total de la commande.

Dans la réponse publique fusionnée, une location autonome doit rester identifiable par `id`/`rentalId`, tandis qu’un produit catalogue de type location doit conserver son `productSlug`.

**Pourquoi:** les deux entités partagent l’affichage public mais ne sont pas stockées dans la même table; perdre ce discriminant fait échouer la création de commande ou la réservation.

**Comment appliquer:** conserver `productSlug` lors de la transformation d’une location catalogue en ligne de panier et réserver `rentalId` aux lignes issues de `ecommerce_rentals`.