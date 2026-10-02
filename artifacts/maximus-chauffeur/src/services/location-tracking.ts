import * as Location from 'expo-location';
import { AppState, Platform } from 'react-native';
import { updateTransportDriverLocation } from '@workspace/api-client-react';
import type { TransportDriver } from '@workspace/api-client-react';
import '../lib/api';
import {
  hasLocationTrackingConsent,
  isLocationTrackingEnabled,
  setLocationTrackingConsent,
  setLocationTrackingEnabled,
} from '../lib/auth-storage';
import { canResumeLocationTracking } from './location-resume-policy';
import type { LocationSetupFailure } from './location-setup-policy';
import {
  FOREGROUND_LOCATION_UPDATE_OPTIONS,
  getDriverLocationQualityMessage,
  isPlausibleDriverLocationUpdate,
} from './location-sync-policy';
import { createSerializedLocationOperations } from './serialized-location-operation-queue';
import {
  getFreshDriverLocationCoordinates,
  isFreshDriverLocation,
  type DriverLocationSnapshot,
} from '../lib/trip-map-geometry';

let foregroundLocationSubscription: Location.LocationSubscription | null = null;
let foregroundDriverId: string | null = null;
let foregroundGeneration = 0;
let latestDriverLocation: DriverLocationSnapshot | null = null;
const driverLocationListeners = new Set<
  (location: DriverLocationSnapshot | null) => void
>();
const driverLocationIssueListeners = new Set<
  (message: string | null) => void
>();
let latestDriverLocationIssue: string | null = null;
let latestObservedLocationTimestamp = 0;
let queuedLocationUpdate: {
  driverId: string;
  generation: number;
  location: Location.LocationObject;
} | null = null;
let locationUpdateInFlight = false;
let locationRequestQueue: Promise<void> = Promise.resolve();
let lastLocationUploadTimestamp = 0;

function notifyDriverLocationListeners(): void {
  const position = isFreshDriverLocation(latestDriverLocation)
    ? latestDriverLocation
    : null;
  for (const listener of driverLocationListeners) {
    try {
      listener(position);
    } catch (error) {
      console.error('MAXIMUS Chauffeur could not notify a GPS position listener.', error);
    }
  }
}

function publishDriverLocation(location: Location.LocationObject): void {
  const snapshot: DriverLocationSnapshot = {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    timestamp: location.timestamp,
    accuracy: location.coords.accuracy ?? Number.NaN,
  };
  if (!isFreshDriverLocation(snapshot)) return;
  if (latestDriverLocation && snapshot.timestamp < latestDriverLocation.timestamp) return;

  latestDriverLocation = snapshot;
  notifyDriverLocationListeners();
}

function publishDriverLocationIssue(message: string | null): void {
  latestDriverLocationIssue = message;
  for (const listener of driverLocationIssueListeners) {
    try {
      listener(message);
    } catch (error) {
      console.error('MAXIMUS Chauffeur could not notify a GPS quality issue.', error);
    }
  }
}

function clearPublishedDriverLocation(): void {
  latestDriverLocation = null;
  notifyDriverLocationListeners();
}

export function subscribeToDriverLocation(
  listener: (location: DriverLocationSnapshot | null) => void,
): () => void {
  driverLocationListeners.add(listener);
  listener(
    isFreshDriverLocation(latestDriverLocation) ? latestDriverLocation : null,
  );
  return () => {
    driverLocationListeners.delete(listener);
  };
}

export function subscribeToDriverLocationIssue(
  listener: (message: string | null) => void,
): () => void {
  driverLocationIssueListeners.add(listener);
  listener(latestDriverLocationIssue);
  return () => {
    driverLocationIssueListeners.delete(listener);
  };
}

export async function updateDriverPosition(
  driverId: string,
  location: DriverLocationSnapshot,
): Promise<boolean> {
  const request = locationRequestQueue.then(async () => {
    if (
      !isFreshDriverLocation(location) ||
      location.timestamp <= lastLocationUploadTimestamp
    ) {
      return false;
    }

    lastLocationUploadTimestamp = location.timestamp;
    await updateTransportDriverLocation(driverId, {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      measuredAt: Math.round(location.timestamp),
    });
    return true;
  });
  locationRequestQueue = request.then(
    () => undefined,
    () => undefined,
  );
  return request;
}

