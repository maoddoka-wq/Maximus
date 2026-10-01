import assert from 'node:assert/strict';
import test from 'node:test';
import { filterSubscriptionsForVisibleCompanies } from './subscription-visibility';

test('retire des abonnements visibles les entreprises supprimées ou archivées sans effacer leur historique', () => {
  const subscriptions = [
    { id: 'active-subscription', companyId: 'active-company' },
    { id: 'deleted-company-subscription', companyId: 'deleted-company' },
    { id: 'archived-company-subscription', companyId: 'archived-company' },
  ];
  const companies = [
    { id: 'active-company', status: 'ACTIF' },
    { id: 'archived-company', status: 'ARCHIVÉ' },
  ];

  assert.deepEqual(
    filterSubscriptionsForVisibleCompanies(subscriptions, companies).map(({ id }) => id),
    ['active-subscription'],
  );
  assert.equal(subscriptions.length, 3);
});