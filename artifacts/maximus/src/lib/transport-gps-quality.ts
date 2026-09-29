export const MAX_TRANSPORT_GPS_ACCURACY_METERS = 100;
export const TRANSPORT_GPS_ACQUISITION_TIMEOUT_MS = 60_000;
const MAX_TRANSPORT_GPS_SAMPLE_AGE_MS = 60_000;
const MAX_TRANSPORT_GPS_FUTURE_SKEW_MS = 30_000;

export type TransportGpsTimeoutScheduler = {
  setTimeout: (callback: () => void, delayMs: number) => unknown;
  clearTimeout: (handle: unknown) => void;
};

const defaultTransportGpsTimeoutScheduler: TransportGpsTimeoutScheduler = {
  setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
  clearTimeout: handle => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function createTransportGpsTimeout(
  onTimeout: () => void,
  scheduler = defaultTransportGpsTimeoutScheduler,
) {
  let handle: unknown;
  let hasHandle = false;
  let cancelled = false;
  let generation = 0;

  const reset = () => {
    if (cancelled) return;
    if (hasHandle) scheduler.clearTimeout(handle);

    const currentGeneration = ++generation;
    hasHandle = true;
    handle = scheduler.setTimeout(() => {
      if (cancelled || currentGeneration !== generation) return;
      hasHandle = false;
      handle = undefined;
      cancelled = true;
      onTimeout();
    }, TRANSPORT_GPS_ACQUISITION_TIMEOUT_MS);
  };

  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    generation += 1;
    if (hasHandle) scheduler.clearTimeout(handle);
    hasHandle = false;
    handle = undefined;
  };

  reset();
  return { reset, cancel };
}

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