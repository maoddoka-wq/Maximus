---
name: Fournisseur IA Replit
description: Règle de choix et de sécurité du fournisseur IA pour MAXIMUS.
---

Utiliser en priorité l’intégration IA gérée par Replit côté serveur, sans clé personnelle dans le frontend. Un fournisseur externe ne peut servir de secours qu’avec une configuration explicite côté serveur et des routes limitées à l’administration MAXIMUS.

**Why:** L’intégration Replit évite de dépendre des crédits d’un fournisseur personnel et conserve les credentials hors du navigateur ; une clé Claude ne doit jamais être réutilisée sous un nom OpenAI.

**How to apply:** Utiliser les variables `AI_INTEGRATIONS_OPENAI_*` dans le backend, reconstruire le contexte depuis la session et les données serveur, puis afficher les sources et imposer une validation humaine avant toute mutation.