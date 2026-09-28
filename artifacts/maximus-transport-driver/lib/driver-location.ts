import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { updateTransportDriverMobileLocation } from '@workspace/api-client-react';
import {
  ACCESS_TOKEN_KEY,
  API_ORIGIN,
  BEARER_REQUEST_OPTIONS,
  configureMobileApi,
} from '@/lib/mobile-api';

export const DRIVER_LOCATION_TASK = 'maximus-driver-background-location';

type LocationTaskData = {
  locations?: Location.LocationObject[];
};

const locationTaskOptions: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.High,
  timeInterval: 10_000,
  distanceInterval: 20,
  deferredUpdatesInterval: 10_000,
  deferredUpdatesDistance: 20,
  pausesUpdatesAutomatically: false,
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: 'MAXIMUS Chauffeur',
    notificationBody: 'Votre position est partagée pendant votre service.',
    killServiceOnDestroy: false,
  },
};

configureMobileApi();

let uploadQueue: Promise<void> = Promise.resolve();
let lifecycleQueue: Promise<void> = Promise.resolve();

async function sendLocation(location: Location.LocationObject): Promise<void> {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (!token) {
    throw new Error('La session chauffeur est absente.');
  }
  if (!API_ORIGIN) {
    throw new Error('Le serveur MAXIMUS n’est pas configuré sur cet appareil.');
  }

  const { latitude, longitude, accuracy } = location.coords;
  if (accuracy === null || !Number.isFinite(accuracy) || accuracy > 1000) {
    throw new Error('La précision GPS est insuffisante pour envoyer cette position.');
  }

  await updateTransportDriverMobileLocation(
    {
      latitude,
      longitude,
      accuracy,
      capturedAt: new Date(location.timestamp).toISOString(),
    },
    {
      ...BEARER_REQUEST_OPTIONS,
      headers: { Authorization: `Bearer ${token}` },
    },
  );
}

export function uploadDriverLocation(location: Location.LocationObject): Promise<void> {
  const queuedUpload = uploadQueue.then(
    () => sendLocation(location),
    () => sendLocation(location),
  );
  uploadQueue = queuedUpload.then(
    () => undefined,
    () => undefined,
  );
  return queuedUpload;
}

function serializeLifecycle<T>(operation: () => Promise<T>): Promise<T> {
  const result = lifecycleQueue.then(operation, operation);
  lifecycleQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export async function startDriverLocationTracking(): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Le suivi GPS natif est disponible uniquement sur Android et iOS.');
  }

  await serializeLifecycle(async () => {
    if (!TaskManager.isTaskDefined(DRIVER_LOCATION_TASK)) {
      throw new Error('Le service de suivi GPS n’est pas initialisé.');
    }

    const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
    if (!alreadyStarted) {
      await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, locationTaskOptions);
    }
  });
}

export async function stopDriverLocationTracking(): Promise<void> {
  if (Platform.OS === 'web') return;

  await serializeLifecycle(async () => {
    if (await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
    }
  });
}

if (!TaskManager.isTaskDefined(DRIVER_LOCATION_TASK)) {
  TaskManager.defineTask<LocationTaskData>(DRIVER_LOCATION_TASK, async ({ data, error }) => {
    if (error) return;

    const locations = (data as LocationTaskData | undefined)?.locations ?? [];
    const latestLocation = locations.reduce<Location.LocationObject | null>(
      (latest, candidate) =>
        latest === null || candidate.timestamp > latest.timestamp ? candidate : latest,
      null,
    );
    if (!latestLocation) return;

    try {
      await uploadDriverLocation(latestLocation);
    } catch {
      // A failed background upload is retried with the next native location update.
    }
  });
}