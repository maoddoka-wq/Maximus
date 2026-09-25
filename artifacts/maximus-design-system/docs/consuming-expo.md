# Consuming MAXIMUS Design System in Expo apps

Read `artifacts/maximus-design-system/docs/AGENTS.md` first. React Native does
not consume the web CSS or DOM components.

## Current package boundary

The package currently exports portable design tokens and web components. It
does not yet export a native theme, font hooks, or React Native components.
Expo apps may read the shared tokens:

```tsx
import { tokens } from "@workspace/maximus-design-system/tokens";
```

Do not import `styles.css`, `components/ui/*`, or `components/native/*` into an
Expo app. The first two are web-only, and the native component paths are not
published yet. Keep Expo's native theme and controls local until native
equivalents are implemented and exported by this package.
