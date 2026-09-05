import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSidebarFeatureGroups } from './sidebar-navigation';
import { getConfiguredModules } from './store';

const configuredModules = getConfiguredModules({});

test('le menu latéral générique respecte les fonctionnalités sélectionnées', () => {
  const groups = buildSidebarFeatureGroups({
    allowed: ['finance'],
    configuredModules,
    employeeRole: {
      id: 'finance-reader',
      name: 'Lecteur finance',
      description: '',
      modulePermissions: {
        'finance:menu:suivi-des-paiements': ['voir'],
      },
    },
    employeeNode: null,
  });

  assert.deepEqual(groups[0]?.items.map(item => item.href), [
    '/kora/finance?feature=suivi-des-paiements',
  ]);
});

test('le menu Stock utilise les identifiants des sous-modules', () => {
  const groups = buildSidebarFeatureGroups({
    allowed: ['stocks'],
    configuredModules,
    employeeRole: null,
    employeeNode: null,
    stockPermissions: {
      products: ['voir'],
    },
  });

  assert.deepEqual(groups[0]?.items.map(item => item.href), [
    '/kora/stocks?tab=products',
  ]);
});