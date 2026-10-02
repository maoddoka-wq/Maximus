import assert from "node:assert/strict";
import test from "node:test";
import {
  FOREGROUND_LOCATION_UPDATE_OPTIONS,
  reconcileGpsStateWithLocation,
} from "../src/services/location-sync-policy.ts";

test("requests regular foreground GPS updates while the driver is stationary", () => {
  assert.deepEqual(FOREGROUND_LOCATION_UPDATE_OPTIONS, {
    timeInterval: 15_000,
    distanceInterval: 0,
  });
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