function snapshotFromLocation(
  location: Location.LocationObject,
): DriverLocationSnapshot {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    timestamp: location.timestamp,
    accuracy: location.coords.accuracy ?? Number.NaN,
  };
}

async function drainQueuedLocationUpdate(): Promise<void> {
  if (locationUpdateInFlight) return;
  locationUpdateInFlight = true;

  try {
    while (queuedLocationUpdate) {
      const queued = queuedLocationUpdate;
      queuedLocationUpdate = null;
      if (
        queued.generation !== foregroundGeneration ||
        AppState.currentState !== 'active'
      ) {
        continue;
      }

      const snapshot = snapshotFromLocation(queued.location);
      const qualityMessage = getDriverLocationQualityMessage(snapshot);
      if (qualityMessage) {
        publishDriverLocationIssue(qualityMessage);
        continue;
      }

      const previous = isFreshDriverLocation(latestDriverLocation)
        ? latestDriverLocation
        : null;
      if (!isPlausibleDriverLocationUpdate(previous, snapshot)) {
        publishDriverLocationIssue(
          'Le GPS a signalé un déplacement incohérent. Attendez quelques secondes que le téléphone confirme sa position.',
        );
        continue;
      }

      try {
        const uploaded = await updateDriverPosition(queued.driverId, snapshot);
        if (
          !uploaded ||
          queued.generation !== foregroundGeneration ||
          AppState.currentState !== 'active'
        ) {
          continue;
        }

        publishDriverLocation(queued.location);
        if (snapshot.timestamp >= latestObservedLocationTimestamp) {
          publishDriverLocationIssue(null);
        }
      } catch (error) {
        if (queued.generation === foregroundGeneration) {
          publishDriverLocationIssue(
            'La position GPS n’a pas pu être confirmée par le serveur. Vérifiez votre connexion.',
          );
        }
        console.error('MAXIMUS Chauffeur could not send the foreground location.', error);
      }
    }
  } finally {
    locationUpdateInFlight = false;
    if (queuedLocationUpdate) {
      void drainQueuedLocationUpdate();
    }
  }
}

function queueForegroundLocationUpdate(
  driverId: string,
  generation: number,
  location: Location.LocationObject,
): void {
  if (location.timestamp <= latestObservedLocationTimestamp) return;

  const qualityMessage = getDriverLocationQualityMessage(
    snapshotFromLocation(location),
  );
  if (qualityMessage) {
    queuedLocationUpdate = null;
    publishDriverLocationIssue(qualityMessage);
    return;
  }

  latestObservedLocationTimestamp = location.timestamp;
  queuedLocationUpdate = { driverId, generation, location };
  void drainQueuedLocationUpdate();
}

