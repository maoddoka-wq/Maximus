---
name: Surveillance de santé Render
description: La sonde Render appelle déjà /api/healthz, qui peut persister les incidents sans ajouter un worker ou un cron séparé.
---

Le service web Render utilise `/api/healthz` comme health check. Cette sonde publique doit rester légère et idempotente : vérifier rapidement la disponibilité de PostgreSQL sans lancer les contrôles de schéma ni persister un incident à chaque ping. Les contrôles détaillés et la persistance des incidents restent réservés à l’administration MAXIMUS via une route authentifiée. L’URL `/api` doit aussi répondre rapidement pour les anciens contrôles de plateforme.

**Why:** Render peut appeler la sonde très fréquemment ; des requêtes de schéma et des écritures répétées ralentissent ou font redémarrer le service, ce qui rend ensuite toutes les données métier indisponibles.

**How to apply:** Garder `/api/healthz` limité à un ping DB et retourner un statut 503 uniquement si la DB est réellement inaccessible. Ajouter les nouveaux contrôles détaillés dans le service de santé et l’interface « Contrôle & coordination », sans exposer de détail sensible sur l’endpoint public.

Avec Apache en production, déclarer explicitement `index.html` comme `DirectoryIndex` et faire retomber les chemins frontend inconnus sur le shell React ; seuls `/api` et `/up` doivent passer par Laravel.

**Why:** Sans cette séparation, la racine et les routes SPA sont envoyées vers la route web Laravel, ce qui peut produire un 500 alors que l’API reste saine.

**How to apply:** Conserver la règle de routage SPA dans le `.htaccess` public et vérifier séparément `/`, une route frontend profonde, `/api/healthz` et `/up` après chaque changement d’image Render.