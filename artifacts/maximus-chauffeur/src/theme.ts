import { tokens } from '@workspace/maximus-chauffeur-design-system/tokens';
import {
  nativeTheme,
  type ColorScheme,
  type NativePalette,
} from '@workspace/maximus-chauffeur-design-system/lib/native-theme';

export type { ColorScheme } from '@workspace/maximus-chauffeur-design-system/lib/native-theme';

export const space = nativeTheme.light.spacing;
export const cardRadius = nativeTheme.light.radius.base;

export function getPalette(
  scheme: ColorScheme,
  companyPrimary?: string | null,
): NativePalette {
  const palette: NativePalette = { ...tokens.color[scheme] };

  if (companyPrimary && /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(companyPrimary)) {
    palette.primary = companyPrimary;
    palette.accent = companyPrimary;
    palette.ring = companyPrimary;
  }

  return palette;
}