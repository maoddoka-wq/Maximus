import { requestJson } from '@/lib/api-request';

export type DriverStatus = 'ACTIVE' | 'INACTIVE';
export type VehicleStatus = 'AVAILABLE' | 'ON_TRIP' | 'MAINTENANCE';
export type TripStatus = 'REQUESTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Driver {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  licenseNumber: string;
  status: DriverStatus;
}

export interface Vehicle {
  id: string;
  companyId: string;
  registration: string;
  model: string;
  vehicleType: string;
  status: VehicleStatus;
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
}

export interface CreateDriverInput {
  name: string;
  phone: string;
  licenseNumber: string;
  status: DriverStatus;
}

export interface CreateVehicleInput {
  registration: string;
  model: string;
  vehicleType: string;
  status: VehicleStatus;
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
    createDriver: (body: CreateDriverInput) => request<Driver>(withCompany('/transport/drivers'), json(body)),
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