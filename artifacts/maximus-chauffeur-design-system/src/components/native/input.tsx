import * as React from "react";
import { TextInput, type TextInputProps } from "react-native";
import { useColors } from "../../hooks/use-colors";
import { nativeTheme } from "../../lib/native-theme";

export interface InputProps extends TextInputProps {
  colors?: ReturnType<typeof useColors>;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ style, placeholderTextColor, colors, ...props }, ref) => {
    const systemColors = useColors();
    const palette = colors ?? systemColors;

    return (
      <TextInput
        ref={ref}
        placeholderTextColor={placeholderTextColor ?? palette.mutedForeground}
        style={[
          {
            minHeight: 48,
            borderWidth: 1,
            borderColor: palette.input,
            borderRadius: nativeTheme.light.radius.sm,
            backgroundColor: "transparent",
            color: palette.foreground,
            paddingHorizontal: nativeTheme.light.spacing.md,
            fontFamily: nativeTheme.light.typography.regular,
            fontSize: 16,
          },
          style,
        ]}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";