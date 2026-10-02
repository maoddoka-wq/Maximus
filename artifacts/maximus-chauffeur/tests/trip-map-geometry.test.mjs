import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DRIVER_LOCATION_MAX_AGE_MS,
  geometryPoints,
  getTripNavigationUrl,
  isFreshDriverLocation,
  pointFromCoordinates,
} from '../src/lib/trip-map-geometry.ts';

test('keeps latitude and longitude in their named order', () => {
  assert.deepEqual(pointFromCoordinates(14.7167, -17.4677), {
    latitude: 14.7167,
    longitude: -17.4677,
  });
});

test('converts GeoJSON coordinate pairs from longitude-latitude order', () => {
  assert.deepEqual(
    geometryPoints({
      type: 'LineString',
      coordinates: [
        [-17.4677, 14.7167],
        [-17.45, 14.73],
      ],
    }),
    [
      { latitude: 14.7167, longitude: -17.4677 },
      { latitude: 14.73, longitude: -17.45 },
    ],
  );
});

test('rejects missing, string, and out-of-range coordinates', () => {
  assert.equal(pointFromCoordinates(null, -17.4), null);
  assert.equal(pointFromCoordinates('14.7', -17.4), null);
  assert.equal(pointFromCoordinates(91, -17.4), null);
  assert.deepEqual(geometryPoints({ coordinates: [['14.7', -17.4]] }), []);
});

test('accepts only recent driver GPS fixes', () => {
  const now = 1_800_000_000_000;
  const current = {
    latitude: 14.7167,
    longitude: -17.4677,
    timestamp: now,
  };

  assert.equal(isFreshDriverLocation(current, now), true);
  assert.equal(
    isFreshDriverLocation(
      { ...current, timestamp: now - DRIVER_LOCATION_MAX_AGE_MS - 1 },
      now,
    ),
    false,
  );
  assert.equal(
    isFreshDriverLocation({ ...current, timestamp: now + 1 }, now),
    false,
  );
});

test('guidance targets the pickup first, then the destination during the trip', () => {
  const trip = {
    status: 'ASSIGNED',
    pickupLatitude: 14.7167,
    pickupLongitude: -17.4677,
    destinationLatitude: 14.73,
    destinationLongitude: -17.45,
  };

  assert.equal(
    getTripNavigationUrl(trip),
    'https://www.google.com/maps/dir/?api=1&destination=14.7167,-17.4677&travelmode=driving',
  );
  assert.equal(
    getTripNavigationUrl({ ...trip, status: 'IN_PROGRESS' }),
    'https://www.google.com/maps/dir/?api=1&destination=14.73,-17.45&travelmode=driving',
  );
});