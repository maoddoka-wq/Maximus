import * as React from "react";
import { View, type ViewProps } from "react-native";
import { useColors } from "../../hooks/use-colors";
import { nativeTheme, type NativePalette } from "../../lib/native-theme";
import { Typography, type TypographyProps } from "./typography";

export interface CardProps extends ViewProps {
  colors?: NativePalette;
}

const section = (padding: number) => ({ padding });

export const Card = React.forwardRef<View, CardProps>(
  ({ colors, style, ...props }, ref) => {
    const systemColors = useColors();
    const palette = colors ?? systemColors;

    return (
      <View
        ref={ref}
        style={[
          {
            borderRadius: nativeTheme.light.radius.base,
            borderWidth: 1,
            borderColor: palette.border,
            backgroundColor: palette.card,
          },
          style,
        ]}
        {...props}
      />
    );
  },
);

Card.displayName = "Card";

export const CardHeader = (props: ViewProps) => (
  <View
    {...props}
    style={[section(nativeTheme.light.spacing.lg), props.style]}
  />
);

export const CardContent = (props: ViewProps) => (
  <View
    {...props}
    style={[
      section(nativeTheme.light.spacing.lg),
      { paddingTop: 0 },
      props.style,
    ]}
  />
);

export const CardFooter = (props: ViewProps) => (
  <View
    {...props}
    style={[
      section(nativeTheme.light.spacing.lg),
      { paddingTop: 0, flexDirection: "row", alignItems: "center" },
      props.style,
    ]}
  />
);

export const CardTitle = (props: TypographyProps) => (
  <Typography weight="bold" {...props} />
);

export const CardDescription = (props: TypographyProps) => (
  <Typography tone="muted" size="sm" {...props} />
);