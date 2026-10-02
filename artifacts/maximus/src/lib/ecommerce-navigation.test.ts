import assert from 'node:assert/strict';
import test from 'node:test';
import { isEcommerceTabVisible } from './ecommerce-navigation';

test('keeps the sales report discoverable without granting access to sales data', () => {
  assert.equal(isEcommerceTabVisible('rapport-ventes', ['dashboard']), true);
});

test('continues to hide operation tabs that the role does not have', () => {
  assert.equal(isEcommerceTabVisible('commandes', ['dashboard']), false);
  assert.equal(isEcommerceTabVisible('commandes', ['commandes']), true);
});

test('keeps categories available with catalogue access', () => {
  assert.equal(isEcommerceTabVisible('categories', ['catalogue']), true);
  assert.equal(isEcommerceTabVisible('categories', ['commandes']), false);
});