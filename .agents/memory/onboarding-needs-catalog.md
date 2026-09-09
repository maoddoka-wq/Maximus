---
name: Onboarding needs catalog
description: Customer-facing onboarding choices are declarative business needs translated into technical module access.
---

Les écrans d’inscription et de configuration doivent afficher des besoins métier, jamais des modules ou packs. Chaque module peut fournir une métadonnée de besoin client ; les besoins futurs encore non activés restent décrits comme indisponibles, sans promettre un accès.

**Why:** Les modules et packs évoluent continuellement. Un écran qui associe directement une carte à un identifiant technique devient vite incompréhensible et peut conserver des choix obsolètes après une publication de catalogue.

**How to apply:** Générer les cartes depuis le catalogue publié, conserver les packs comme traduction interne, vérifier les statuts publiés/actifs à la soumission côté client et serveur, et ne garder en base que des identifiants techniques validés.