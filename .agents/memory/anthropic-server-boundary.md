---
name: Frontière serveur Anthropic
description: Règle de secours quand un fournisseur IA géré par Replit est indisponible.
---

Quand l’accès aux fournisseurs IA gérés par Replit est bloqué, utiliser une clé fournisseur propre uniquement côté serveur, avec une variable explicitement nommée pour ce fournisseur et une route limitée à l’administration MAXIMUS.

**Why:** Une clé Claude ne doit jamais être réutilisée sous un nom OpenAI, exposée au navigateur ou envoyée depuis un espace entreprise.

**How to apply:** Configurer la variable correspondante sur Render via son API, reconstruire le contexte depuis la session et les données serveur, puis afficher les sources et imposer une validation humaine avant toute mutation.