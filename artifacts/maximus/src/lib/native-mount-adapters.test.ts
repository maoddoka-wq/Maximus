import assert from 'node:assert/strict';
import test from 'node:test';
import { getNativeMountAdapter, isNativeMountSupported } from './native-mount-adapters';

test('supports native stock references and product mounts only', () => {
  assert.equal(isNativeMountSupported('stocks', 'references'), true);
  assert.equal(isNativeMountSupported('stocks', 'products'), true);
  assert.equal(isNativeMountSupported('stocks', 'entries'), false);
  assert.equal(isNativeMountSupported('commerce', 'sales'), false);
  assert.equal(getNativeMountAdapter('stocks', 'references')?.id, 'stocks/references');
  assert.equal(getNativeMountAdapter('stocks', 'products')?.id, 'stocks/products');
});