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

Les courses doivent passer par une affectation serveur transactionnelle, avec disponibilité chauffeur, expiration des offres, code de prise en charge et journal des transitions ; l’interface ne doit jamais être l’autorité de ces états.

**Why:** Une course Taxi engage simultanément le chauffeur et le véhicule ; une mise à jour frontend isolée peut provoquer une double affectation ou un départ sans confirmation du client.

**How to apply:** Utiliser les routes Transport d’affectation, de disponibilité et de statut, puis afficher les réponses serveur et rafraîchir le dispatch.