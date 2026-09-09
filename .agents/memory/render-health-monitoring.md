---
name: Surveillance de santé Render
description: La sonde Render appelle déjà /api/healthz, qui peut persister les incidents sans ajouter un worker ou un cron séparé.
---

Le service web Render utilise `/api/healthz` comme health check. La surveillance MAXIMUS doit donc exécuter les contrôles de disponibilité depuis cette route, enregistrer les incidents uniquement quand PostgreSQL est accessible, et exposer le détail à l’administration MAXIMUS via une route authentifiée.

**Why:** Cette intégration fournit une détection automatique avec le service Render existant et évite de multiplier les processus de production.

**How to apply:** Lorsqu’un nouveau contrôle critique est ajouté, l’inclure dans le service de santé et dans l’interface « Contrôle & coordination », sans exposer de détail sensible sur l’endpoint public.