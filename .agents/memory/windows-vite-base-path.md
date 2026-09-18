---
name: Chemin Vite sous Windows
description: Conversion MSYS de BASE_PATH et diagnostic des erreurs MIME de l’installation locale.
---

Pour une installation Windows servie à la racine, transmettre `BASE_PATH=/` depuis PowerShell natif lors de la construction frontend, sans passer par Git Bash.

**Why:** Un build local exécuté via le parcours shell a produit des URLs `/Program Files/Git/assets/` dans le HTML, signature de la conversion MSYS de `/`. Le routeur SPA renvoyait alors du HTML pour les modules JavaScript, entraînant une page blanche malgré des connexions PHP acceptées.

**How to apply:** Inspecter les URLs script/modulepreload du HTML réellement servi avant de reconstruire. Corriger la base à la construction et recopier l’ensemble du build ; ne pas corriger seulement le HTML, car la base peut aussi être intégrée dans le JavaScript et le routeur client.