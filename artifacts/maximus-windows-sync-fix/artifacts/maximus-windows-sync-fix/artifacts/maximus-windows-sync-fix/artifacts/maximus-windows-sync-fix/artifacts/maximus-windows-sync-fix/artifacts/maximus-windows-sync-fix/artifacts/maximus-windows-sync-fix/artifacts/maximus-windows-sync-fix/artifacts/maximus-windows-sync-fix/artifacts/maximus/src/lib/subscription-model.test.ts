import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSubscriptionForCompany, subscriptionPlans } from './subscription-model';
import { emptyStoreData } from './store';

test('crée une souscription initiale cohérente avec le nombre de modules', () => {
  const subscription = buildSubscriptionForCompany({
    companyId: 'new-company',
    createdAt: '2026-09-06',
    moduleIds: ['commerce', 'stocks'],
  });

  assert.equal(subscription.planId, 'essential');
  assert.equal(subscription.status, 'ACTIF');
  assert.equal(subscription.paymentStatus, 'NON CONFIGURÉ');
  assert.deepEqual(subscription.moduleIds, ['commerce', 'stocks']);
  assert.equal(subscription.invoices.length, 0);
});

test('le catalogue expose les limites et les prix de chaque plan', () => {
  assert.deepEqual(subscriptionPlans.map(plan => plan.id), ['essential', 'growth', 'scale']);
  assert.ok(subscriptionPlans.every(plan => plan.monthlyAmount > 0));
  assert.ok(subscriptionPlans.every(plan => plan.limits.employees > 0 && plan.limits.modules > 0 && plan.limits.storageGb > 0));
});

test('le magasin initial ne contient aucune entreprise ou souscription fictive', () => {
  const data = emptyStoreData();

  assert.equal(data.companies.length, 0);
  assert.equal(data.subscriptions.length, 0);
});