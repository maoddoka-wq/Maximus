---
name: Cache des chunks Vite sur Render
description: Défauts de cache et de fallback Apache qui font échouer les imports différés après un déploiement Render.
---

Sur Render, un asset Vite manquant ne doit jamais tomber sur le fallback SPA : renvoyer une vraie 404 pour `/assets/*` inconnu et ne pas mettre `index.html` en cache. Une ancienne page peut demander un chunk supprimé après un déploiement; répondre `200 text/html` à cette URL fait échouer l’import dynamique côté navigateur sans erreur serveur utile.

**Why:** Le fallback Apache a été observé renvoyant `200 text/html` pour un JavaScript inexistant, sans en-tête `Cache-Control`; l’erreur disparaissait après actualisation parce que la page obtenait alors un ensemble cohérent de chunks.

**How to apply:** Pour une erreur frontend qui disparaît après actualisation et sans 5xx Render, vérifier le statut et le type MIME des URLs `/assets/*`, les en-têtes de cache de `index.html`, puis garder une reprise automatique unique pour `vite:preloadError` afin d’éviter toute boucle.