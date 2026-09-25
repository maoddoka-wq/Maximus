# Migrating Expo UI to MAXIMUS Design System

Read `artifacts/maximus-design-system/docs/AGENTS.md` and
`artifacts/maximus-design-system/docs/consuming-expo.md` first.

## Current package boundary

The package currently exports shared tokens and web-only components. It does
not yet export a native theme, font hooks, or React Native controls, so a full
Expo migration is not ready.

- Keep app-local native colors, hooks, fonts, and controls.
- Do not import web `components/ui/*`, `styles.css`, or DOM/Tailwind code into
  React Native.
- Do not delete local UI in anticipation of native exports that do not exist.

Only the portable tokens are currently shared:

```tsx
import { tokens } from "@workspace/maximus-design-system/tokens";
```

Update this guide after native theme, hook, and component exports are actually
implemented and verified in the package. Then migrate only the app-owned
presentational layer; keep product-specific compositions in Expo.
