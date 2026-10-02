---
name: Carte chauffeur en direct
description: Politique de fraîcheur des positions sur la carte native de course et de repli des tuiles.
---

Sur la carte d’une course, afficher une position du chauffeur issue du GPS local au premier plan, seulement après son acceptation par l’API. Expirer le point après 45 secondes pour un cycle d’envoi de 15 secondes, et le supprimer quand le suivi est suspendu. Ne pas remplacer une position absente ou expirée par le bootstrap serveur. Garder l’ordre GeoJSON `[longitude, latitude]` et privilégier CARTO avant OSM, avec attribution.

**Why:** L’aperçu a montré une tuile OSM contenant « Access blocked » qui était pourtant chargée comme une image valide; les coordonnées bootstrap peuvent aussi rester anciennes et sembler actuelles.

**How to apply:** Pour toute évolution de cette carte, préserver le relevé réel et sa fraîcheur, le repli de tuiles et les tests d’ordre des coordonnées. Ne jamais afficher de coordonnées inventées ni présenter un point expiré comme une position GPS actuelle.