import { tokens } from '@workspace/maximus-design-system/tokens';

export type ColorScheme = 'light' | 'dark';

const spacingUnit = Number.parseFloat(tokens.spacing) * 16;

export const space = {
  xs: spacingUnit,
  sm: spacingUnit * 2,
  md: spacingUnit * 4,
  lg: spacingUnit * 6,
  xl: spacingUnit * 8,
  xxl: spacingUnit * 10,
} as const;

export const cardRadius = Number.parseFloat(tokens.radius) * 16;

export function getPalette(scheme: ColorScheme, companyPrimary?: string | null) {
  const base = scheme === 'dark' ? tokens.color.dark : tokens.color.light;
  const brandPrimary =
    companyPrimary && /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(companyPrimary)
      ? companyPrimary
      : base.primary;

  return {
    ...base,
    primary: brandPrimary,
    accent: brandPrimary,
    ring: brandPrimary,
  };
}