async function stopForegroundLocationUpdates(): Promise<void> {
  const subscription = foregroundLocationSubscription;
  foregroundGeneration += 1;
  queuedLocationUpdate = null;
  latestObservedLocationTimestamp = 0;
  clearPublishedDriverLocation();
  publishDriverLocationIssue(null);
  if (!subscription) {
    foregroundDriverId = null;
    return;
  }

  subscription.remove();
  if (foregroundLocationSubscription === subscription) {
    foregroundLocationSubscription = null;
    foregroundDriverId = null;
  }
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
  const generation = foregroundGeneration;
  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Highest,
      ...FOREGROUND_LOCATION_UPDATE_OPTIONS,
    },
    (location) => {
      if (
        generation !== foregroundGeneration ||
        AppState.currentState !== 'active'
      ) {
        return;
      }
      queueForegroundLocationUpdate(driverId, generation, location);
    },
    (error) => {
      if (generation === foregroundGeneration) {
        clearPublishedDriverLocation();
        publishDriverLocationIssue(
          'Le GPS ne fournit plus de position. Vérifiez les services de localisation du téléphone.',
        );
        console.error('MAXIMUS Chauffeur foreground location watcher failed.', error);
      }
    },
  );

  foregroundLocationSubscription = subscription;
  foregroundDriverId = driverId;

  if (AppState.currentState !== 'active') {
    await stopForegroundLocationUpdates();
    throw new Error('Rouvrez MAXIMUS Chauffeur pour activer le GPS.');
  }
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
  | ({ ok: false } & LocationSetupFailure);

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

  try {
    if (!(await areLocationServicesEnabled(requestPermissions))) {
      await suspendDriverLocationTrackingUnlocked();
      return {
        ok: false,
        reason: 'services-disabled',
        message:
          'La localisation du téléphone est désactivée. Activez-la puis réessayez.',
      };
    }

    let foreground = await Location.getForegroundPermissionsAsync();
    if (!foreground.granted && requestPermissions) {
      foreground = await Location.requestForegroundPermissionsAsync();
    }
    if (!foreground.granted) {
      await suspendDriverLocationTrackingUnlocked();
      return {
        ok: false,
        reason: 'foreground-permission',
        canAskAgain: foreground.canAskAgain,
        message: foreground.canAskAgain
          ? 'Autorisez l’accès à la position pendant l’utilisation de l’application, puis réessayez.'
          : 'L’accès à la position est bloqué. Autorisez-le dans les paramètres de l’application.',
      };
    }

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
      mayShowUserSettingsDialog: true,
    });
    const currentSnapshot = snapshotFromLocation(current);
    const qualityMessage = getDriverLocationQualityMessage(currentSnapshot);
    const coordinates = getFreshDriverLocationCoordinates(currentSnapshot);
    if (!coordinates) {
      throw new Error(
        qualityMessage ??
          'Le téléphone n’a pas fourni de position GPS récente. Gardez l’application ouverte et réessayez.',
      );
    }

    const uploaded = await updateDriverPosition(driverId, currentSnapshot);
    if (!uploaded) {
      throw new Error(
        'La position GPS a expiré avant sa confirmation. Réessayez dans un endroit dégagé.',
      );
    }
    await startForegroundLocationUpdates(driverId);
    publishDriverLocation(current);
    publishDriverLocationIssue(null);
    await setLocationTrackingEnabled(true);
    return { ok: true };
  } catch (error) {
    await suspendAfterLocationFailure(
      'Could not stop foreground GPS after location setup failed.',
    );
    throw error;
  }
}

async function resumeDriverLocationTrackingUnlocked(
  driverId: string,
): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
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
      await suspendDriverLocationTrackingUnlocked();
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
  } catch (error) {
    await suspendAfterLocationFailure(
      'Could not stop foreground GPS after location resume failed.',
    );
    throw error;
  }
}

async function suspendDriverLocationTrackingUnlocked(): Promise<void> {
  try {
    await setLocationTrackingEnabled(false);
  } finally {
    await stopForegroundLocationUpdates();
  }
}

async function suspendAfterLocationFailure(message: string): Promise<void> {
  try {
    await suspendDriverLocationTrackingUnlocked();
  } catch (error) {
    console.error(message, error);
  }
}

async function stopDriverLocationTrackingUnlocked(): Promise<void> {
  let failed = false;
  let firstError: unknown;

  try {
    await setLocationTrackingEnabled(false);
  } catch (error) {
    failed = true;
    firstError = error;
  }

  try {
    await setLocationTrackingConsent(false);
  } catch (error) {
    if (!failed) firstError = error;
    failed = true;
  }

  try {
    await stopForegroundLocationUpdates();
  } catch (error) {
    if (!failed) firstError = error;
    failed = true;
  }

  if (failed) throw firstError;
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
    if (result.ok) {
      try {
        await setLocationTrackingConsent(true);
      } catch (error) {
        await suspendAfterLocationFailure(
          'Could not stop foreground GPS after consent could not be saved.',
        );
        throw error;
      }
    }
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