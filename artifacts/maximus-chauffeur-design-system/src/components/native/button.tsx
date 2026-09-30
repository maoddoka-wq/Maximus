import * as React from "react";
import { ActivityIndicator, Pressable, Text, type PressableProps, type ViewStyle } from "react-native";
import { useColors } from "../../hooks/use-colors";

export type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
export type ButtonSize = "default" | "sm" | "lg" | "icon";
export interface ButtonProps extends PressableProps { variant?: ButtonVariant; size?: ButtonSize; loading?: boolean; label?: string; }
export function Button({ variant = "default", size = "default", loading, disabled, children, style, ...props }: ButtonProps) {
  const c = useColors();
  const filled = variant === "default" || variant === "destructive" || variant === "secondary";
  const bg = variant === "destructive" ? c.destructive : variant === "secondary" ? c.secondary : c.primary;
  const styleFor = (pressed: boolean): ViewStyle => ({
    minHeight: size === "lg" ? 40 : size === "sm" ? 32 : 36, paddingHorizontal: size === "icon" ? 0 : size === "lg" ? 32 : size === "sm" ? 12 : 16,
    width: size === "icon" ? 36 : undefined, borderRadius: 6, alignItems: "center", justifyContent: "center", flexDirection: "row",
    borderWidth: variant === "outline" || variant === "secondary" ? 1 : 0, borderColor: variant === "outline" ? c.border : bg,
    backgroundColor: filled ? bg : "transparent", opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
  });
  return <Pressable disabled={disabled || loading} style={({ pressed }) => [styleFor(pressed), style]} {...props}>
    {loading ? <ActivityIndicator color={filled ? c.primaryForeground : c.primary} /> : typeof children === "string" ? <Text style={{ color: filled ? c.primaryForeground : variant === "link" ? c.primary : c.foreground, fontSize: size === "sm" ? 12 : 14, fontWeight: "600", textDecorationLine: variant === "link" ? "underline" : "none" }}>{children}</Text> : children}
  </Pressable>;
}