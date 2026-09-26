---
name: Identité du site public de l’entreprise
description: Règle d’isolation entre la marque commune du site d’entreprise et les permissions de ses rubriques publiques.
---

Le nom, le slug public, la marque, le logo, les images d’accueil et le domaine appartiennent au site public de l’entreprise. `/site/{slug}` ouvre directement l’accueil de marque, sans écran de choix et sans dépendre d’E-commerce. L’en-tête présente à plat les fonctionnalités publiques effectivement attribuées (par exemple Boutique, Location, Transport, Immobilier, Livraison), jamais les modules comme choix. `/shop/{slug}` reste une compatibilité technique. E-commerce ne garde que son statut, sa devise et les pièces jointes aux commandes. Ses données métier restent soumises à son activation; Transport et Immobilier gardent leurs propres accès.

**Why:** L’utilisateur a demandé que les fonctionnalités assignées s’affichent près d’« Accueil », comme sur E-commerce, plutôt que les noms des modules.

**How to apply:** Le bootstrap doit exposer uniquement les fonctionnalités publiques assignées, autorisées et réellement routables; les menus public d’entreprise et E-commerce consomment cette même liste, sans dépendre d’une boutique pour rendre l’accueil.