---
name: Transport Taxi boundary
description: Règles durables pour le module Transport et son cycle Taxi.
---

Le module Transport/Taxi possède son propre cycle métier et ses propres ressources tenant-scoped ; il ne réutilise pas les véhicules ni les réservations du module Location e-commerce.

**Why:** Les courses Taxi ont une affectation chauffeur-véhicule, des statuts opérationnels et une remise en disponibilité de flotte différents d’une réservation de location.

**How to apply:** Toute extension Transport doit rester sous le module `transport`, avec les permissions `overview`, `trips`, `drivers`, `vehicles`, et conserver l’isolation par entreprise côté serveur.

Les identifiants de fonctionnalités Transport sont canoniques (`overview`, `trips`, `drivers`, `vehicles`) et ne doivent pas être reconstruits depuis les libellés affichés (`Vue d’ensemble`, `Courses`, `Chauffeurs`, `Véhicules`).

**Why:** La synchronisation des rôles de secteur dépend des identifiants stables des packs ; dériver des slugs depuis les libellés supprimait les permissions détaillées des rôles Taxi.

**How to apply:** Utiliser la définition partagée des fonctionnalités pour les packs, les secteurs, les rôles et les onglets, puis conserver les libellés uniquement pour l’affichage.