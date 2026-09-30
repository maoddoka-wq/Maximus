import * as React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
  type ViewStyle,
} from "react-native";
import { useColors } from "../../hooks/use-colors";
import { nativeTheme, type NativePalette } from "../../lib/native-theme";

export type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
export type ButtonSize = "default" | "sm" | "lg" | "icon";
export interface ButtonProps extends PressableProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  label?: string;
  companyPrimary?: string | null;
  colors?: NativePalette;
}

export function Button({
  variant = "default",
  size = "default",
  loading,
  disabled,
  children,
  style,
  companyPrimary,
  colors,
  ...props
}: ButtonProps) {
  const systemColors = useColors(companyPrimary);
  const palette = colors ?? systemColors;
  const filled = variant === "default" || variant === "destructive" || variant === "secondary";
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
        : variant === "link"
          ? palette.primary
          : palette.foreground;

  const styleFor = (pressed: boolean): ViewStyle => ({
    minHeight: size === "lg" ? 48 : size === "sm" ? 36 : 44,
    paddingHorizontal: size === "icon" ? 0 : size === "lg" ? 32 : size === "sm" ? 12 : 16,
    width: size === "icon" ? 44 : undefined,
    borderRadius: nativeTheme.light.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderWidth: variant === "outline" || variant === "secondary" ? 1 : 0,
    borderColor: variant === "outline" ? palette.border : backgroundColor,
    backgroundColor: filled ? backgroundColor : "transparent",
    opacity: disabled || loading ? 0.5 : pressed ? 0.8 : 1,
  });

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        styleFor(pressed),
        typeof style === "function" ? style({ pressed }) : style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={filled ? palette.primaryForeground : palette.primary} />
      ) : typeof children === "string" ? (
        <Text
          style={{
            color: foregroundColor,
            fontSize: size === "sm" ? 12 : 14,
            fontFamily: nativeTheme.light.typography.semibold,
            textDecorationLine: variant === "link" ? "underline" : "none",
          }}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}