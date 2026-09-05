---
name: Browser navigation
description: MAXIMUS navigation behavior for browser back, desktop back buttons, and mobile back gestures.
---

Internal navigation must use real History API entries so browser back, desktop navigation controls, mobile back gestures, and the visible application Back button resolve to the same previous view. Direct deep links need a safe dashboard fallback instead of leaving the application unexpectedly.

**Why:** Fixed-path return buttons break the user's navigation context, especially when a user opened a page through a module tab, browser history, or a mobile gesture.

**How to apply:** Route internal links through the centralized navigation callback, keep a marked MAXIMUS history index, call `history.back()` when an in-app entry exists, and only use a dashboard fallback for the first/direct entry.