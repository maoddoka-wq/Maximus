import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
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

export async function enableDriverLocationTracking(
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
    const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
    if (!alreadyStarted) {
      await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 15_000,
        distanceInterval: 30,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'MAXIMUS Chauffeur',
          notificationBody: 'Votre position est partagée pendant votre disponibilité.',
          killServiceOnDestroy: false,
        },
      });
    }

    return { ok: true };
  } catch (error) {
    await setLocationTrackingEnabled(false);
    throw error;
  }
}

export async function resumeDriverLocationTracking(driverId: string): Promise<boolean> {
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

  const result = await enableDriverLocationTracking(driverId, false);
  return result.ok;
}

export async function stopDriverLocationTracking(): Promise<void> {
  await setLocationTrackingEnabled(false);
  if (Platform.OS === 'web') return;
  if (await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  }
}

export async function isDriverLocationTrackingActive(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  return Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
}