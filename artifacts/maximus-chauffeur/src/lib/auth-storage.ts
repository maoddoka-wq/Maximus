import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'maximus-chauffeur-token';
const DRIVER_ID_KEY = 'maximus-chauffeur-driver-id';
const TRACKING_ENABLED_KEY = 'maximus-chauffeur-tracking-enabled';
const TRACKING_CONSENT_KEY = 'maximus-chauffeur-gps-consent-v1';

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

// The browser preview has no native keychain. Keep preview credentials transient
// in memory rather than persisting a mobile bearer token in browser storage.
const browserStore = new Map<string, string>();

function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return Promise.resolve(browserStore.get(key) ?? null);
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    browserStore.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value, secureOptions);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    browserStore.delete(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function readMobileToken(): Promise<string | null> {
  return getItem(TOKEN_KEY);
}

export async function saveMobileToken(token: string): Promise<void> {
  await setItem(TOKEN_KEY, token);
}

export async function clearMobileCredentials(): Promise<void> {
  await Promise.all([
    deleteItem(TOKEN_KEY),
    deleteItem(DRIVER_ID_KEY),
    deleteItem(TRACKING_ENABLED_KEY),
    deleteItem(TRACKING_CONSENT_KEY),
  ]);
}

export async function saveTrackedDriverId(driverId: string): Promise<void> {
  await setItem(DRIVER_ID_KEY, driverId);
}

export async function readTrackedDriverId(): Promise<string | null> {
  return getItem(DRIVER_ID_KEY);
}

export async function setLocationTrackingEnabled(enabled: boolean): Promise<void> {
  await setItem(TRACKING_ENABLED_KEY, String(enabled));
}

export async function isLocationTrackingEnabled(): Promise<boolean> {
  return (await getItem(TRACKING_ENABLED_KEY)) === 'true';
}

export async function setLocationTrackingConsent(consented: boolean): Promise<void> {
  await setItem(TRACKING_CONSENT_KEY, String(consented));
}

export async function hasLocationTrackingConsent(): Promise<boolean> {
  return (await getItem(TRACKING_CONSENT_KEY)) === 'true';
}