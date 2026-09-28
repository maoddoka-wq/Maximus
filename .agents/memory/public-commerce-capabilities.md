---
name: Configuration des vitrines publiques
description: Emplacement des réglages et autorisations des pages publiques E-commerce et Transport.
---

Les réglages généraux de la page d’accueil publique sont gérés dans « Site public » et restent accessibles à l’administrateur de l’entreprise sans module E-commerce. La description, les couleurs et les images du bandeau réutilisent les données de vitrine et la galerie existantes pour conserver la compatibilité du bootstrap public ; `homepageEnabled` vaut vrai par défaut et ne remplace pas l’autorisation MAXIMUS de publication du site entier.

Le thème public Transport reste isolé des couleurs générales de la boutique. Transport peut être publié sans E-commerce : son identité, son URL et son bootstrap publics ne doivent donc pas dépendre d’un enregistrement `ecommerce_stores`. Les anciennes URL Transport sous `/shop/{slug}/transport` peuvent être conservées comme compatibilité si une boutique existe. Location et Livraisons, en revanche, dépendent d’E-commerce.

**Why:** Certaines entreprises ont besoin d’une page d’accueil et d’une identité publiques sans vendre en ligne. La publication du site entier, l’affichage de la page d’accueil, les capacités E-commerce et le thème Transport répondent à des droits distincts ; les confondre peut masquer une vitrine valide ou exposer un module non autorisé.

**How to apply:** Protéger les réglages généraux par l’identité d’administrateur entreprise et le périmètre tenant côté serveur, pas par les permissions du module E-commerce. Garder l’accès public global sous contrôle MAXIMUS, traiter `homepageEnabled` comme un simple réglage de navigation, et résoudre Transport depuis son identité publique propre.