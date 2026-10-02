export const FOREGROUND_LOCATION_UPDATE_OPTIONS = {
  timeInterval: 15_000,
  distanceInterval: 0,
} as const;

export type DriverGpsState =
  | 'active'
  | 'starting'
  | 'attention'
  | 'inactive'
  | 'stale';

export function reconcileGpsStateWithLocation(
  currentState: DriverGpsState,
  hasRecentServerUpdate: boolean,
): DriverGpsState {
  if (currentState === 'active' && !hasRecentServerUpdate) return 'stale';
  if (currentState === 'stale' && hasRecentServerUpdate) return 'active';
  return currentState;
}