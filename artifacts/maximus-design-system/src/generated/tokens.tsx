/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens (colors as hex). Web consumes the theme via
// src/index.css; mobile (Expo) and any other platform import this object so the
// whole product shares one source of truth.
export const tokens = {
  "color": {
    "light": {
      "primary": "#ebab0a",
      "secondary": "#e8e4d9",
      "accent": "#ebab0a",
      "background": "#f6f4ef",
      "foreground": "#181f2a",
      "card": "#fdfdfc",
      "cardForeground": "#181f2a",
      "popover": "#fcfbf8",
      "popoverForeground": "#181f2a",
      "primaryForeground": "#181f2a",
      "secondaryForeground": "#181f2a",
      "muted": "#e9e6dc",
      "mutedForeground": "#596373",
      "accentForeground": "#181f2a",
      "destructive": "#c43127",
      "destructiveForeground": "#fcfbf8",
      "border": "#d8d4ca",
      "input": "#ccc5b8",
      "ring": "#ebab0a",
      "chart1": "#ebab0a",
      "chart2": "#355875",
      "chart3": "#37856d",
      "chart4": "#c97831",
      "chart5": "#a64d52",
      "sidebar": "#161c27",
      "sidebarForeground": "#f3f0e7",
      "sidebarBorder": "#303845",
      "sidebarPrimary": "#f4b20b",
      "sidebarPrimaryForeground": "#181f2a",
      "sidebarAccent": "#27303f",
      "sidebarAccentForeground": "#f3f0e7",
      "sidebarRing": "#f4b20b"
    },
    "dark": {
      "primary": "#f4b20b",
      "secondary": "#28303e",
      "accent": "#f4b20b",
      "background": "#121821",
      "foreground": "#f3f0e7",
      "card": "#1b212d",
      "cardForeground": "#f3f0e7",
      "popover": "#1b212d",
      "popoverForeground": "#f3f0e7",
      "primaryForeground": "#181f2a",
      "secondaryForeground": "#f3f0e7",
      "muted": "#28303e",
      "mutedForeground": "#bbb5a5",
      "accentForeground": "#181f2a",
      "destructive": "#db5248",
      "destructiveForeground": "#f3f0e7",
      "border": "#333b4d",
      "input": "#3d465c",
      "ring": "#f4b20b",
      "chart1": "#f4b20b",
      "chart2": "#83afd0",
      "chart3": "#63b99a",
      "chart4": "#e8a15c",
      "chart5": "#e27c7c",
      "sidebar": "#0c1017",
      "sidebarForeground": "#f3f0e7",
      "sidebarBorder": "#1f2633",
      "sidebarPrimary": "#f1a427",
      "sidebarPrimaryForeground": "#1c2435",
      "sidebarAccent": "#1b212c",
      "sidebarAccentForeground": "#f3f0e7",
      "sidebarRing": "#f1a427"
    }
  },
  "fontFamily": {
    "sans": [
      "DM Sans",
      "sans-serif"
    ],
    "serif": [
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
