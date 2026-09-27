import { tokens } from '@workspace/maximus-design-system/tokens';

function nativeLength(value: string): number {
  return Number.parseFloat(value) * 16;
}

const colors = {
  light: {
    ...tokens.color.light,
    text: tokens.color.light.foreground,
    tint: tokens.color.light.primary,
    icon: tokens.color.light.mutedForeground,
    tabIconDefault: tokens.color.light.mutedForeground,
    tabIconSelected: tokens.color.light.primary,
  },
  dark: {
    ...tokens.color.dark,
    text: tokens.color.dark.foreground,
    tint: tokens.color.dark.primary,
    icon: tokens.color.dark.mutedForeground,
    tabIconDefault: tokens.color.dark.mutedForeground,
    tabIconSelected: tokens.color.dark.primary,
  },
  radius: nativeLength(tokens.radius),
  spacing: nativeLength(tokens.spacing),
};

export const radius = colors.radius;
export const spacing = colors.spacing;
export default colors;
