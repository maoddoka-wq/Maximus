import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isPublicIntelligentRegistrationEnabled } from './registration-policy';

test('a disabled catalog stays disabled on a central installation', () => {
  assert.equal(isPublicIntelligentRegistrationEnabled(false, true), false);
});

test('a missing catalog value does not expose intelligent registration', () => {
  assert.equal(isPublicIntelligentRegistrationEnabled(null, true), false);
});

test('an installation-level restriction disables intelligent registration', () => {
  assert.equal(isPublicIntelligentRegistrationEnabled(true, false), false);
});

test('an enabled catalog is available when the installation permits it', () => {
  assert.equal(isPublicIntelligentRegistrationEnabled(true, true), true);
});