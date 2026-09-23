import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSidebarFeatureGroups } from './sidebar-navigation';
import { getConfiguredModules } from './store';

const configuredModules = getConfiguredModules({});

test('les fonctionnalités Immobilier Biens et Annonces gardent des routes distinctes', () => {
  const groups = buildSidebarFeatureGroups({
    allowed: ['immobilier'],
    configuredModules,
    employeeRole: null,
    employeeNode: null,
    companyAdmin: true,
  });

  const items = groups[0]?.items ?? [];
  assert.ok(items.some(item => item.label === 'Biens' && item.href === '/entreprise/immobilier?feature=biens'));
  assert.ok(items.some(item => item.label === 'Annonces' && item.href === '/entreprise/immobilier?feature=annonces'));
});

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

test('un employé retrouve les fonctionnalités de plusieurs modules dans le menu unique', () => {
  const groups = buildSidebarFeatureGroups({
    allowed: ['commerce', 'stocks'],
    configuredModules,
    employeeRole: {
      id: 'multi-module-reader',
      name: 'Lecteur multi-modules',
      description: '',
      modulePermissions: {
        'commerce:menu:sales': ['voir'],
        stocks: ['voir'],
      },
    },
    employeeNode: {
      id: 'unit-multi-module',
      companyId: 'company-test',
      name: 'Unité multi-modules',
      type: 'service',
      parentId: null,
      moduleIds: ['commerce', 'stocks'],
      moduleFeatures: {
        commerce: ['sales'],
        stocks: ['products'],
      },
    },
    commerceTabIds: ['sales'],
    stockPermissions: {
      products: ['voir'],
    },
  });

  assert.deepEqual(groups.map(group => group.label), [
    'Gestion commerciale',
    'Gestion de stock',
  ]);
  assert.deepEqual(groups.flatMap(group => group.items.map(item => item.href)), [
    '/entreprise/commerce?tab=sales',
    '/entreprise/stocks?tab=products',
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

test('le menu Transport utilise les identifiants canoniques des fonctionnalités', () => {
  const groups = buildSidebarFeatureGroups({
    allowed: ['transport'],
    configuredModules,
    employeeRole: null,
    employeeNode: null,
    companyAdmin: true,
    selectedFeatureIdsByModule: {
      transport: ['overview', 'trips', 'drivers', 'vehicles'],
    },
  });

  assert.deepEqual(groups[0]?.items.map(item => item.href), [
    '/entreprise/transport?tab=overview',
    '/entreprise/transport?tab=trips',
    '/entreprise/transport?tab=drivers',
    '/entreprise/transport?tab=vehicles',
  ]);
});

test('le menu Transport retire les fonctionnalités sans permission de lecture', () => {
  const groups = buildSidebarFeatureGroups({
    allowed: ['transport'],
    configuredModules,
    employeeRole: {
      id: 'chauffeur',
      name: 'Chauffeur',
      description: '',
      modulePermissions: {
        transport: ['voir'],
        'transport:menu:overview': ['voir'],
        'transport:menu:trips': ['voir', 'modifier'],
      },
    },
    employeeNode: {
      id: 'unit-transport',
      companyId: 'company-test',
      name: 'Transport',
      type: 'service',
      parentId: null,
      moduleIds: ['transport'],
      moduleFeatures: {
        transport: ['overview', 'trips', 'drivers', 'vehicles'],
      },
    },
  });

  assert.deepEqual(groups[0]?.items.map(item => item.href), [
    '/entreprise/transport?tab=overview',
    '/entreprise/transport?tab=trips',
  ]);
});

test('le menu Présences retire les fonctionnalités sans permission de lecture du rôle', () => {
  const groups = buildSidebarFeatureGroups({
    allowed: ['presences'],
    configuredModules,
    employeeRole: {
      id: 'presence-reader',
      name: 'Lecteur Présences',
      description: '',
      modulePermissions: {
        'presence.tableau-de-bord': ['voir'],
        'presence.horaires': ['voir'],
      },
    },
    employeeNode: {
      id: 'unit-presence',
      companyId: 'company-test',
      name: 'Présences',
      type: 'service',
      parentId: null,
      moduleIds: ['presences'],
      moduleFeatures: {
        presences: ['tableau-de-bord', 'pointage', 'absences', 'horaires', 'congés', 'historique'],
      },
    },
  });

  assert.deepEqual(groups[0]?.items.map(item => item.href), [
    '/entreprise/presences?tab=dashboard',
    '/entreprise/presences?tab=schedules',
  ]);
});

test('le menu Présences conserve les libellés quand la configuration contient des identifiants', () => {
  const modulesWithIds = configuredModules.map(module => (
    module.id === 'presences'
      ? { ...module, features: ['tableau-de-bord', 'pointage', 'présences', 'horaires'] }
      : module
  ));

  const groups = buildSidebarFeatureGroups({
    allowed: ['presences'],
    configuredModules: modulesWithIds,
    employeeRole: null,
    employeeNode: null,
    companyAdmin: true,
    selectedFeatureIdsByModule: {
      presences: ['tableau-de-bord', 'pointage', 'présences', 'horaires'],
    },
  });

  assert.deepEqual(groups[0]?.items.map(item => ({
    href: item.href,
    label: item.label,
  })), [
    { href: '/entreprise/presences?tab=dashboard', label: 'Tableau de bord' },
    { href: '/entreprise/presences?tab=clock', label: 'Pointage' },
    { href: '/entreprise/presences?tab=presence', label: 'Présences' },
    { href: '/entreprise/presences?tab=schedules', label: 'Horaires' },
  ]);
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

test('le menu e-commerce ne transforme pas les droits de vente en onglets', () => {
  const groups = buildSidebarFeatureGroups({
    allowed: ['ecommerce'],
    configuredModules,
    employeeRole: null,
    employeeNode: null,
    companyAdmin: true,
    selectedFeatureIdsByModule: {
      ecommerce: ['dashboard', 'catalogue', 'vente-physique', 'vente-numerique'],
    },
  });

  assert.deepEqual(groups[0]?.items.map(item => item.href), [
    '/entreprise/ecommerce?tab=dashboard',
    '/entreprise/ecommerce?tab=catalogue',
    '/entreprise/ecommerce?tab=categories',
  ]);
});