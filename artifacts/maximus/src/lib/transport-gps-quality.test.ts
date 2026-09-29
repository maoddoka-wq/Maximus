import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createTransportGpsTimeout,
  isNewerTransportGpsSample,
  isRecentTransportGpsSample,
  isTransportGpsAccuracyAcceptable,
  MAX_TRANSPORT_GPS_ACCURACY_METERS,
  TRANSPORT_GPS_ACQUISITION_TIMEOUT_MS,
} from './transport-gps-quality';

test('termine la recherche après une minute et ignore un ancien délai réarmé', () => {
  let nextHandle = 0;
  const callbacks: Array<() => void> = [];
  const clearedHandles: unknown[] = [];
  let expired = 0;
  const watchdog = createTransportGpsTimeout(
    () => { expired += 1; },
    {
      setTimeout: (callback, delayMs) => {
        assert.equal(delayMs, TRANSPORT_GPS_ACQUISITION_TIMEOUT_MS);
        callbacks.push(callback);
        return ++nextHandle;
      },
      clearTimeout: handle => clearedHandles.push(handle),
    },
  );

  watchdog.reset();
  assert.deepEqual(clearedHandles, [1]);
  callbacks[0]();
  assert.equal(expired, 0);
  callbacks[1]();
  assert.equal(expired, 1);

  watchdog.cancel();
  assert.equal(expired, 1);
});

test('annule le délai GPS lorsque le suivi est arrêté', () => {
  let expired = 0;
  let scheduledCallback: (() => void) | undefined;
  let cleared = false;
  const watchdog = createTransportGpsTimeout(
    () => { expired += 1; },
    {
      setTimeout: callback => {
        scheduledCallback = callback;
        return 1;
      },
      clearTimeout: () => { cleared = true; },
    },
  );

  watchdog.cancel();
  scheduledCallback?.();

  assert.equal(cleared, true);
  assert.equal(expired, 0);
});

test('accepte une position GPS avec une précision au plus égale à 100 mètres', () => {
  assert.equal(isTransportGpsAccuracyAcceptable(0), true);
  assert.equal(isTransportGpsAccuracyAcceptable(50), true);
  assert.equal(isTransportGpsAccuracyAcceptable(MAX_TRANSPORT_GPS_ACCURACY_METERS), true);
  assert.equal(isTransportGpsAccuracyAcceptable(100.1), false);
  assert.equal(isTransportGpsAccuracyAcceptable(-1), false);
  assert.equal(isTransportGpsAccuracyAcceptable(Number.NaN), false);
});

test('refuse les positions trop anciennes ou horodatées dans le futur', () => {
  const now = 1_000_000;
  assert.equal(isRecentTransportGpsSample(now, now), true);
  assert.equal(isRecentTransportGpsSample(now - 60_000, now), true);
  assert.equal(isRecentTransportGpsSample(now - 60_001, now), false);
  assert.equal(isRecentTransportGpsSample(now + 30_000, now), true);
  assert.equal(isRecentTransportGpsSample(now + 30_001, now), false);
  assert.equal(isRecentTransportGpsSample(Number.NaN, now), false);
});

test('ignore les relevés GPS répétés, désordonnés ou sans horodatage valide', () => {
  assert.equal(isNewerTransportGpsSample(null, 1_000), true);
  assert.equal(isNewerTransportGpsSample(1_000, 1_001), true);
  assert.equal(isNewerTransportGpsSample(1_000, 1_000), false);
  assert.equal(isNewerTransportGpsSample(1_000, 999), false);
  assert.equal(isNewerTransportGpsSample(1_000, Number.NaN), false);
});