---
name: Expo SecureStore in web preview
description: Native-only authentication and location requirements in the Expo web preview.
---

The Replit Expo preview runs the web target; in this workspace, calling `expo-secure-store` from that target failed. Do not replace SecureStore with localStorage or AsyncStorage for the bearer token just to make web-preview login work.

**Why:** A browser fallback would weaken credential protection and still would not test background location or screen-off behavior.

**How to apply:** In Expo apps that use secure sessions or background location, guard native-only APIs by `Platform.OS`, keep browser previews presentational, and validate authentication and location behavior in a native development build on a real device.