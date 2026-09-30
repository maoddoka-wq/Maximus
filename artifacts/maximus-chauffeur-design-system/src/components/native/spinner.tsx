import { ActivityIndicator, type ActivityIndicatorProps } from "react-native";
import { useColors } from "../../hooks/use-colors";
export function Spinner({ color, ...props }: ActivityIndicatorProps) { const c = useColors(); return <ActivityIndicator color={color ?? c.primary} {...props} />; }