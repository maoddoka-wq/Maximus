import * as Location from 'expo-location';
import { AppState, Platform } from 'react-native';
import type { TransportDriver } from '@workspace/api-client-react';
import { customFetch } from '../lib/api';
import {
  hasLocationTrackingConsent,
  isLocationTrackingEnabled,
  setLocationTrackingConsent,
  setLocationTrackingEnabled,
} from '../lib/auth-storage';
import { canResumeLocationTracking } from './location-resume-policy';
import { createSerializedLocationOperations } from './serialized-location-operation-queue';

const LOCATION_UPDATE_INTERVAL_MS = 15_000;
const LOCATION_UPDATE_DISTANCE_METERS = 30;

let foregroundLocationSubscription: Location.LocationSubscription | null = null;
let foregroundDriverId: string | null = null;

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

async function stopForegroundLocationUpdates(): Promise<void> {
  const subscription = foregroundLocationSubscription;
  foregroundLocationSubscription = null;
  foregroundDriverId = null;
  subscription?.remove();
}

async function startForegroundLocationUpdates(driverId: string): Promise<void> {
  if (AppState.currentState !== 'active') {
    throw new Error('Rouvrez MAXIMUS Chauffeur pour activer le GPS.');
  }

  if (
    foregroundLocationSubscription &&
    foregroundDriverId === driverId
  ) {
    return;
  }

  await stopForegroundLocationUpdates();
  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: LOCATION_UPDATE_INTERVAL_MS,
      distanceInterval: LOCATION_UPDATE_DISTANCE_METERS,
    },
    (location) => {
      void updateDriverPosition(
        driverId,
        location.coords.latitude,
        location.coords.longitude,
      ).catch((error) => {
        console.error('MAXIMUS Chauffeur could not send the foreground location.', error);
      });
    },
    (error) => {
      console.error('MAXIMUS Chauffeur foreground location watcher failed.', error);
    },
  );

  if (AppState.currentState !== 'active') {
    subscription.remove();
    throw new Error('Rouvrez MAXIMUS Chauffeur pour activer le GPS.');
  }

  foregroundLocationSubscription = subscription;
  foregroundDriverId = driverId;
}

async function areLocationServicesEnabled(
  requestActivation: boolean,
): Promise<boolean> {
  if (await Location.hasServicesEnabledAsync()) return true;
  if (!requestActivation || Platform.OS !== 'android') return false;

  try {
    await Location.enableNetworkProviderAsync();
  } catch {
    // The driver may dismiss the system prompt; the caller reports GPS as disabled.
  }

  return Location.hasServicesEnabledAsync();
}

export type LocationSetupResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'services-disabled' | 'foreground-permission';
      message: string;
    };

async function enableDriverLocationTrackingUnlocked(
  driverId: string,
  requestPermissions = true,
): Promise<LocationSetupResult> {
  if (Platform.OS === 'web') {
    return {
      ok: false,
      reason: 'services-disabled',
      message: 'Activez le GPS depuis l’application mobile MAXIMUS Chauffeur.',
    };
  }

  if (!(await areLocationServicesEnabled(requestPermissions))) {
    return {
      ok: false,
      reason: 'services-disabled',
      message: 'Activez la localisation du téléphone pour partager votre position.',
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
      message:
        'Autorisez l’accès à la position pendant l’utilisation de l’application.',
    };
  }

  try {
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      mayShowUserSettingsDialog: true,
    });
    await updateDriverPosition(
      driverId,
      current.coords.latitude,
      current.coords.longitude,
    );
    await startForegroundLocationUpdates(driverId);
    await setLocationTrackingEnabled(true);
    return { ok: true };
  } catch (error) {
    await setLocationTrackingEnabled(false);
    await stopForegroundLocationUpdates();
    throw error;
  }
}

async function resumeDriverLocationTrackingUnlocked(
  driverId: string,
): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const [
    explicitConsent,
    locationServicesEnabled,
    foregroundPermission,
  ] = await Promise.all([
    hasLocationTrackingConsent(),
    Location.hasServicesEnabledAsync(),
    Location.getForegroundPermissionsAsync(),
  ]);

  if (
    !canResumeLocationTracking(
      explicitConsent,
      locationServicesEnabled,
      foregroundPermission.granted,
    )
  ) {
    await setLocationTrackingEnabled(false);
    await stopForegroundLocationUpdates();
    return false;
  }

  if (AppState.currentState !== 'active') {
    await suspendDriverLocationTrackingUnlocked();
    return false;
  }

  if (
    foregroundLocationSubscription &&
    foregroundDriverId === driverId
  ) {
    await setLocationTrackingEnabled(true);
    return true;
  }

  const result = await enableDriverLocationTrackingUnlocked(driverId, false);
  return result.ok;
}

async function suspendDriverLocationTrackingUnlocked(): Promise<void> {
  await setLocationTrackingEnabled(false);
  await stopForegroundLocationUpdates();
}

async function stopDriverLocationTrackingUnlocked(): Promise<void> {
  await setLocationTrackingEnabled(false);
  await setLocationTrackingConsent(false);
  await stopForegroundLocationUpdates();
}

const locationOperations = createSerializedLocationOperations<
  [driverId: string, requestPermissions?: boolean],
  LocationSetupResult,
  [driverId: string],
  boolean,
  void,
  void
>({
  enable: async (driverId: string, requestPermissions = true) => {
    const result = await enableDriverLocationTrackingUnlocked(
      driverId,
      requestPermissions,
    );
    if (result.ok) await setLocationTrackingConsent(true);
    return result;
  },
  resume: resumeDriverLocationTrackingUnlocked,
  suspend: suspendDriverLocationTrackingUnlocked,
  stop: stopDriverLocationTrackingUnlocked,
});

export const enableDriverLocationTracking = locationOperations.enable;
export const resumeDriverLocationTracking = locationOperations.resume;
export const suspendDriverLocationTracking = locationOperations.suspend;
export const stopDriverLocationTracking = locationOperations.stop;

export async function isDriverLocationTrackingActive(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const [explicitConsent, locationServicesEnabled, foreground, enabled] =
    await Promise.all([
      hasLocationTrackingConsent(),
      Location.hasServicesEnabledAsync(),
      Location.getForegroundPermissionsAsync(),
      isLocationTrackingEnabled(),
    ]);

  return (
    enabled &&
    foregroundLocationSubscription !== null &&
    foregroundDriverId !== null &&
    AppState.currentState === 'active' &&
    canResumeLocationTracking(
      explicitConsent,
      locationServicesEnabled,
      foreground.granted,
    )
  );
}