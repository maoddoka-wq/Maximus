import * as React from "react";
import { Text, type TextProps } from "react-native";
import { useColors } from "../../hooks/use-colors";
import { nativeTheme, type NativePalette } from "../../lib/native-theme";

export interface TypographyProps extends TextProps {
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl";
  weight?: "regular" | "medium" | "semibold" | "bold";
  tone?: "default" | "muted" | "primary" | "destructive";
  companyPrimary?: string | null;
  colors?: NativePalette;
}

export function Typography({
  size = "base",
  weight = "regular",
  tone = "default",
  style,
  companyPrimary,
  colors,
  ...props
}: TypographyProps) {
  const systemColors = useColors(companyPrimary);
  const palette = colors ?? systemColors;
  const textColor =
    tone === "muted"
      ? palette.mutedForeground
      : tone === "primary"
        ? palette.primary
        : tone === "destructive"
          ? palette.destructive
          : palette.foreground;

  return (
    <Text
      style={[
        {
          color: textColor,
          fontSize: {
            xs: 12,
            sm: 14,
            base: 16,
            lg: 18,
            xl: 20,
            "2xl": 24,
          }[size],
          fontFamily: nativeTheme.light.typography[weight],
        },
        style,
      ]}
      {...props}
    />
  );
}