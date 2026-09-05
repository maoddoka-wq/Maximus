import assert from 'node:assert/strict';
import test from 'node:test';
import {
  employeeHasPresencePermission,
  employeeRoleMatchesUnit,
  getCommerceTabIds,
  getEmployeeAncestry,
  getStockPermissions,
  restrictRoleToCompany,
  roleHasPermission,
} from './employee-permissions';
import {
  commerceTabDependencies,
  commerceTabPermissionKey,
  hasCommerceTabPermission,
  hasDetailedCommercePermissions,
} from './commerce-permissions';
import { parseQueryTab } from './query-tab';
import { featureSlug, resolveFeatureDependencies } from './permission-keys';
import { getModuleFeatureOptions } from './module-features';
import { presenceFeatureDefinitions } from './presence-features';
import { recordControlEvent, sectorPresets, stockSubmoduleDependencies } from './store';
import { modules } from './store';
import type { Company, Employee, ModuleId, OrgNode, Role, StoreData } from './store';

const employee: Employee = {
  id: 'employee-1',
  firstName: 'Awa',
  lastName: 'Ndiaye',
  email: 'awa@example.test',
  phone: '',
  position: 'Vendeuse',
  department: 'Commerce',
  subDepartment: 'Ventes',
  role: 'Vendeuse',
  status: 'ACTIF',
  companyId: 'company-1',
  sectorId: 'unit-sales',
};

const nodes: OrgNode[] = [
  {
    id: 'unit-company',
    companyId: 'company-1',
    name: 'Direction',
    type: 'direction',
    parentId: null,
    moduleIds: ['commerce', 'stocks'],
  },
  {
    id: 'unit-sales',
    companyId: 'company-1',
    name: 'Ventes',
    type: 'service',
    parentId: 'unit-company',
    moduleIds: ['commerce'],
  },
];

const role = (modulePermissions: Record<string, string[]>, overrides: Partial<Role> = {}): Role => ({
  id: 'role-1',
  name: 'Rôle de test',
  description: '',
  companyId: 'company-1',
  sectorId: 'unit-sales',
  modulePermissions,
  ...overrides,
});

test('reconstruit toute la hiérarchie de l’employé', () => {
  assert.deepEqual(
    [...getEmployeeAncestry(nodes, nodes[1])],
    ['unit-sales', 'unit-company'],
  );
});

test('limite un rôle à la même entreprise et à son unité ascendante', () => {
  const ancestry = getEmployeeAncestry(nodes, nodes[1]);
  assert.equal(employeeRoleMatchesUnit(role({}), employee, ancestry), true);
  assert.equal(
    employeeRoleMatchesUnit(
      role({}, { companyId: 'other-company' }),
      employee,
      ancestry,
    ),
    false,
  );
  assert.equal(
    employeeRoleMatchesUnit(
      role({}, { sectorId: 'unrelated-unit' }),
      employee,
      ancestry,
    ),
    false,
  );
});

test('respecte les modules autorisés par l’unité avant les permissions du rôle', () => {
  const salesRole = role({ stocks: ['voir'], commerce: ['voir'] });
  assert.equal(roleHasPermission(salesRole, nodes[1], 'commerce', 'voir'), true);
  assert.equal(roleHasPermission(salesRole, nodes[1], 'stocks', 'voir'), false);
  assert.equal(roleHasPermission(salesRole, null, 'stocks', 'voir'), true);
});

test('hérite des permissions détaillées du module', () => {
  const salesRole = role({ 'commerce:menu:clients': ['voir'] });
  assert.equal(roleHasPermission(salesRole, nodes[1], 'commerce', 'voir'), true);
  assert.equal(roleHasPermission(salesRole, nodes[1], 'commerce', 'créer'), false);
});

test('expose uniquement les sous-rubriques Stocks permises', () => {
  const stockRole = role({
    stocks: ['voir'],
    'stocks:products': ['voir', 'créer'],
    'stocks:inventory': ['voir'],
  }, { sectorId: 'unit-company' });
  const permissions = getStockPermissions(stockRole, true);

  assert.deepEqual(permissions, {
    products: ['voir', 'créer'],
    inventory: ['voir'],
  });
  assert.equal(getStockPermissions(stockRole, false), undefined);
});

test('utilise les permissions racine Stocks quand aucune permission détaillée n’existe', () => {
  const permissions = getStockPermissions(
    role({ stocks: ['voir', 'modifier'] }, { sectorId: 'unit-company' }),
    true,
  );

  assert.equal(permissions?.dashboard?.includes('voir'), true);
  assert.equal(permissions?.settings?.includes('modifier'), true);
});

test('conserve les alias historiques Commerce', () => {
  const permissions = {
    'commerce:menu:clients': ['voir'],
    'ventes:menu:devis': ['voir'],
  };

  assert.equal(hasDetailedCommercePermissions(permissions), true);
  assert.equal(hasCommerceTabPermission(permissions, 'clients'), true);
  assert.equal(hasCommerceTabPermission(permissions, 'sales'), true);
  assert.equal(
    permissions[commerceTabPermissionKey('clients')]?.includes('voir'),
    true,
  );
});

test('convertit les permissions Commerce et Ventes en onglets visibles', () => {
  const permissions = {
    commerce: ['voir'],
    'commerce:menu:clients': ['voir'],
    ventes: ['voir'],
    'ventes:menu:facturation': ['voir'],
  };
  const ids = getCommerceTabIds(
    role(permissions),
    true,
    moduleId => moduleId === 'commerce' || moduleId === 'ventes',
  );

  assert.ok(ids);
  assert.equal(ids.includes('clients'), true);
  assert.equal(ids.includes('invoices'), true);
  assert.equal(ids.includes('dashboard'), false);
});

