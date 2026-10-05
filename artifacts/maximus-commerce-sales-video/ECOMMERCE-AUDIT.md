# Audit fonctionnel — E-commerce MAXIMUS

## Portée et méthode

Audit du code de l’interface MAXIMUS, du parcours public et des routes Laravel, complété par les tests automatisés ciblés. Il confirme la présence des parcours dans le logiciel; il ne constitue pas une recette manuelle sur une boutique publiée ni une validation de prestataires en production.

Vérification exécutée depuis `artifacts/api-server/laravel` :

```sh
php artisan test --testsuite=Feature --filter='Ecommerce|CarRental|SellerWallet'
```

Résultat : **97 tests réussis, 805 assertions**.

## Fonctions présentes

| Domaine | État observé | Éléments vérifiés |
| --- | --- | --- |
| Tableau de bord | Disponible | Activité des commandes, ventes, catalogue publié et seuils de stock; résumé sans données de test revendiquées dans la vidéo. |
| Identité et vitrine | Disponible | Nom, identité graphique, accueil, bannière, boutique publiée et domaine personnalisé avec preuve DNS. |
| Catalogue et catégories | Disponible | Création, modification, archivage, publication, fiches physiques, prix, stock, image/galerie et rattachement aux catégories. |
| Produits numériques | Disponible | Fichier privé exigé avant publication; accès de téléchargement accordé après confirmation du paiement. |
| Boutique client | Disponible | Catalogue public, panier, compte, profil, adresses, favoris, commandes et accès aux achats numériques. |
| Commandes et pièces jointes | Disponible | Cycle de statuts, consultation côté client; pièces jointes facultatives, privées et bornées au propriétaire si l’option boutique est activée. |
| Paiement du checkout | Parcours présent; production non validée par cet audit | Choix Wave/Orange Money côté checkout et paiement à la livraison pour une commande physique. Les tests utilisent des réponses de fournisseur simulées; ils ne prouvent pas une transaction DiamanoPay sur le service publié. |
| Vente comptoir | Disponible | Enregistrement idempotent, modes espèces et mobile money, calcul de la monnaie rendue, décrément du stock et historique. |
| Rapport des ventes | Disponible | Sources activées, filtres de période et de source, résultats bornés à l’entreprise et totaux groupés par devise. |
| Location | Disponible | Offres et disponibilités; réservations automobiles, devis fondé sur le trajet et les tarifs configurés, contrôle de chevauchement et facture protégée. |
| Livraisons | Disponible | Zones configurables, demandes de livraison séparées des commandes, statuts et périmètre client vérifié. |
| Clients | Disponible | Liste de clients issus de la boutique et parcours d’espace client; les données restent isolées par entreprise et par client. |
| Finances et retraits | Disponible dans le code; fournisseur non validé en production par cet audit | Portefeuille, écritures, fonds en attente/disponibles, compte de retrait, réservations de fonds et traitement des retours d’échec. |
| Paramètres | Disponible | Devise, autorisation des pièces jointes, paramètres de boutique et autres réglages associés. |

## Limites qui changent les affirmations de la vidéo

1. **Promotions :** l’onglet est un écran d’attente. Aucun parcours actif de gestion de campagnes n’a été trouvé dans cette fonctionnalité. Les campagnes sont donc annoncées « à venir », pas présentées comme disponibles.
2. **Paiements externes :** le code de checkout et de webhook est couvert par des tests automatisés, y compris la forme de réponse DiamanoPay. La réussite des paiements ou retraits sur l’environnement de production n’a pas été vérifiée dans le cadre de cet audit.
3. **Fonctions non trouvées dans les parcours E-commerce examinés :** coupons ou codes promotionnels, variantes de produit et avis/notes de produits. Un prix de comparaison peut exister sur une fiche, mais cela ne suffit pas à prouver une gestion de campagnes.
4. **Suivi logistique :** les commandes ont des statuts de traitement et les boutiques gèrent leurs demandes/zones; aucun suivi externe par transporteur n’est revendiqué.
5. **Portée des tests :** les 97 tests établissent des comportements API et des scénarios automatisés. Ils ne remplacent pas un test réel sur une boutique publique et ne prouvent pas la configuration DNS, paiement ou retrait du compte de production.

## Conséquence pour le film

Le scénario couvre les fonctions opérationnelles listées ci-dessus. Il précise que les moyens de paiement dépendent de la configuration, montre Promotions comme « à venir » et n’affiche ni commission, ni chiffre, ni tarif fictif, ni promesse de disponibilité d’un fournisseur externe.

## Repères de code

- Définition des fonctionnalités : `artifacts/maximus/src/lib/ecommerce-features.ts`.
- Écrans d’administration : `artifacts/maximus/src/pages/ecommerce-module.tsx`.
- Routes API : `artifacts/api-server/laravel/routes/ecommerce.php`.
- Tests ciblés : `artifacts/api-server/laravel/tests/Feature/EcommerceTest.php`, `EcommerceCustomerTest.php`, `EcommerceDigitalProductTest.php`, `CarRentalTest.php` et `SellerWalletTest.php`.
