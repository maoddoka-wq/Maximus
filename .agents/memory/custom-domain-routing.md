---
name: Routage domaine boutique
description: Les domaines personnalisés doivent ouvrir la vitrine sans passer par l’authentification MAXIMUS.
---

Sur un hôte qui n’est ni le domaine principal MAXIMUS ni un domaine de prévisualisation, la route `/` doit être traitée comme une boutique publique avant tout rendu de la connexion MAXIMUS. La détection de la vitrine peut ensuite charger ses données de façon asynchrone.

**Why:** Une détection uniquement dans un effet React commence avec l’état de connexion par défaut et provoque un flash visible de l’écran MAXIMUS sur les domaines de boutiques.

**How to apply:** Identifier l’hôte personnalisé de manière synchrone au premier rendu, court-circuiter les routes d’authentification, puis laisser la page boutique gérer son chargement et son erreur de domaine.