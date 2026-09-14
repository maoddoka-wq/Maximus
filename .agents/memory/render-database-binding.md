---
name: Liaison PostgreSQL Render
description: La production Render doit utiliser la base gérée déclarée dans render.yaml.
---

La variable de production `DATABASE_URL` doit rester liée à la base Render `maximus-postgres`, et non conserver une ancienne chaîne de connexion Neon en valeur fixe.

**Why:** Une ancienne URL Neon peut rester valide dans les variables du service alors que l’endpoint est désactivé, ce qui fait échouer les migrations au démarrage et rend `/api/healthz` indisponible.

**How to apply:** Avant un déploiement Laravel sur Render, vérifier que la base gérée est disponible et que `DATABASE_URL` provient de cette base ; après toute correction, redéployer puis contrôler `/api/healthz`.