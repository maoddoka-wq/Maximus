import * as React from "react";
import { Text, View, type ViewProps } from "react-native";
import { useColors } from "../../hooks/use-colors";
export interface BadgeProps extends ViewProps { variant?: "default" | "secondary" | "destructive" | "outline"; children?: React.ReactNode; }
export function Badge({ variant = "default", children, style, ...props }: BadgeProps) {
  const c = useColors(); const filled = variant !== "outline"; const bg = variant === "destructive" ? c.destructive : variant === "secondary" ? c.secondary : c.primary;
  return <View style={[{ alignSelf: "flex-start", borderRadius: 6, borderWidth: 1, borderColor: filled ? bg : c.border, backgroundColor: filled ? bg : "transparent", paddingHorizontal: 10, paddingVertical: 2 }, style]} {...props}><Text style={{ color: filled ? (variant === "secondary" ? c.secondaryForeground : c.primaryForeground) : c.foreground, fontSize: 12, fontWeight: "600" }}>{children}</Text></View>;
}