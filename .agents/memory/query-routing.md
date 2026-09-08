---
name: Routage avec paramètres
description: Règle de routage pour les pages dont les onglets utilisent des paramètres URL.
---

Les routeurs d’espace doivent extraire le chemin avant de comparer une route. Les paramètres de requête servent aux onglets, filtres et sous-vues et ne doivent pas transformer une page reconnue en vue introuvable.

**Why:** Le banc de test administratif réutilise les composants Commerce, qui écrivent `?tab=...` dans l’URL courante. Un routeur qui compare l’URL complète renvoie alors une 404 dès qu’un onglet est ouvert.

**How to apply:** Utiliser une valeur équivalente à `location.split('?')[0]` pour sélectionner la vue, tout en laissant le composant concerné lire les paramètres nécessaires. Avec Wouter 3, `useLocation()` renvoie le pathname sans la query string : utiliser `useSearch()` pour les paramètres de retour, filtres ou onglets. Retirer aussi les slashs finaux avant la comparaison, car une actualisation peut préserver une URL profonde sous la forme `/route/`.