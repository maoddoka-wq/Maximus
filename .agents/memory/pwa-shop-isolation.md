---
name: Isolation des PWA boutiques
description: Contraintes d’installation de plusieurs boutiques sur une même origine navigateur
---

Deux boutiques installées depuis la même origine ne doivent jamais dépendre d’un start_url, d’un identifiant d’application ou d’une clé d’état client globale. Le lancement doit encoder la boutique dans son chemin, et les paniers, retours de paiement et autres états locaux doivent être indexés par cette boutique. Les sessions HTTP doivent également utiliser un chemin de cookie propre à la boutique quand plusieurs boutiques partagent l’hôte.

**Why:** Les installations PWA d’une même origine partagent le stockage, les cookies et le service worker. Une identité globale basée sur la dernière boutique visitée ouvre la boutique incorrecte après l’installation ou le lancement d’une autre.

**How to apply:** Pour une boutique par slug, utiliser un start_url/id/scope sous `/client-app/shop/<slug>/`. Pour un domaine personnalisé, conserver `/client-app/`, car l’origine est déjà distincte. Ne jamais utiliser une seule clé localStorage pour choisir la boutique courante.

Chaque navigation interne d’une PWA boutique doit conserver `/client-app/shop/<slug>/` avant son sous-chemin (`panier`, `produit`, `compte`, etc.) ; le parseur doit reconnaître ces sous-chemins, pas seulement l’accueil.

**Why:** Perdre le slug lors d’un clic fait sortir la route du périmètre boutique. Le routeur général peut alors afficher l’administration si une session MAXIMUS existe.

**How to apply:** Construire les liens PWA avec un helper partagé et tester au minimum l’accueil, un produit, le panier et une commande client.

Les installations créées avec l’ancien `/client-app/` ne portent aucune information permettant de retrouver leur boutique d’origine. Elles doivent être désinstallées puis recréées depuis le lien public de la boutique après publication de la nouvelle version.