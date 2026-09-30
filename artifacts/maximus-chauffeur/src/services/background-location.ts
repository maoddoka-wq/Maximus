import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { AppState, Platform } from 'react-native';
import { customFetch } from '../lib/api';
import {
  isLocationTrackingEnabled,
  readTrackedDriverId,
  readMobileToken,
  saveTrackedDriverId,
  setLocationTrackingEnabled,
} from '../lib/auth-storage';
import type { TransportDriver } from '@workspace/api-client-react';

export const DRIVER_LOCATION_TASK = 'maximus-driver-background-location';

const ANDROID_FOREGROUND_SETTLE_MS = 800;
const ANDROID_FOREGROUND_TIMEOUT_MS = 30_000;
const FOREGROUND_START_ATTEMPTS = 3;

// Settings-return AppState events can overlap manual GPS actions; serialize native task transitions.
let locationOperationQueue: Promise<void> = Promise.resolve();

function serializeLocationOperation<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const result = locationOperationQueue.then(operation, operation);
  locationOperationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

if (Platform.OS !== 'web') {
  TaskManager.defineTask(DRIVER_LOCATION_TASK, async ({ data, error }) => {
    if (error || !data) {
      if (error) console.error('MAXIMUS Chauffeur background location task failed.', error);
      return;
    }

    try {
      const [enabled, driverId, token] = await Promise.all([
        isLocationTrackingEnabled(),
        readTrackedDriverId(),
        readMobileToken(),
      ]);
      if (!enabled || !driverId || !token) return;

      const locations = (data as { locations?: Location.LocationObject[] }).locations;
      const latest = locations?.at(-1);
      if (!latest) return;

      await updateDriverPosition(driverId, latest.coords.latitude, latest.coords.longitude);
    } catch (taskError) {
      console.error('MAXIMUS Chauffeur could not send a background location.', taskError);
    }
  });
}

function waitForAndroidForeground(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();

  return new Promise((resolve, reject) => {
    let settled = false;
    let stableTimer: ReturnType<typeof setTimeout> | undefined;
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
    let subscription: ReturnType<typeof AppState.addEventListener> | undefined;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      if (stableTimer) clearTimeout(stableTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      subscription?.remove();
      if (error) reject(error);
      else resolve();
    };

    const checkStableForeground = () => {
      if (AppState.currentState !== 'active') return;
      if (stableTimer) clearTimeout(stableTimer);
      stableTimer = setTimeout(() => {
        if (AppState.currentState === 'active') {
          finish();
        } else {
          checkStableForeground();
        }
      }, ANDROID_FOREGROUND_SETTLE_MS);
    };

    subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkStableForeground();
      } else if (stableTimer) {
        clearTimeout(stableTimer);
        stableTimer = undefined;
      }
    });

    timeoutTimer = setTimeout(() => {
      finish(
        new Error(
          'Rouvrez MAXIMUS Chauffeur pour terminer le démarrage du GPS.',
        ),
      );
    }, ANDROID_FOREGROUND_TIMEOUT_MS);

    checkStableForeground();
  });
}

function isForegroundStartRace(error: unknown): boolean {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String(error.message)
      : String(error);
  return /foreground service.*(?:background|not allowed)|cannot be started when the application is in the background/i.test(
    message,
  );
}

async function startDriverLocationTask(): Promise<void> {
  for (let attempt = 0; attempt < FOREGROUND_START_ATTEMPTS; attempt += 1) {
    await waitForAndroidForeground();

    if (await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK)) {
      return;
    }

    try {
      await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 15_000,
        distanceInterval: 30,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'MAXIMUS Chauffeur',
          notificationBody:
            'Votre position est partagée pendant votre disponibilité.',
          killServiceOnDestroy: false,
        },
      });
      return;
    } catch (error) {
      const canRetry =
        Platform.OS === 'android' &&
        attempt < FOREGROUND_START_ATTEMPTS - 1 &&
        isForegroundStartRace(error);
      if (!canRetry) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
}

export async function updateDriverPosition(
  driverId: string,
  latitude: number,
  longitude: number,
): Promise<void> {
  await customFetch<TransportDriver>(
    `/api/transport/drivers/${encodeURIComponent(driverId)}/location`,
    {
      method: 'PATCH',
      responseType: 'json',
      body: JSON.stringify({ latitude, longitude }),
    },
  );
}

export type LocationSetupResult =
  | { ok: true }
  | { ok: false; reason: 'services-disabled' | 'foreground-permission' | 'background-permission'; message: string };

async function enableDriverLocationTrackingUnlocked(
  driverId: string,
  requestPermissions = true,
): Promise<LocationSetupResult> {
  if (Platform.OS === 'web') {
    return {
      ok: false,
      reason: 'services-disabled',
      message: 'Le partage GPS en arrière-plan nécessite l’application mobile.',
    };
  }

  if (!TaskManager.isTaskDefined(DRIVER_LOCATION_TASK)) {
    return {
      ok: false,
      reason: 'services-disabled',
      message: 'Le service de localisation de l’application n’est pas disponible.',
    };
  }

  if (!(await Location.hasServicesEnabledAsync())) {
    return {
      ok: false,
      reason: 'services-disabled',
      message: 'Activez la localisation du téléphone pour vous rendre disponible.',
    };
  }

  let foreground = await Location.getForegroundPermissionsAsync();
  if (!foreground.granted && requestPermissions) {
    foreground = await Location.requestForegroundPermissionsAsync();
  }
  if (!foreground.granted) {
    return {
      ok: false,
      reason: 'foreground-permission',
      message: 'Autorisez l’accès à la localisation pour partager votre position avec votre entreprise.',
    };
  }

  let background = await Location.getBackgroundPermissionsAsync();
  if (!background.granted && requestPermissions) {
    background = await Location.requestBackgroundPermissionsAsync();
  }
  if (!background.granted) {
    return {
      ok: false,
      reason: 'background-permission',
      message: 'Autorisez la localisation « Tout le temps » afin que le GPS continue écran verrouillé.',
    };
  }

  try {
    await saveTrackedDriverId(driverId);
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      mayShowUserSettingsDialog: true,
    });
    await updateDriverPosition(
      driverId,
      current.coords.latitude,
      current.coords.longitude,
    );

    await setLocationTrackingEnabled(true);
    await startDriverLocationTask();

    return { ok: true };
  } catch (error) {
    await setLocationTrackingEnabled(false);
    throw error;
  }
}

export function enableDriverLocationTracking(
  driverId: string,
  requestPermissions = true,
): Promise<LocationSetupResult> {
  return serializeLocationOperation(() =>
    enableDriverLocationTrackingUnlocked(driverId, requestPermissions),
  );
}

async function resumeDriverLocationTrackingUnlocked(
  driverId: string,
): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const [foreground, background] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
  ]);
  if (!foreground.granted || !background.granted) return false;

  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  await saveTrackedDriverId(driverId);
  if (alreadyStarted) {
    await setLocationTrackingEnabled(true);
    return true;
  }

  const result = await enableDriverLocationTrackingUnlocked(driverId, false);
  return result.ok;
}

export function resumeDriverLocationTracking(
  driverId: string,
): Promise<boolean> {
  return serializeLocationOperation(() =>
    resumeDriverLocationTrackingUnlocked(driverId),
  );
}

export function stopDriverLocationTracking(): Promise<void> {
  return serializeLocationOperation(async () => {
    await setLocationTrackingEnabled(false);
    if (Platform.OS === 'web') return;
    if (await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
    }
  });
}

export async function isDriverLocationTrackingActive(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  return Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
}