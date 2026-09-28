import assert from 'node:assert/strict';
import test from 'node:test';
import {
  driverGpsOptions,
  getDriverGpsErrorMessage,
  shouldBlockDriverWorkspaceOnGpsError,
} from './driver-geolocation';

test('attend un relevé GPS plus longtemps et accepte une position récente en cache', () => {
  assert.deepEqual(driverGpsOptions, {
    enableHighAccuracy: true,
    maximumAge: 15_000,
    timeout: 45_000,
  });
});

test('bloque l’accès avant la première position confirmée, pas après un relevé réussi', () => {
  assert.equal(shouldBlockDriverWorkspaceOnGpsError(false), true);
  assert.equal(shouldBlockDriverWorkspaceOnGpsError(true), false);
});

test('explique les autorisations Android et les délais d’obtention du GPS', () => {
  assert.match(getDriverGpsErrorMessage(1), /Chrome/);
  assert.match(getDriverGpsErrorMessage(2), /localisation précise/);
  assert.match(getDriverGpsErrorMessage(3), /plus de temps/);
});