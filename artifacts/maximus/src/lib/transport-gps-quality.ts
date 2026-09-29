export const MAX_TRANSPORT_GPS_ACCURACY_METERS = 100;

export function isTransportGpsAccuracyAcceptable(accuracy: number): boolean {
  return Number.isFinite(accuracy)
    && accuracy >= 0
    && accuracy <= MAX_TRANSPORT_GPS_ACCURACY_METERS;
}

export function isNewerTransportGpsSample(
  previousTimestamp: number | null,
  nextTimestamp: number,
): boolean {
  return Number.isFinite(nextTimestamp)
    && (previousTimestamp === null || nextTimestamp > previousTimestamp);
}