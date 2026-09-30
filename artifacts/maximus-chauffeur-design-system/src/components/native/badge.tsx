import * as React from "react";
import { Text, View, type ViewProps } from "react-native";
import { useColors } from "../../hooks/use-colors";
import { nativeTheme, type NativePalette } from "../../lib/native-theme";

export interface BadgeProps extends ViewProps {
  variant?: "default" | "secondary" | "destructive" | "outline";
  children?: React.ReactNode;
  companyPrimary?: string | null;
  colors?: NativePalette;
}

export function Badge({
  variant = "default",
  children,
  style,
  companyPrimary,
  colors,
  ...props
}: BadgeProps) {
  const systemColors = useColors(companyPrimary);
  const palette = colors ?? systemColors;
  const filled = variant !== "outline";
  const backgroundColor =
    variant === "destructive"
      ? palette.destructive
      : variant === "secondary"
        ? palette.secondary
        : palette.primary;
  const foregroundColor =
    variant === "secondary"
      ? palette.secondaryForeground
      : filled
        ? palette.primaryForeground
        : palette.foreground;

  return (
    <View
      style={[
        {
          alignSelf: "flex-start",
          borderRadius: nativeTheme.light.radius.sm,
          borderWidth: 1,
          borderColor: filled ? backgroundColor : palette.border,
          backgroundColor: filled ? backgroundColor : "transparent",
          paddingHorizontal: nativeTheme.light.spacing.sm,
          paddingVertical: nativeTheme.light.spacing.xs,
        },
        style,
      ]}
      {...props}
    >
      <Text
        style={{
          color: foregroundColor,
          fontSize: 12,
          fontFamily: nativeTheme.light.typography.semibold,
        }}
      >
        {children}
      </Text>
    </View>
  );
}