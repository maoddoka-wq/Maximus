import assert from "node:assert/strict";
import { test } from "node:test";
import { isDriverAvailableWithActiveGps } from "../src/services/driver-availability-policy.ts";
import { canResumeLocationTracking } from "../src/services/location-resume-policy.ts";
import { createSerializedLocationOperations } from "../src/services/serialized-location-operation-queue.ts";

test("does not show a driver as available unless GPS tracking is active", () => {
  assert.equal(isDriverAvailableWithActiveGps("AVAILABLE", false), false);
  assert.equal(isDriverAvailableWithActiveGps("AVAILABLE", true), true);
  assert.equal(isDriverAvailableWithActiveGps("PAUSED", true), false);
});

test("does not resume GPS until the driver has explicitly opted in", () => {
  assert.equal(canResumeLocationTracking(false, true, true, true), false);
  assert.equal(canResumeLocationTracking(true, true, true, true), true);
});

test("does not resume GPS when phone location services or permissions are off", () => {
  assert.equal(canResumeLocationTracking(true, false, true, true), false);
  assert.equal(canResumeLocationTracking(true, true, false, true), false);
  assert.equal(canResumeLocationTracking(true, true, true, false), false);
});

test("serializes manual GPS activation and app-resume requests", async () => {
  let taskStarted = false;
  let nativeStartCalls = 0;
  let activeNativeStarts = 0;
  let maxActiveNativeStarts = 0;
  let releaseNativeStart;
  const nativeStartGate = new Promise((resolve) => {
    releaseNativeStart = resolve;
  });

  const ensureTaskStarted = async () => {
    if (taskStarted) return "already-running";

    nativeStartCalls += 1;
    activeNativeStarts += 1;
    maxActiveNativeStarts = Math.max(maxActiveNativeStarts, activeNativeStarts);
    await nativeStartGate;
    taskStarted = true;
    activeNativeStarts -= 1;
    return "started";
  };
  const operations = createSerializedLocationOperations({
    enable: ensureTaskStarted,
    resume: ensureTaskStarted,
    stop: async () => undefined,
  });

  const manualActivation = operations.enable();
  const appResume = operations.resume();

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(nativeStartCalls, 1);
  assert.equal(activeNativeStarts, 1);
  assert.equal(typeof releaseNativeStart, "function");

  releaseNativeStart();

  assert.deepEqual(await Promise.all([manualActivation, appResume]), [
    "started",
    "already-running",
  ]);
  assert.equal(nativeStartCalls, 1);
  assert.equal(maxActiveNativeStarts, 1);
});

test("continues processing GPS operations after one operation rejects", async () => {
  const operations = createSerializedLocationOperations({
    enable: async () => {
      throw new Error("simulated native transition failure");
    },
    resume: async () => "next operation ran",
    stop: async () => undefined,
  });
  const failedOperation = operations.enable();
  const nextOperation = operations.resume();

  await assert.rejects(failedOperation, /simulated native transition failure/);
  assert.equal(await nextOperation, "next operation ran");
});