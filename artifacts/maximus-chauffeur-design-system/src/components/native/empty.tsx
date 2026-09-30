import * as React from "react";
import { View, type ViewProps } from "react-native";
import { nativeTheme } from "../../lib/native-theme";
import { Typography, type TypographyProps } from "./typography";

export const Empty = (props: ViewProps) => (
  <View
    {...props}
    style={[
      {
        alignItems: "center",
        justifyContent: "center",
        padding: nativeTheme.light.spacing.lg,
      },
      props.style,
    ]}
  />
);

export const EmptyHeader = Empty;
export const EmptyContent = Empty;
export const EmptyMedia = Empty;

export const EmptyTitle = (props: TypographyProps) => (
  <Typography size="lg" weight="semibold" {...props} />
);

export const EmptyDescription = (props: TypographyProps) => (
  <Typography tone="muted" size="sm" {...props} />
);