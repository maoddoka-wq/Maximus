---
name: En-têtes de sécurité
description: Règles communes pour sécuriser les réponses publiques de MAXIMUS
---

Les réponses publiques doivent envoyer une CSP restrictive compatible avec les polices Google utilisées, HSTS en production, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` et `Referrer-Policy: strict-origin-when-cross-origin`. Le frontend statique servi par Render reçoit ces en-têtes via le routeur PHP, tandis que l’API Laravel les ajoute par middleware.

**Why:** Un audit HTTP externe a signalé l’absence de ces protections sur le domaine public.

**How to apply:** Après toute modification des ressources externes du frontend, vérifier la CSP et relancer un audit HTTP après publication. Ne pas activer HSTS sur les environnements locaux non HTTPS.