---
name: Frontière serveur IA Replit sur Render
description: Règles pour utiliser l’intégration IA Replit depuis le Laravel déployé sur Render.
---

L’intégration IA Replit est consommée côté serveur par l’API OpenAI-compatible, avec les variables `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY` et un modèle explicite. Ces variables peuvent être synchronisées vers le service Render via son API sans exposer leur valeur.

**Why:** Le navigateur et les espaces entreprise ne doivent jamais recevoir les credentials IA ; MAXI reste réservé à l’administration principale et l’onboarding doit conserver un contrôle humain.

**How to apply:** Utiliser `/chat/completions`, reconstruire le contexte depuis la session et les données serveur, gérer les erreurs de crédits explicitement, puis valider la production après redéploiement.