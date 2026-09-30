import { ActivityIndicator, type ActivityIndicatorProps } from "react-native";
import { useColors } from "../../hooks/use-colors";

export function Spinner({ color, ...props }: ActivityIndicatorProps) {
  const colors = useColors();
  return <ActivityIndicator color={color ?? colors.primary} {...props} />;
}