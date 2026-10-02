import assert from "node:assert/strict";
import test from "node:test";
import {
  FOREGROUND_LOCATION_UPDATE_OPTIONS,
  reconcileGpsStateWithLocation,
} from "../src/services/location-sync-policy.ts";
import {
  DRIVER_LOCATION_MAX_AGE_MS,
  getFreshDriverLocationCoordinates,
} from "../src/lib/trip-map-geometry.ts";

test("requests regular foreground GPS updates while the driver is stationary", () => {
  assert.deepEqual(FOREGROUND_LOCATION_UPDATE_OPTIONS, {
    timeInterval: 15_000,
    distanceInterval: 0,
  });
});

test("only uploads fresh, valid native GPS fixes", () => {
  const now = 1_800_000_000_000;
  const current = {
    latitude: 14.7167,
    longitude: -17.4677,
    timestamp: now,
  };

  assert.deepEqual(getFreshDriverLocationCoordinates(current, now), {
    latitude: current.latitude,
    longitude: current.longitude,
  });
  assert.equal(
    getFreshDriverLocationCoordinates(
      { ...current, timestamp: now - DRIVER_LOCATION_MAX_AGE_MS - 1 },
      now,
    ),
    null,
  );
  assert.equal(
    getFreshDriverLocationCoordinates({ ...current, timestamp: now + 1 }, now),
    null,
  );
  assert.equal(
    getFreshDriverLocationCoordinates({ ...current, latitude: 91 }, now),
    null,
  );
});

test("marks active GPS stale when no recent server-acknowledged fix exists", () => {
  assert.equal(reconcileGpsStateWithLocation("active", false), "stale");
  assert.equal(reconcileGpsStateWithLocation("active", true), "active");
});

test("restores active GPS state after a recent server-acknowledged fix", () => {
  assert.equal(reconcileGpsStateWithLocation("stale", true), "active");
});

test("does not override setup and permission states based on old location data", () => {
  assert.equal(reconcileGpsStateWithLocation("starting", false), "starting");
  assert.equal(reconcileGpsStateWithLocation("attention", false), "attention");
  assert.equal(reconcileGpsStateWithLocation("inactive", false), "inactive");
});