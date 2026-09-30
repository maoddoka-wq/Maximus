export function canResumeLocationTracking(
  explicitConsent: boolean,
  locationServicesEnabled: boolean,
  foregroundPermissionGranted: boolean,
): boolean {
  return (
    explicitConsent &&
    locationServicesEnabled &&
    foregroundPermissionGranted
  );
}