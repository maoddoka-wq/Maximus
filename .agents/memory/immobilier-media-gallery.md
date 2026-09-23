---
name: Galeries Immobilier multimédias
description: Décision de stockage et de représentation des photos et vidéos des biens et annonces Immobilier.
---

Les galeries des biens et des annonces Immobilier réutilisent la table de galerie persistante du e-commerce avec des types de propriétaires dédiés. Chaque média conserve son MIME et l’interface affiche les vidéos comme des éléments de galerie, pas comme des images.

**Why:** Cela évite deux systèmes de téléversement concurrents et garantit que les médias ajoutés depuis l’espace entreprise restent disponibles dans la vitrine publique après actualisation.

**How to apply:** Pour toute évolution de galerie Immobilier, conserver l’isolation par entreprise et propriétaire, valider séparément les formats image/vidéo et dériver le rendu du MIME plutôt que de l’extension du fichier.