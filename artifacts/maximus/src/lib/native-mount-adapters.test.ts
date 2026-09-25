import assert from 'node:assert/strict';
import test from 'node:test';
import { getNativeMountAdapter, isNativeMountSupported } from './native-mount-adapters';

test('supports only the first native stock references mount', () => {
  assert.equal(isNativeMountSupported('stocks', 'references'), true);
  assert.equal(isNativeMountSupported('stocks', 'products'), false);
  assert.equal(isNativeMountSupported('commerce', 'sales'), false);
  assert.equal(getNativeMountAdapter('stocks', 'references')?.id, 'stocks/references');
});