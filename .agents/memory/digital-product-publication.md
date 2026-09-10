---
name: Publication des produits numériques
description: Séquencement requis pour enregistrer et publier un produit numérique avec son fichier privé.
---

Un produit numérique doit être créé ou mis à jour en brouillon avant l’envoi du fichier. Après confirmation de l’upload, il peut être publié si l’utilisateur avait choisi le statut publié.

**Why:** l’API protège la vitrine contre un produit numérique publié sans fichier téléchargeable ; une requête de création directement publiée est donc rejetée avant que l’upload séparé puisse avoir lieu.

**How to apply:** dans tout nouveau parcours numérique, conserver l’ordre création/mise à jour brouillon → upload privé → publication conditionnelle, et ne fermer le formulaire que si chaque étape nécessaire a réussi.