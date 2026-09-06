---
name: Browser navigation
description: MAXIMUS navigation behavior for browser back, desktop back buttons, and mobile back gestures.
---

Internal navigation must use real History API entries so browser back, desktop navigation controls, mobile back gestures, and the visible application Back button resolve to the same previous view. Direct deep links need a safe dashboard fallback instead of leaving the application unexpectedly.

**Why:** Fixed-path return buttons break the user's navigation context, especially when a user opened a page through a module tab, browser history, or a mobile gesture.

**How to apply:** Route internal links through the centralized navigation callback, keep a marked MAXIMUS history index, call `history.back()` when an in-app entry exists, and only use a dashboard fallback for the first/direct entry.

Pour une navigation interne qui modifie uniquement la query string, utiliser le
navigateur Wouter et ses options `replace/state` plutôt que d’appeler
directement `history.pushState` puis de simuler un événement.

**Why:** Wouter observe déjà les méthodes History API ; déclencher manuellement
un second événement peut provoquer un rendu intermédiaire et faire attendre le
premier clic avant que le détail soit affiché.

**How to apply:** Conserver la query dans l’URL, passer l’état d’historique à
`setLocation`, et laisser Wouter synchroniser `useSearch`.

Les vues de catalogue ouvertes par query string doivent dériver leur élément
sélectionné de `useSearch`, sans conserver une seconde copie locale de cet
identifiant.

**Why:** Une synchronisation bidirectionnelle URL/état local peut consommer le
premier clic lorsqu’un rendu intermédiaire réapplique l’ancienne query.

**How to apply:** Faire de la query la source de vérité pour le détail ouvert ;
les actions modifient l’URL via Wouter, puis le rendu suit cette URL.