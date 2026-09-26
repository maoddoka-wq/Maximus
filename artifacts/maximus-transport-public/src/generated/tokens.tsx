/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens (colors as hex). Web consumes the theme via
// src/index.css; mobile (Expo) and any other platform import this object so the
// whole product shares one source of truth.
export const tokens = {
  "color": {
    "light": {
      "background": "#f2f3ef",
      "foreground": "#18212b",
      "border": "#d9dcd6",
      "card": "#fffefa",
      "cardForeground": "#18212b",
      "popover": "#fffefa",
      "popoverForeground": "#18212b",
      "primary": "#f2b705",
      "primaryForeground": "#18212b",
      "secondary": "#e4e8e1",
      "secondaryForeground": "#18212b",
      "muted": "#edf0eb",
      "mutedForeground": "#59636b",
      "accent": "#161d27",
      "accentForeground": "#f4f6f2",
      "destructive": "#b42318",
      "destructiveForeground": "#fff5f2",
      "input": "#c7cdc6",
      "ring": "#8a5c00",
      "chart1": "#c38800",
      "chart2": "#335a73",
      "chart3": "#3b7c69",
      "chart4": "#cc6a43",
      "chart5": "#6874a4",
      "sidebar": "#161d27",
      "sidebarForeground": "#f4f6f2",
      "sidebarBorder": "#30404d",
      "sidebarPrimary": "#f2b705",
      "sidebarPrimaryForeground": "#18212b",
      "sidebarAccent": "#263747",
      "sidebarAccentForeground": "#f4f6f2",
      "sidebarRing": "#ffd34d"
    },
    "dark": {
      "background": "#111821",
      "foreground": "#f4f6f2",
      "border": "#35414c",
      "card": "#19232d",
      "cardForeground": "#f4f6f2",
      "popover": "#1d2934",
      "popoverForeground": "#f4f6f2",
      "primary": "#ffd34d",
      "primaryForeground": "#18212b",
      "secondary": "#26323c",
      "secondaryForeground": "#f4f6f2",
      "muted": "#202b35",
      "mutedForeground": "#aab4b9",
      "accent": "#30495b",
      "accentForeground": "#f5f7f4",
      "destructive": "#9e342d",
      "destructiveForeground": "#ffefeb",
      "input": "#3b4954",
      "ring": "#ffd34d",
      "chart1": "#ffd34d",
      "chart2": "#77b4d6",
      "chart3": "#62bf99",
      "chart4": "#ff9b72",
      "chart5": "#a6a9e4",
      "sidebar": "#0d141c",
      "sidebarForeground": "#f4f6f2",
      "sidebarBorder": "#27343f",
      "sidebarPrimary": "#ffd34d",
      "sidebarPrimaryForeground": "#18212b",
      "sidebarAccent": "#1d2c38",
      "sidebarAccentForeground": "#f4f6f2",
      "sidebarRing": "#ffd34d"
    }
  },
  "fontFamily": {
    "sans": [
      "DM Sans",
      "sans-serif"
    ],
    "serif": [
      "Lora",
      "Georgia",
      "serif"
    ],
    "mono": [
      "Space Mono",
      "monospace"
    ]
  },
  "radius": "0.8rem",
  "spacing": "0.25rem"
} as const;

export type Tokens = typeof tokens;
export default tokens;