test('respecte les sous-permissions explicites Présences', () => {
  const presenceRole = role({
    presences: ['voir', 'créer', 'modifier'],
    'presence.view': ['voir'],
  });
  const canPermission = (_moduleId: ModuleId, _action: 'voir' | 'créer' | 'modifier') => true;
  const presenceNode: OrgNode = {
    ...nodes[1],
    moduleIds: ['presences'],
  };

  assert.equal(
    employeeHasPresencePermission(presenceRole, presenceNode, 'view', canPermission),
    true,
  );
  assert.equal(
    employeeHasPresencePermission(presenceRole, presenceNode, 'create', canPermission),
    false,
  );
});

test('résout les prérequis d’une fonctionnalité en cascade', () => {
  assert.deepEqual(
    resolveFeatureDependencies(commerceTabDependencies, 'reports'),
    ['clients', 'products', 'sales'],
  );
  assert.deepEqual(
    resolveFeatureDependencies(stockSubmoduleDependencies, 'entries'),
    ['products'],
  );
});

test('rend les prérequis visibles dans les permissions effectives', () => {
  const commerceRole = role({
    commerce: ['voir'],
    [commerceTabPermissionKey('sales')]: ['voir'],
  });
  const commerceTabs = getCommerceTabIds(commerceRole, true, () => true) ?? [];
  assert.equal(commerceTabs.includes('sales'), true);
  assert.equal(commerceTabs.includes('clients'), true);
  assert.equal(commerceTabs.includes('products'), true);

  const stockRole = role({
    stocks: ['voir'],
    'stocks:entries': ['créer'],
  });
  const stockPermissions = getStockPermissions(stockRole, true) ?? {};
  assert.equal(stockPermissions.entries?.includes('créer'), true);
  assert.equal(stockPermissions.entries?.includes('voir'), true);
  assert.equal(stockPermissions.products?.includes('voir'), true);
});

test('utilise une définition complète et partagée pour les fonctionnalités Présences', () => {
  const presenceModule = modules.find(module => module.id === 'presences');
  assert.ok(presenceModule);
  assert.deepEqual(
    getModuleFeatureOptions(presenceModule).map(feature => feature.label),
    presenceFeatureDefinitions.map(feature => feature.label),
  );
  assert.equal(presenceFeatureDefinitions.length, 16);
});

test('conserve les packs métiers configurés dans un secteur', () => {
  const distribution = sectorPresets.find(preset => preset.id === 'distribution');
  assert.ok(distribution);
  assert.deepEqual(distribution.modulePackIds?.stocks, ['stock-gestion']);
  assert.deepEqual(distribution.modulePackIds?.commerce, ['commerce-gestion']);
});

test('ignore un cycle de dépendances sans boucler', () => {
  assert.deepEqual(
    resolveFeatureDependencies({ a: ['b'], b: ['a'] }, 'a'),
    ['b'],
  );
});

test('lit les onglets et les anciennes URLs sans confondre les paramètres', () => {
  assert.equal(parseQueryTab('tab=clients', {}), 'clients');
  assert.equal(
    parseQueryTab('feature=devis-et-commandes', { 'devis-et-commandes': 'sales' }),
    'sales',
  );
  assert.equal(parseQueryTab('tab=clients&feature=sales', {}), 'clients');
});

test('chaque décision de contrôle écrit un événement et un audit liés', () => {
  const data = { domainEvents: [], auditEntries: [] } as unknown as StoreData;
  recordControlEvent(data, {
    type: 'APPROVAL_GRANTED',
    label: 'Validation accordée',
    summary: 'La commande BC-1 a été validée.',
    actorName: 'Awa Ndiaye',
    entityType: 'purchase_order',
    entityId: 'BC-1',
    companyId: 'company-1',
    moduleId: 'achats',
    severity: 'success',
  });

  assert.equal(data.domainEvents.length, 1);
  assert.equal(data.auditEntries.length, 1);
  assert.equal(data.domainEvents[0].entityId, 'BC-1');
  assert.equal(data.auditEntries[0].entityId, 'BC-1');
  assert.equal(data.domainEvents[0].actorName, 'Awa Ndiaye');
});

test('plafonne les droits des rôles au choix de l’entreprise', () => {
  const company: Company = {
    id: 'company-1',
    name: 'Entreprise test',
    manager: 'Admin',
    email: 'admin@example.test',
    phone: '',
    country: 'Sénégal',
    sector: 'Commerce',
    status: 'ACTIF',
    requestedModules: ['commerce'],
    requestedModuleFeatures: { commerce: ['clients'] },
    requestedModulePermissions: { commerce: { clients: ['voir'] } },
    allowedModules: ['commerce'],
    refusedModules: [],
    createdAt: '2026-01-01',
  };
  const role: Role = {
    id: 'role-1',
    name: 'Vendeur',
    description: '',
    companyId: company.id,
    sectorId: 'unit-1',
    modulePermissions: {
      commerce: ['voir'],
      'commerce:menu:clients': ['voir', 'créer'],
      'commerce:menu:sales': ['voir'],
      stocks: ['voir'],
    },
  };

  assert.deepEqual(restrictRoleToCompany(role, company)?.modulePermissions, {
    commerce: ['voir'],
    'commerce:menu:clients': ['voir'],
  });
});