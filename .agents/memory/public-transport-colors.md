---
name: Couleurs Transport publiques
description: Fiabilité du chargement des couleurs Transport dans une boutique publique.
---

Les couleurs propres au module Transport doivent être présentes dans le bootstrap public de la boutique et peuvent être actualisées par l’endpoint Transport ; le rendu ne doit pas dépendre uniquement d’une requête secondaire dont l’échec serait masqué.

**Why:** une erreur de slug, de domaine ou d’autorisation sur la requête secondaire faisait revenir silencieusement l’interface aux couleurs par défaut alors que les paramètres administratifs étaient correctement enregistrés.

**How to apply:** lorsqu’un réglage public spécifique est nécessaire au premier rendu, l’inclure dans le payload public initial et conserver les fallbacks explicites pour les anciennes boutiques.