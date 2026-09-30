export function isDriverAvailableWithActiveGps(
  serverAvailability: string,
  gpsActive: boolean,
): boolean {
  return serverAvailability === 'AVAILABLE' && gpsActive;
}

export function shouldPauseAvailableDriver(
  serverAvailability: string,
  canUpdateAvailability: boolean,
  hasAssignedOrInProgressTrip: boolean,
): boolean {
  return (
    serverAvailability === 'AVAILABLE' &&
    canUpdateAvailability &&
    !hasAssignedOrInProgressTrip
  );
}