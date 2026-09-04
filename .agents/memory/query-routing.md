---
name: Routage avec paramètres
description: Règle de routage pour les pages dont les onglets utilisent des paramètres URL.
---

Les routeurs d’espace doivent extraire le chemin avant de comparer une route. Les paramètres de requête servent aux onglets, filtres et sous-vues et ne doivent pas transformer une page reconnue en vue introuvable.

**Why:** Le banc de test administratif réutilise les composants Commerce, qui écrivent `?tab=...` dans l’URL courante. Un routeur qui compare l’URL complète renvoie alors une 404 dès qu’un onglet est ouvert.

**How to apply:** Utiliser une valeur équivalente à `location.split('?')[0]` pour sélectionner la vue, tout en laissant le composant concerné lire les paramètres nécessaires.