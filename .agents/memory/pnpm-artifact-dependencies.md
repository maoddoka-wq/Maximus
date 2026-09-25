---
name: pnpm artifact dependencies
description: Installing package dependencies in this pnpm workspace when a generic installer defaults to the workspace root.
---

For a dependency used by one artifact, install it into that artifact workspace with `pnpm add --filter @workspace/<artifact> ...` and use the workspace catalog when available. Verify both the artifact manifest and lockfile.

**Why:** The generic Replit language-package installer attempted to add a package at the monorepo root and was rejected by pnpm's workspace-root guard; the filtered install correctly updated the artifact.

**How to apply:** When an artifact script cannot resolve a package, add the dependency to that artifact rather than relying on a sibling package or the workspace root.