import type { Driver, Trip } from '@/lib/transport-api';

type DriverNavigationTrip = Pick<Trip, 'pickupLatitude' | 'pickupLongitude'>;
type DriverNavigationPosition = Pick<Driver, 'latitude' | 'longitude'> | null;

const hasCoordinates = (latitude: number | null | undefined, longitude: number | null | undefined): latitude is number =>
  latitude !== null
  && latitude !== undefined
  && longitude !== null
  && longitude !== undefined
  && Number.isFinite(latitude)
  && Number.isFinite(longitude);

/**
 * Opens the first navigation leg: the driver's current phone position to the
 * passenger pickup point. The final passenger destination must not be used
 * until the passenger has been collected.
 */
export function buildDriverNavigationUrl(trip: DriverNavigationTrip, _driver: DriverNavigationPosition): string | null {
  if (!hasCoordinates(trip.pickupLatitude, trip.pickupLongitude)) return null;

  const params = new URLSearchParams({
    api: '1',
    destination: `${trip.pickupLatitude},${trip.pickupLongitude}`,
    travelmode: 'driving',
    dir_action: 'navigate',
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}