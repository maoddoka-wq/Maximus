import assert from 'node:assert/strict';
import test from 'node:test';
import { canRetryVitePreload } from './vite-preload-recovery';

test('allows one recovery when no preload retry is recorded', () => {
  assert.equal(canRetryVitePreload(null, 10_000), true);
});

test('blocks another recovery during the retry window', () => {
  assert.equal(canRetryVitePreload('10000', 20_000), false);
});

test('allows recovery after the retry window expires', () => {
  assert.equal(canRetryVitePreload('10000', 70_000), true);
});

test('allows recovery when the stored timestamp is invalid', () => {
  assert.equal(canRetryVitePreload('not-a-timestamp', 20_000), true);
});