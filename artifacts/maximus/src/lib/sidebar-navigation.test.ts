import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSidebarFeatureGroups } from './sidebar-navigation';
import { getConfiguredModules } from './store';

const configuredModules = getConfiguredModules({});

test('le menu latéral générique respecte les fonctionnalités sélectionnées', () => {
  const groups = buildSidebarFeatureGroups({
    allowed: ['commerce'],
    configuredModules,
    employeeRole: {
      id: 'commerce-reader',
      name: 'Lecteur commerce',
      description: '',
      modulePermissions: {
        'commerce:menu:sales': ['voir'],
      },
    },
    employeeNode: null,
    commerceTabIds: ['sales'],
  });

  assert.deepEqual(groups[0]?.items.map(item => item.href), [
    '/entreprise/commerce?tab=sales',
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
    '/entreprise/stocks?tab=products',
  ]);
});

test('un administrateur d’entreprise voit les fonctionnalités de ses modules', () => {
  const groups = buildSidebarFeatureGroups({
    allowed: ['commerce', 'stocks'],
    configuredModules,
    employeeRole: null,
    employeeNode: null,
    companyAdmin: true,
  });

  assert.deepEqual(groups.map(group => group.label), [
    'Gestion commerciale',
    'Gestion de stock',
  ]);
  assert.ok(groups[0]?.items.some(item => item.href === '/entreprise/commerce?tab=dashboard'));
  assert.ok(groups[1]?.items.some(item => item.href === '/entreprise/stocks?tab=products'));
});