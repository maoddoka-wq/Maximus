export const MAX_TRANSPORT_GPS_ACCURACY_METERS = 100;
export const TRANSPORT_GPS_ACQUISITION_TIMEOUT_MS = 60_000;
const MAX_TRANSPORT_GPS_SAMPLE_AGE_MS = 60_000;
const MAX_TRANSPORT_GPS_FUTURE_SKEW_MS = 30_000;

export function isTransportGpsAccuracyAcceptable(accuracy: number): boolean {
  return Number.isFinite(accuracy)
    && accuracy >= 0
    && accuracy <= MAX_TRANSPORT_GPS_ACCURACY_METERS;
}

export function isRecentTransportGpsSample(timestamp: number, now = Date.now()): boolean {
  return Number.isFinite(timestamp)
    && timestamp >= now - MAX_TRANSPORT_GPS_SAMPLE_AGE_MS
    && timestamp <= now + MAX_TRANSPORT_GPS_FUTURE_SKEW_MS;
}

export function isNewerTransportGpsSample(
  previousTimestamp: number | null,
  nextTimestamp: number,
): boolean {
  return Number.isFinite(nextTimestamp)
    && (previousTimestamp === null || nextTimestamp > previousTimestamp);
}