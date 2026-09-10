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

test('le menu Paie utilise une icône distincte pour chaque fonctionnalité', () => {
  const groups = buildSidebarFeatureGroups({
    allowed: ['paie'],
    configuredModules,
    employeeRole: null,
    employeeNode: null,
    companyAdmin: true,
  });
  const items = groups[0]?.items ?? [];

  assert.deepEqual(items.map(item => item.href), [
    '/entreprise/paie?feature=tableau-de-bord',
    '/entreprise/paie?feature=bénéficiaires',
    '/entreprise/paie?feature=préparer-une-paie',
    '/entreprise/paie?feature=validation',
    '/entreprise/paie?feature=virements',
    '/entreprise/paie?feature=solde-de-paie',
    '/entreprise/paie?feature=historique',
  ]);
  assert.equal(new Set(items.map(item => item.icon)).size, items.length);
});

test('le menu e-commerce expose les catégories avec le catalogue', () => {
  const groups = buildSidebarFeatureGroups({
    allowed: ['ecommerce'],
    configuredModules,
    employeeRole: null,
    employeeNode: null,
    companyAdmin: true,
    selectedFeatureIdsByModule: {
      ecommerce: ['dashboard', 'catalogue'],
    },
  });

  assert.deepEqual(groups[0]?.items.map(item => item.href), [
    '/entreprise/ecommerce?tab=dashboard',
    '/entreprise/ecommerce?tab=catalogue',
    '/entreprise/ecommerce?tab=categories',
  ]);
});