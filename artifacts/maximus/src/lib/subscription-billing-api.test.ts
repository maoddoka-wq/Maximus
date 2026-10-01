import assert from 'node:assert/strict';
import test from 'node:test';
import { getCompanySubscriptionBillingMode } from './subscription-billing-api';

test('reconnaît le montant personnalisé nul comme le mode gratuit', () => {
  assert.equal(getCompanySubscriptionBillingMode(0), 'FREE');
});

test('traite un tarif calculé ou personnalisé positif comme le mode payant', () => {
  assert.equal(getCompanySubscriptionBillingMode(null), 'PAID');
  assert.equal(getCompanySubscriptionBillingMode(5_000), 'PAID');
});