import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isNewerTransportGpsSample,
  isTransportGpsAccuracyAcceptable,
  MAX_TRANSPORT_GPS_ACCURACY_METERS,
} from './transport-gps-quality';

test('accepte une position GPS avec une précision au plus égale à 100 mètres', () => {
  assert.equal(isTransportGpsAccuracyAcceptable(0), true);
  assert.equal(isTransportGpsAccuracyAcceptable(50), true);
  assert.equal(isTransportGpsAccuracyAcceptable(MAX_TRANSPORT_GPS_ACCURACY_METERS), true);
  assert.equal(isTransportGpsAccuracyAcceptable(100.1), false);
  assert.equal(isTransportGpsAccuracyAcceptable(-1), false);
  assert.equal(isTransportGpsAccuracyAcceptable(Number.NaN), false);
});

test('ignore les relevés GPS répétés, désordonnés ou sans horodatage valide', () => {
  assert.equal(isNewerTransportGpsSample(null, 1_000), true);
  assert.equal(isNewerTransportGpsSample(1_000, 1_001), true);
  assert.equal(isNewerTransportGpsSample(1_000, 1_000), false);
  assert.equal(isNewerTransportGpsSample(1_000, 999), false);
  assert.equal(isNewerTransportGpsSample(1_000, Number.NaN), false);
});