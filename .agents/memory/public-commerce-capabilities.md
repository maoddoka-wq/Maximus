---
name: Configuration des vitrines publiques
description: Emplacement des réglages et autorisations des pages publiques E-commerce et Transport.
---

Les autorisations de visibilité du site public sont réglées par MAXIMUS dans la fiche centrale de l’entreprise, sous « Site public », hors de « Accès & permissions ». L’autorisation de l’accueil et celle de la bannière sont indépendantes : masquer la bannière retire tout son bloc visuel sans supprimer ses images, et l’accueil peut rester visible sans bannière. L’administrateur de l’entreprise garde la gestion du nom, de la publication, de la description, des couleurs et des images, sans contrôler ces autorisations.

Le thème public Transport reste isolé des couleurs générales de la boutique. Transport peut être publié sans E-commerce : son identité, son URL et son bootstrap publics ne doivent donc pas dépendre d’un enregistrement `ecommerce_stores`. Les anciennes URL Transport sous `/shop/{slug}/transport` peuvent être conservées comme compatibilité si une boutique existe. Location et Livraisons, en revanche, dépendent d’E-commerce.

**Why:** Certaines entreprises ont besoin d’une page d’accueil et d’une identité publiques sans vendre en ligne. MAXIMUS doit contrôler séparément l’autorisation générale, l’accueil et la bannière; conserver les images à l’arrêt évite une perte de contenu lors d’une désactivation temporaire.

**How to apply:** Garder ces trois réglages séparés et contrôlés côté serveur par MAXIMUS. Un `bannerEnabled` faux masque tout le bloc de bannière mais ne filtre ni ne supprime ses images; `homepageEnabled` contrôle uniquement l’accueil, sans couper les autres pages publiques. L’identité et le contenu restent gérés par l’entreprise. Résoudre Transport depuis son identité publique propre.