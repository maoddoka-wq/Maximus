import { tokens } from "../generated/tokens";

export type NativePalette = {
  -readonly [K in keyof typeof tokens.color.light]: string;
};

const toNumber = (value: string) =>
  value.endsWith("rem") ? Number.parseFloat(value) * 16 : Number.parseFloat(value);

export const nativeTheme = {
  light: {
    colors: tokens.color.light,
    radius: { base: toNumber(tokens.radius), sm: toNumber(tokens.radius) * 0.75, lg: toNumber(tokens.radius) * 1.5 },
    spacing: { base: toNumber(tokens.spacing), xs: toNumber(tokens.spacing), sm: toNumber(tokens.spacing) * 2, md: toNumber(tokens.spacing) * 4, lg: toNumber(tokens.spacing) * 6, xl: toNumber(tokens.spacing) * 8 },
    typography: { sans: "DMSans_400Regular", regular: "DMSans_400Regular", medium: "DMSans_500Medium", semibold: "DMSans_600SemiBold", bold: "DMSans_700Bold", mono: "Space Mono" },
  },
  dark: {
    colors: tokens.color.dark,
    radius: { base: toNumber(tokens.radius), sm: toNumber(tokens.radius) * 0.75, lg: toNumber(tokens.radius) * 1.5 },
    spacing: { base: toNumber(tokens.spacing), xs: toNumber(tokens.spacing), sm: toNumber(tokens.spacing) * 2, md: toNumber(tokens.spacing) * 4, lg: toNumber(tokens.spacing) * 6, xl: toNumber(tokens.spacing) * 8 },
    typography: { sans: "DMSans_400Regular", regular: "DMSans_400Regular", medium: "DMSans_500Medium", semibold: "DMSans_600SemiBold", bold: "DMSans_700Bold", mono: "Space Mono" },
  },
} as const;

export type NativeTheme = typeof nativeTheme.light;
export type ColorScheme = keyof typeof nativeTheme;

/** Resolves a palette and applies the same company-primary override to all primary roles. */
export function resolveNativePalette(
  scheme: ColorScheme = "light",
  companyPrimary?: string | null,
): NativePalette {
  const palette: NativePalette = { ...nativeTheme[scheme].colors };
  if (companyPrimary && /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(companyPrimary)) {
    palette.primary = companyPrimary;
    palette.accent = companyPrimary;
    palette.ring = companyPrimary;
    palette.chart1 = companyPrimary;
  }
  return palette;
}