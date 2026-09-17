import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { createEcommerceApi, publicEcommerceApi } from './ecommerce-api';

describe('ecommerce-api module', () => {
  test('creates API client correctly', () => {
    const api = createEcommerceApi('company-123');
    assert.ok(api);
  });
  
  test('creates public API client correctly', () => {
    assert.ok(publicEcommerceApi);
  });
});
