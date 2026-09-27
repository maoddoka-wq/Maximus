import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { updateTransportDriverMobileLocation } from '@workspace/api-client-react';
import {
  ACCESS_TOKEN_KEY,
  BEARER_REQUEST_OPTIONS,
  LOCATION_SYNC_STATUS_KEY,
  LOCATION_TASK_NAME,
  configureMobileApi,
} from './mobile-api';

export type LocationSyncStatus = {
  receivedAt?: string;
  error?: string;
  updatedAt: string;
};

type BackgroundLocationPayload = {
  locations?: Location.LocationObject[];
};

configureMobileApi();

function messageFrom(error: unknown): string {
  if (error && typeof error === 'object') {
    const value = error as {
      message?: unknown;
      data?: { error?: unknown; message?: unknown };
    };
    if (typeof value.data?.error === 'string') return value.data.error;
    if (typeof value.data?.message === 'string') return value.data.message;
    if (typeof value.message === 'string') return value.message;
  }

  return 'La position n’a pas pu être transmise.';
}

function statusFrom(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}

async function saveSyncStatus(
  status: Omit<LocationSyncStatus, 'updatedAt'>,
): Promise<void> {
  await AsyncStorage.setItem(
    LOCATION_SYNC_STATUS_KEY,
    JSON.stringify({ ...status, updatedAt: new Date().toISOString() }),
  );
}

export async function readLocationSyncStatus(): Promise<LocationSyncStatus | null> {
  const raw = await AsyncStorage.getItem(LOCATION_SYNC_STATUS_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<LocationSyncStatus>;
    if (typeof parsed.updatedAt !== 'string') {
      await AsyncStorage.removeItem(LOCATION_SYNC_STATUS_KEY);
      return null;
    }
    return parsed as LocationSyncStatus;
  } catch {
    await AsyncStorage.removeItem(LOCATION_SYNC_STATUS_KEY);
    return null;
  }
}

async function submitLocation(location: Location.LocationObject): Promise<void> {
  const { latitude, longitude, accuracy } = location.coords;
  if (accuracy === null || !Number.isFinite(accuracy) || accuracy > 1000) {
    throw new Error('La précision GPS est insuffisante. Attendez un meilleur signal.');
  }

  const receipt = await updateTransportDriverMobileLocation(
    {
      latitude,
      longitude,
      accuracy,
      capturedAt: new Date(location.timestamp).toISOString(),
    },
    BEARER_REQUEST_OPTIONS,
  );

  await saveSyncStatus({ receivedAt: receipt.receivedAt });
}

export async function sendCurrentDriverLocation(): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Le suivi GPS en arrière-plan nécessite l’application iOS ou Android.');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
    mayShowUserSettingsDialog: true,
  });
  await submitLocation(location);
}

export async function startDriverLocationUpdates(): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Le suivi GPS en arrière-plan nécessite l’application iOS ou Android.');
  }

  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) return;

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.High,
    timeInterval: 15_000,
    distanceInterval: 25,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'MAXIMUS Chauffeur',
      notificationBody: 'Votre position aide les clients proches à trouver un chauffeur disponible.',
      notificationColor: '#ebab0a',
    },
  });
}

export async function stopDriverLocationUpdates(): Promise<void> {
  if (Platform.OS === 'web') return;

  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}

if (Platform.OS !== 'web' && !TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
  TaskManager.defineTask<BackgroundLocationPayload>(
    LOCATION_TASK_NAME,
    async ({ data, error }) => {
      if (error) {
        await saveSyncStatus({ error: error.message });
        return;
      }

      const payload = data as BackgroundLocationPayload | undefined;
      const locations = payload?.locations ?? [];
      const latest = locations[locations.length - 1];
      if (!latest) return;

      try {
        await submitLocation(latest);
      } catch (taskError) {
        await saveSyncStatus({ error: messageFrom(taskError) });

        if ([401, 403].includes(statusFrom(taskError) ?? 0)) {
          await stopDriverLocationUpdates();
          await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        }
      }
    },
  );
}