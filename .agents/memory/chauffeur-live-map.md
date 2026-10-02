---
name: Carte chauffeur en direct
description: Politique de fraîcheur des positions sur la carte native de course et de repli des tuiles.
---

Sur la carte d’une course, afficher une position du chauffeur issue du GPS local au premier plan, seulement après son acceptation par l’API. Expirer le point après 45 secondes pour un cycle d’envoi de 15 secondes, et le supprimer quand le suivi est suspendu. Ne pas remplacer une position absente ou expirée par le bootstrap serveur. Garder l’ordre GeoJSON `[longitude, latitude]`. Utiliser les tuiles publiques OpenStreetMap comme sur la carte client, avec attribution et essais de sous-domaines OSM, sans CARTO ni clé de carte.

**Why:** Les cartes chauffeur et client doivent afficher le même fond sans clé. CARTO a renvoyé une image « API KEY REQUIRED » chargée comme une réponse valide, empêchant la détection d’erreur; l’ancien bootstrap peut aussi sembler actuel après expiration du GPS.

**How to apply:** Pour toute évolution de cette carte, garder `expo-location` pour le GPS matériel du chauffeur et synchroniser sa position via l’API de transport pour les clients. Garder OSM et ses sous-domaines, puis montrer l’état « carte indisponible » si toutes les tuiles échouent. Ne jamais afficher de coordonnées inventées ni présenter un point expiré comme actuel.