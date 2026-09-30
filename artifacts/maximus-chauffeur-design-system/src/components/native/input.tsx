import * as React from "react";
import { TextInput, type TextInputProps } from "react-native";
import { useColors } from "../../hooks/use-colors";
export const Input = React.forwardRef<TextInput, TextInputProps>(({ style, placeholderTextColor, ...props }, ref) => { const c = useColors(); return <TextInput ref={ref} placeholderTextColor={placeholderTextColor ?? c.mutedForeground} style={[{ height: 36, borderWidth: 1, borderColor: c.input, borderRadius: 6, backgroundColor: "transparent", color: c.foreground, paddingHorizontal: 12, fontSize: 16 }, style]} {...props} />; });
Input.displayName = "Input";