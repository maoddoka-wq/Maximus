import * as React from "react";
import { Typography, type TypographyProps } from "./typography";

export function Label({ style, ...props }: TypographyProps) {
  return (
    <Typography
      size="sm"
      weight="medium"
      style={[{ marginBottom: 4 }, style]}
      {...props}
    />
  );
}