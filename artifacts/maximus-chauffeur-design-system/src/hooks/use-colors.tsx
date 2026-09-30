import { useColorScheme } from "react-native";
import { resolveNativePalette, type NativePalette } from "../lib/native-theme";

export function useColors(companyPrimary?: string | null): NativePalette {
  return resolveNativePalette(useColorScheme() === "dark" ? "dark" : "light", companyPrimary);
}