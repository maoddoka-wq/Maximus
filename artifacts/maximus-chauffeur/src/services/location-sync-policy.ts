import {
  DRIVER_LOCATION_MAX_ACCURACY_METERS,
  isFreshDriverLocation,
  type DriverLocationSnapshot,
} from '../lib/trip-map-geometry.ts';

export const FOREGROUND_LOCATION_UPDATE_OPTIONS = {
  timeInterval: 15_000,
  distanceInterval: 0,
} as const;

const MAX_DRIVER_SPEED_METERS_PER_SECOND = 60;

export type DriverGpsState =
  | 'active'
  | 'starting'
  | 'attention'
  | 'inactive'
  | 'stale';

export function getDriverLocationQualityMessage(
  location: {
    accuracy: unknown;
    timestamp: unknown;
    latitude: unknown;
    longitude: unknown;
  },
  now = Date.now(),
): string | null {
  if (
    typeof location.accuracy !== 'number' ||
    !Number.isFinite(location.accuracy) ||
    location.accuracy < 0
  ) {
    return 'Le téléphone ne fournit pas de précision GPS exploitable. Vérifiez la localisation précise dans les réglages.';
  }

  if (location.accuracy > DRIVER_LOCATION_MAX_ACCURACY_METERS) {
    return `Le GPS est trop imprécis (±${Math.round(location.accuracy)} m). Activez la localisation précise et sortez vers un espace dégagé, puis réessayez.`;
  }

  const snapshot = location as DriverLocationSnapshot;
  if (!isFreshDriverLocation(snapshot, now)) {
    return 'Le téléphone n’a pas fourni de position GPS récente. Gardez l’application ouverte et réessayez.';
  }

  return null;
}

export function isPlausibleDriverLocationUpdate(
  previous: DriverLocationSnapshot | null | undefined,
  next: DriverLocationSnapshot,
): boolean {
  if (!isFreshDriverLocation(next)) return false;
  if (!previous || !isFreshDriverLocation(previous)) return true;

  const elapsedSeconds = (next.timestamp - previous.timestamp) / 1_000;
  if (elapsedSeconds <= 0) return false;

  const latitudeRadians = (previous.latitude * Math.PI) / 180;
  const nextLatitudeRadians = (next.latitude * Math.PI) / 180;
  const latitudeDelta = nextLatitudeRadians - latitudeRadians;
  const longitudeDelta =
    ((next.longitude - previous.longitude) * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeRadians) *
      Math.cos(nextLatitudeRadians) *
      Math.sin(longitudeDelta / 2) ** 2;
  const distanceMeters =
    6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  const uncertaintyAllowance = Math.max(
    30,
    previous.accuracy + next.accuracy,
  );
  const maximumPlausibleDistance =
    uncertaintyAllowance + MAX_DRIVER_SPEED_METERS_PER_SECOND * elapsedSeconds;

  return distanceMeters <= maximumPlausibleDistance;
}

export function reconcileGpsStateWithLocation(
  currentState: DriverGpsState,
  hasRecentServerUpdate: boolean,
): DriverGpsState {
  if (currentState === 'active' && !hasRecentServerUpdate) return 'stale';
  if (currentState === 'stale' && hasRecentServerUpdate) return 'active';
  return currentState;
}