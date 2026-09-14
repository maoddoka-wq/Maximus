---
name: Fichiers e-commerce non enregistrés
description: Conservation des sélections de fichiers pendant les rafraîchissements du module e-commerce.
---

Un rafraîchissement des données de boutique peut remplacer l’objet `store`, mais il ne doit pas effacer les fichiers que l’utilisateur a sélectionnés et n’a pas encore enregistrés.

**Why:** le module recharge automatiquement son bootstrap périodiquement et après certaines mutations. Réinitialiser les états locaux à chaque nouvelle référence `store` fait disparaître un logo ou une image avant que l’utilisateur puisse cliquer sur le bouton d’enregistrement.

**How to apply:** ne réinitialiser les champs et fichiers locaux que lors d’un changement réel d’entreprise ou après une sauvegarde réussie ; conserver les sélections pendant les rafraîchissements silencieux.