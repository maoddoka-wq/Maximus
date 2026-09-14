import { requestJson } from '@/lib/api-request';

export type DriverStatus = 'ACTIVE' | 'INACTIVE';
export type VehicleStatus = 'AVAILABLE' | 'ON_TRIP' | 'MAINTENANCE';
export type TripStatus = 'REQUESTED' | 'OFFERED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export interface TransportSettings {
  gpsValidityMinutes: number;
  trackingIntervalSeconds: number;
  heroImageUrl: string;
  heroImageData?: string | null;
}

export interface Driver {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  licenseNumber: string;
  status: DriverStatus;
  employeeId: string | null;
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt: string | null;
}

export interface Vehicle {
  id: string;
  companyId: string;
  registration: string;
  model: string;
  vehicleType: string;
  driverId: string | null;
  status: VehicleStatus;
  imageUrl: string | null;
}

export interface Trip {
  id: string;
  companyId: string;
  reference: string;
  pickup: string;
  destination: string;
  passengerName: string;
  passengerPhone: string;
  fare: number;
  driverId: string | null;
  vehicleId: string | null;
  status: TripStatus;
  requestedAt: string;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  matchedDistanceKm?: number | null;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
  routeDistanceKm?: number | null;
  routeDurationMinutes?: number | null;
  routeGeometry?: GeoJsonLineString | null;
  pickupRouteDistanceKm?: number | null;
  pickupEtaMinutes?: number | null;
  pickupRouteGeometry?: GeoJsonLineString | null;
  driverName?: string | null;
  driverPhone?: string | null;
}

export interface GeoJsonLineString {
  type: 'LineString';
  coordinates: Array<[number, number]>;
}

export interface TransportMetrics {
  activeDrivers: number;
  availableVehicles: number;
  todayTrips: number;
  todayRevenue: number;
}

export interface TransportBootstrap {
  drivers: Driver[];
  vehicles: Vehicle[];
  trips: Trip[];
  metrics: TransportMetrics;
  settings: TransportSettings;
}

export interface CreateDriverInput {
  employeeId: string;
  licenseNumber: string;
  status: DriverStatus;
}

export interface CreateVehicleInput {
  registration: string;
  model: string;
  vehicleType: string;
  driverId: string;
  status: VehicleStatus;
  imageData: string;
}

export interface CreateTripInput {
  pickup: string;
  destination: string;
  passengerName: string;
  passengerPhone: string;
  fare: number;
  driverId?: string;
  vehicleId?: string;
}

export interface PublicTransportTrip {
  id: string;
  companyId: string;
  reference: string;
  pickup: string;
  destination: string;
  passengerName: string;
  passengerPhone: string;
  fare: number;
  driverId: string | null;
  vehicleId: string | null;
  status: TripStatus;
  requestedAt: string;
  matchedDistanceKm: number | null;
  driverName: string | null;
  driverPhone: string | null;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  routeDistanceKm: number | null;
  routeDurationMinutes: number | null;
  routeGeometry: GeoJsonLineString | null;
  pickupRouteDistanceKm: number | null;
  pickupEtaMinutes: number | null;
  pickupRouteGeometry: GeoJsonLineString | null;
  driverLatitude: number | null;
  driverLongitude: number | null;
  vehicleModel: string | null;
  vehicleRegistration: string | null;
  vehicleType: string | null;
  vehicleImageUrl: string | null;
}

export interface PublicTransportQuote {
  quoteToken: string;
  destination: string;
  destinationLatitude: number;
  destinationLongitude: number;
  distanceKm: number;
  durationMinutes: number;
  fare: number;
  geometry: GeoJsonLineString;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return requestJson<T>(path, init, {
    fallbackMessage: 'Le service transport est momentanément indisponible.',
  });
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  body: JSON.stringify(body),
  headers: { 'Content-Type': 'application/json' },
});

export const createTransportApi = (companyId: string) => {
  const withCompany = (path: string) => `${path}${path.includes('?') ? '&' : '?'}companyId=${encodeURIComponent(companyId)}`;

  return {
    bootstrap: () => request<TransportBootstrap>(withCompany('/transport/bootstrap')),
    updateSettings: (body: TransportSettings) => request<TransportSettings>(withCompany('/transport/settings'), {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
    createDriver: (body: CreateDriverInput) => request<Driver>(withCompany('/transport/drivers'), json(body)),
    updateDriverLocation: (id: string, body: { latitude: number; longitude: number }) =>
      request<Driver>(withCompany(`/transport/drivers/${encodeURIComponent(id)}/location`), {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      }),
    createVehicle: (body: CreateVehicleInput) => request<Vehicle>(withCompany('/transport/vehicles'), json(body)),
    createTrip: (body: CreateTripInput) => request<Trip>(withCompany('/transport/trips'), json(body)),
    updateTripStatus: (id: string, status: TripStatus) =>
      request<Trip>(withCompany(`/transport/trips/${encodeURIComponent(id)}/status`), {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        headers: { 'Content-Type': 'application/json' },
      }),
  };
};

export const createPublicTransportApi = (slug?: string, domain = false) => ({
  getSettings: () => request<{ heroImageUrl: string }>(
    domain ? '/shop-domain/transport/settings' : `/shop/${encodeURIComponent(slug ?? '')}/transport/settings`,
  ),
  quote: (body: {
    destination: string;
    pickupLatitude: number;
    pickupLongitude: number;
  }) => request<PublicTransportQuote>(
    domain ? '/shop-domain/transport/quote' : `/shop/${encodeURIComponent(slug ?? '')}/transport/quote`,
    json(body),
  ),
  createTrip: (body: {
    pickup: string;
    destination: string;
    passengerName: string;
    passengerPhone: string;
    pickupLatitude: number;
    pickupLongitude: number;
    quoteToken?: string;
  }) => request<{ trip: PublicTransportTrip; matched: boolean; message: string }>(
    domain ? '/shop-domain/transport/trips' : `/shop/${encodeURIComponent(slug ?? '')}/transport/trips`,
    json(body),
  ),
  getTrip: (id: string) => request<{ trip: PublicTransportTrip; matched: boolean; message: string }>(
    domain ? `/shop-domain/transport/trips/${encodeURIComponent(id)}` : `/shop/${encodeURIComponent(slug ?? '')}/transport/trips/${encodeURIComponent(id)}`,
  ),
});