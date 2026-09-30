import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSerializedLocationOperationQueue } from '../src/services/serialized-location-operation-queue.ts';

test('serializes manual GPS activation and app-resume requests', async () => {
  const serialize = createSerializedLocationOperationQueue();
  let taskStarted = false;
  let nativeStartCalls = 0;
  let activeNativeStarts = 0;
  let maxActiveNativeStarts = 0;
  let releaseNativeStart;
  const nativeStartGate = new Promise((resolve) => {
    releaseNativeStart = resolve;
  });

  const ensureTaskStarted = () =>
    serialize(async () => {
      if (taskStarted) return 'already-running';

      nativeStartCalls += 1;
      activeNativeStarts += 1;
      maxActiveNativeStarts = Math.max(
        maxActiveNativeStarts,
        activeNativeStarts,
      );
      await nativeStartGate;
      taskStarted = true;
      activeNativeStarts -= 1;
      return 'started';
    });

  const manualActivation = ensureTaskStarted();
  const appResume = ensureTaskStarted();

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(nativeStartCalls, 1);
  assert.equal(activeNativeStarts, 1);
  assert.equal(typeof releaseNativeStart, 'function');

  releaseNativeStart();

  assert.deepEqual(await Promise.all([manualActivation, appResume]), [
    'started',
    'already-running',
  ]);
  assert.equal(nativeStartCalls, 1);
  assert.equal(maxActiveNativeStarts, 1);
});

test('continues processing GPS operations after one operation rejects', async () => {
  const serialize = createSerializedLocationOperationQueue();
  const failedOperation = serialize(async () => {
    throw new Error('simulated native transition failure');
  });
  const nextOperation = serialize(async () => 'next operation ran');

  await assert.rejects(failedOperation, /simulated native transition failure/);
  assert.equal(await nextOperation, 'next operation ran');
});