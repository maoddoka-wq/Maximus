import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const appConfig = JSON.parse(
  await readFile(new URL("../app.json", import.meta.url), "utf8"),
);

test("Chauffeur release requests foreground location and APK installation permissions", () => {
  assert.deepEqual(
    appConfig.expo.android.permissions
      .filter((permission) => permission !== "REQUEST_INSTALL_PACKAGES")
      .sort(),
    ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"],
  );
  assert.ok(appConfig.expo.android.permissions.includes("REQUEST_INSTALL_PACKAGES"));

  const locationPlugin = appConfig.expo.plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === "expo-location",
  )?.[1];

  assert.equal(locationPlugin.isAndroidBackgroundLocationEnabled, false);
  assert.equal(locationPlugin.isAndroidForegroundServiceEnabled, false);
  assert.equal("locationAlwaysPermission" in locationPlugin, false);
  assert.equal("locationAlwaysAndWhenInUsePermission" in locationPlugin, false);
  assert.match(
    locationPlugin.locationWhenInUsePermission,
    /uniquement lorsque l’application est ouverte/,
  );

  for (const permission of [
    "ACCESS_BACKGROUND_LOCATION",
    "FOREGROUND_SERVICE",
    "FOREGROUND_SERVICE_LOCATION",
    "POST_NOTIFICATIONS",
  ]) {
    assert.ok(
      !appConfig.expo.android.permissions.includes(permission),
      `${permission} must not be requested by the Expo Android config`,
    );
  }
});