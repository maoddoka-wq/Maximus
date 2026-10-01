import assert from 'node:assert/strict';
import test from 'node:test';

import {
  companyWorkspaceFeatureForPath,
  normalizeCompanyWorkspaceFeatureIds,
} from './company-workspace-features';

test('normalise les fonctionnalités visibles de l’espace entreprise', () => {
  assert.deepEqual(
    normalizeCompanyWorkspaceFeatureIds([
      'controle',
      'controle',
      'organisation',
      'ancienne-fonctionnalite',
      null,
      'guide-configuration',
      'abonnement',
    ]),
    ['controle', 'organisation', 'guide-configuration', 'abonnement'],
  );
});

test('reconnaît les routes des fonctionnalités de l’espace entreprise', () => {
  assert.equal(companyWorkspaceFeatureForPath('/entreprise/controle?filtre=ouvert'), 'controle');
  assert.equal(companyWorkspaceFeatureForPath('/entreprise/organisation/'), 'organisation');
  assert.equal(companyWorkspaceFeatureForPath('/entreprise/organisation?tab=subscription'), 'abonnement');
  assert.equal(companyWorkspaceFeatureForPath('/entreprise/guide-configuration'), 'guide-configuration');
  assert.equal(companyWorkspaceFeatureForPath('/entreprise/dashboard'), null);
});