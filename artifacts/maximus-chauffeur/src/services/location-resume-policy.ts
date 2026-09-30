export function canResumeLocationTracking(
  explicitConsent: boolean,
  locationServicesEnabled: boolean,
  foregroundPermissionGranted: boolean,
  backgroundPermissionGranted: boolean,
): boolean {
  return (
    explicitConsent &&
    locationServicesEnabled &&
    foregroundPermissionGranted &&
    backgroundPermissionGranted
  );
}