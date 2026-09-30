import * as React from "react";
import { Text, type TextProps } from "react-native";
import { useColors } from "../../hooks/use-colors";
import { nativeTheme } from "../../lib/native-theme";
export interface TypographyProps extends TextProps { size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl"; weight?: "regular" | "medium" | "semibold" | "bold"; tone?: "default" | "muted" | "primary" | "destructive"; }
export function Typography({ size = "base", weight = "regular", tone = "default", style, ...props }: TypographyProps) {
  const c = useColors();
  return <Text style={[{ color: tone === "muted" ? c.mutedForeground : tone === "primary" ? c.primary : tone === "destructive" ? c.destructive : c.foreground, fontSize: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, "2xl": 24 }[size], fontFamily: nativeTheme.light.typography[weight] }, style]} {...props} />;
}