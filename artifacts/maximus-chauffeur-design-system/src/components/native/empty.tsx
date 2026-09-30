import * as React from "react";
import { View, type ViewProps } from "react-native";
import { Typography, type TypographyProps } from "./typography";
export const Empty = (p: ViewProps) => <View {...p} style={[{ alignItems: "center", justifyContent: "center", padding: 24 }, p.style]} />;
export const EmptyHeader = Empty;
export const EmptyContent = Empty;
export const EmptyMedia = Empty;
export const EmptyTitle = (p: TypographyProps) => <Typography size="lg" weight="semibold" {...p} />;
export const EmptyDescription = (p: TypographyProps) => <Typography tone="muted" size="sm" {...p} />;