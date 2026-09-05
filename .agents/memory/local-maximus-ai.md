---
name: Assistant IA métier local
description: Contrainte produit pour l’assistant de configuration d’entreprise MAXIMUS.
---

L’assistant de configuration MAXIMUS doit rester une intelligence métier locale, fondée sur le catalogue, les dépendances et les règles de permissions du projet, sans appel à une API de modèle externe. Il produit d’abord un brouillon contrôlable ; l’application ne se fait qu’après validation et doit réutiliser les garde-fous existants.

**Why:** L’utilisateur veut sa propre IA, sans dépendance à un fournisseur externe ni exposition de données d’organisation.

**How to apply:** Toute évolution de l’assistant doit enrichir le moteur local et conserver la validation du catalogue, le périmètre entreprise/secteur et la confirmation avant mutation.