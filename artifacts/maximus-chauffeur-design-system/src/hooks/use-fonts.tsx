import { useFonts } from "expo-font";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  DMSans_600SemiBold,
} from "@expo-google-fonts/dm-sans";

export function useDesignSystemFonts() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });
  return { fontsLoaded, fontError };
}