---
name: Aperçus sociaux des boutiques publiques
description: Les métadonnées de partage doivent être rendues côté serveur avec des images publiques et absolues.
---

Les pages publiques de boutique et de produit doivent recevoir leurs balises Open Graph/Twitter dans le HTML initial côté serveur ; les données React chargées après coup ne sont pas suffisantes pour les robots sociaux.

**Why:** WhatsApp, Facebook et Messenger peuvent lire le HTML sans exécuter JavaScript, alors que la boutique fonctionne normalement après ouverture dans un navigateur.

**How to apply:** Générer le titre, la description, l’URL canonique et une `og:image` HTTPS publique depuis les données du tenant. Utiliser un fallback MAXIMUS public quand aucune image n’existe et laisser l’API d’images sans authentification.