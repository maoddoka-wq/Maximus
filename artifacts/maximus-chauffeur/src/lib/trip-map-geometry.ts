export type MapPoint = {
  latitude: number;
  longitude: number;
};

export type DriverLocationSnapshot = MapPoint & {
  timestamp: number;
  accuracy: number;
};

export const DRIVER_LOCATION_MAX_AGE_MS = 45_000;
export const DRIVER_LOCATION_MAX_ACCURACY_METERS = 75;

export function pointFromCoordinates(
  latitude: unknown,
  longitude: unknown,
): MapPoint | null {
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

export function geometryPoints(value: unknown): MapPoint[] {
  if (!value || typeof value !== 'object') return [];
  const coordinates = (value as { coordinates?: unknown }).coordinates;
  if (!Array.isArray(coordinates)) return [];

  return coordinates.flatMap((coordinate): MapPoint[] => {
    if (!Array.isArray(coordinate)) return [];
    const [longitude, latitude] = coordinate;
    const point = pointFromCoordinates(latitude, longitude);
    return point ? [point] : [];
  });
}

export function isFreshDriverLocation(
  location: DriverLocationSnapshot | null | undefined,
  now = Date.now(),
): location is DriverLocationSnapshot {
  if (
    !location ||
    !pointFromCoordinates(location.latitude, location.longitude) ||
    !Number.isFinite(location.timestamp) ||
    !Number.isFinite(location.accuracy) ||
    location.accuracy < 0 ||
    location.accuracy > DRIVER_LOCATION_MAX_ACCURACY_METERS
  ) {
    return false;
  }

  const age = now - location.timestamp;
  return age >= 0 && age <= DRIVER_LOCATION_MAX_AGE_MS;
}

export function getFreshDriverLocationCoordinates(
  location: DriverLocationSnapshot | null | undefined,
  now = Date.now(),
): MapPoint | null {
  if (!isFreshDriverLocation(location, now)) return null;
  return {
    latitude: location.latitude,
    longitude: location.longitude,
  };
}

type NavigationTrip = {
  status: string;
  pickupLatitude?: unknown;
  pickupLongitude?: unknown;
  destinationLatitude?: unknown;
  destinationLongitude?: unknown;
};

export function getTripNavigationUrl(trip: NavigationTrip): string | null {
  const target = trip.status === 'IN_PROGRESS'
    ? pointFromCoordinates(trip.destinationLatitude, trip.destinationLongitude)
    : pointFromCoordinates(trip.pickupLatitude, trip.pickupLongitude);
  if (!target) return null;

  return `https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}&travelmode=driving`;
}