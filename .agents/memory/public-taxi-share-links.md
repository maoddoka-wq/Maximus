---
name: Liens de suivi Taxi
description: Sécurité et périmètre des liens de suivi publics Taxi.
---

Un lien de suivi public Taxi utilise un jeton aléatoire distinct du jeton d’annulation. Le serveur ne conserve que son hash, le jeton brut reste dans le fragment de l’URL et le client le transmet dans un en-tête. La réponse de suivi est une liste blanche sans coordonnées personnelles, code de prise en charge ni capacité de mutation, bornée à l’entreprise, à la course et à une expiration.

**Why:** Réutiliser le jeton d’annulation ou placer un jeton porteur dans le chemin ou la query exposerait une capacité plus large dans l’historique, les journaux et les référents.

**How to apply:** Pour toute extension de partage Taxi, conserver deux capacités séparées, limiter les champs retournés et garder les lectures hors cache.