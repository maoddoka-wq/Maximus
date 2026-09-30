import * as React from "react";
import { Text, type TextProps } from "react-native";
import { useColors } from "../../hooks/use-colors";
export function Label({ style, ...props }: TextProps) { const c = useColors(); return <Text style={[{ color: c.foreground, fontSize: 14, fontWeight: "500", marginBottom: 6 }, style]} {...props} />; }