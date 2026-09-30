export function isDriverAvailableWithActiveGps(
  serverAvailability: string,
  gpsActive: boolean,
): boolean {
  return serverAvailability === 'AVAILABLE' && gpsActive;
}