---
name: Carte chauffeur en direct
description: Politique de fraîcheur des positions sur la carte native de course et de repli des tuiles.
---

Sur la carte d’une course, afficher une position du chauffeur issue du GPS local au premier plan, seulement après son acceptation par l’API. Expirer le point après 45 secondes pour un cycle d’envoi de 15 secondes, et le supprimer quand le suivi est suspendu. Ne pas remplacer une position absente ou expirée par le bootstrap serveur. Garder l’ordre GeoJSON `[longitude, latitude]`. Utiliser exactement `https://tile.openstreetmap.org/{z}/{x}/{y}.png` sur web et natif, sans sous-domaines `a/b/c`, avec attribution visible, un User-Agent natif qui identifie l’application et le cache HTTP normal.

**Why:** L’application chauffeur affichait des tuiles 403 tout en dessinant correctement les trajets; la politique OSM actuelle exige l’hôte canonique et avertit que les alias peuvent être retirés. CARTO a déjà renvoyé une image « API KEY REQUIRED » chargée comme une réponse valide.

**How to apply:** Pour toute évolution de cette carte, garder `expo-location` pour le GPS matériel du chauffeur et synchroniser sa position via l’API de transport pour les clients. Partager l’URL canonique des tuiles entre chauffeur et client; diagnostiquer séparément une erreur de fond de carte et un problème de coordonnées. Ne jamais afficher de coordonnées inventées ni présenter un point expiré comme actuel.

La carte native doit permettre le déplacement à un doigt et le zoom à deux doigts, avec des contrôles accessibles. Après une manipulation, les mises à jour GPS continuent à déplacer le marqueur sans imposer un nouveau cadrage ; seul le recadrage explicite reprend le cadrage automatique de la course.

**Why:** L’utilisateur a signalé que la carte native n’était pas maniable et ne pouvait pas être zoomée. Un recadrage automatique à chaque position annulerait immédiatement la manipulation.

**How to apply:** Séparer le cadrage de la carte des coordonnées GPS réelles. Conserver les gestes en carte intégrée et en plein écran, sans modifier les règles de suivi GPS au premier plan.