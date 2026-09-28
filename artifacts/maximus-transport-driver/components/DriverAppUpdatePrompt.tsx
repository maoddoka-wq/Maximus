import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useEffect, useRef } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import {
  DRIVER_ANDROID_RELEASE_API_URL,
  isDriverAndroidUpdateAvailable,
  parseDriverAndroidRelease,
} from '../lib/driver-app-update';

const UPDATE_CHECK_STORAGE_KEY = '@maximus-chauffeur/android-update-checked-at';
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

async function getLatestAndroidRelease() {
  const response = await fetch(DRIVER_ANDROID_RELEASE_API_URL, {
    headers: { Accept: 'application/vnd.github+json' },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`GitHub Releases a répondu HTTP ${response.status}.`);
  }

  return parseDriverAndroidRelease(await response.json());
}

async function checkForDriverUpdate(): Promise<void> {
  const installedVersion = Constants.expoConfig?.version;
  if (!installedVersion) return;

  try {
    const lastCheckedAt = Number(await AsyncStorage.getItem(UPDATE_CHECK_STORAGE_KEY));
    if (
      Number.isFinite(lastCheckedAt) &&
      lastCheckedAt > 0 &&
      Date.now() - lastCheckedAt < UPDATE_CHECK_INTERVAL_MS
    ) {
      return;
    }

    const release = await getLatestAndroidRelease();
    await AsyncStorage.setItem(UPDATE_CHECK_STORAGE_KEY, String(Date.now()));

    if (!release || !isDriverAndroidUpdateAvailable(installedVersion, release.version)) {
      return;
    }

    Alert.alert(
      'Mise à jour disponible',
      `${release.version} est disponible. Version installée : ${installedVersion}. Téléchargez-la puis confirmez l’installation proposée par Android.`,
      [
        { text: 'Plus tard', style: 'cancel' },
        {
          text: 'Télécharger',
          onPress: () => {
            void Linking.openURL(release.downloadUrl).catch(() => {
              Alert.alert(
                'Téléchargement indisponible',
                'Ouvrez les paramètres du module Transport pour réessayer.',
              );
            });
          },
        },
      ],
    );
  } catch {
    // Update checks are best-effort and must never block sign-in or trip access.
  }
}

export function DriverAppUpdatePrompt() {
  const hasChecked = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android' || __DEV__ || hasChecked.current) return;
    hasChecked.current = true;
    void checkForDriverUpdate();
  }, []);

  return null;
}