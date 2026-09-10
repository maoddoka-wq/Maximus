---
name: Affichage du téléchargement numérique
description: Règle d’affichage du téléchargement dans l’espace client après paiement.
---

Dans l’espace client, afficher le bouton de téléchargement quand la ligne est numérique et que la commande est `PAID`. Ne pas conditionner son affichage à une URL optionnelle déjà renvoyée par l’API ; l’endpoint protégé construit l’accès à partir de la commande et de la ligne.

**Why:** une réponse de commande peut être valide sans `downloadUrl` prérempli, alors que l’accès téléchargeable reste déterministe et doit être contrôlé côté serveur.

**How to apply:** après le retour de paiement, recharger les données client afin d’obtenir le statut final, puis laisser l’API vérifier session, entreprise, commande payée, ligne numérique et fichier avant de servir le téléchargement.