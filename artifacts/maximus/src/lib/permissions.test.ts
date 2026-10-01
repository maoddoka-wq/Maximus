import assert from 'node:assert/strict';
import test from 'node:test';
import {
  employeeHasPresencePermission,
  effectiveFeaturePermissions,
  employeeRoleMatchesUnit,
  getCommerceTabIds,
  getEmployeeAncestry,
  getStockPermissions,
  getSelectedFeatureIds,
  getFeaturePermissions,
  restrictRoleToCompany,
  roleHasPermission,
  roleHasFeaturePermission,
  hasEffectivePermission,
} from './employee-permissions';
import {
  commerceTabDependencies,
  commerceTabPermissionKey,
  hasCommerceTabPermission,
  hasDetailedCommercePermissions,
} from './commerce-permissions';
import { parseQueryTab } from './query-tab';
import { featureSlug, resolveFeatureDependencies } from './permission-keys';
import {
  getEffectiveModuleFeatureIds,
  getModuleFeatureOptions,
  normalizeFeatureIdsForSelectedPacks,
} from './module-features';
import { presenceFeatureDefinitions, presenceFeaturePacks } from './presence-features';
import { emptyStoreData, recordControlEvent, sectorPresets, stockSubmoduleDependencies } from './store';
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

test('applique la hiérarchie voir, créer, modifier', () => {
  const checks = role({ commerce: ['créer', 'modifier'] });
  const has = (moduleId: ModuleId, permission: 'voir' | 'créer' | 'modifier') =>
    roleHasPermission(checks, nodes[1], moduleId, permission);
  assert.equal(hasEffectivePermission(has, 'commerce', 'voir'), false);
  assert.equal(hasEffectivePermission(has, 'commerce', 'créer'), false);
  assert.equal(hasEffectivePermission(has, 'commerce', 'modifier'), false);

  const createOnly = role({ commerce: ['voir', 'créer'] });
  const createHas = (moduleId: ModuleId, permission: 'voir' | 'créer' | 'modifier') =>
    roleHasPermission(createOnly, nodes[1], moduleId, permission);
  assert.equal(hasEffectivePermission(createHas, 'commerce', 'voir'), true);
  assert.equal(hasEffectivePermission(createHas, 'commerce', 'créer'), true);
  assert.equal(hasEffectivePermission(createHas, 'commerce', 'modifier'), false);
  assert.deepEqual(effectiveFeaturePermissions(['créer', 'modifier']), []);
  assert.deepEqual(effectiveFeaturePermissions(['voir', 'modifier']), ['voir']);
  assert.deepEqual(effectiveFeaturePermissions(['voir', 'créer', 'modifier']), ['voir', 'créer', 'modifier']);
});

test('hérite des permissions détaillées du module', () => {
  const salesRole = role({ 'commerce:menu:clients': ['voir'] });
  assert.equal(roleHasPermission(salesRole, nodes[1], 'commerce', 'voir'), true);
  assert.equal(roleHasPermission(salesRole, nodes[1], 'commerce', 'créer'), false);
});

test('borne les actions à la fonctionnalité demandée', () => {
  const salesRole = role({
    commerce: ['voir', 'créer', 'modifier'],
    'commerce:menu:clients': ['voir'],
    'commerce:menu:sales': ['voir', 'créer'],
  });

  assert.deepEqual(getFeaturePermissions(salesRole, nodes[1], 'commerce', 'clients'), ['voir']);
  assert.deepEqual(getFeaturePermissions(salesRole, nodes[1], 'commerce', 'sales'), ['voir', 'créer']);
});

test('applique le ladder à chaque fonctionnalité et refuse le fallback vers une autre rubrique', () => {
  const ecommerceNode = { ...nodes[1], moduleIds: ['ecommerce'] };
  const employeeRole = role({
    ecommerce: ['voir', 'créer', 'modifier'],
    'ecommerce:menu:catalogue': ['voir', 'modifier'],
    'ecommerce:menu:commandes': ['voir', 'créer', 'modifier'],
  });

  assert.deepEqual(
    getFeaturePermissions(employeeRole, ecommerceNode, 'ecommerce', 'catalogue'),
    ['voir'],
  );
  assert.equal(
    roleHasFeaturePermission(employeeRole, ecommerceNode, 'ecommerce', 'catalogue', 'modifier'),
    false,
  );
  assert.deepEqual(
    getFeaturePermissions(employeeRole, ecommerceNode, 'ecommerce', 'clients'),
    [],
  );
  assert.equal(
    roleHasFeaturePermission(employeeRole, ecommerceNode, 'ecommerce', 'clients', 'voir'),
    false,
  );
  assert.equal(
    roleHasFeaturePermission(employeeRole, ecommerceNode, 'ecommerce', 'commandes', 'modifier'),
    true,
  );
});

test('respecte une permission détaillée explicitement vide', () => {
  const restrictedRole = role({
    ecommerce: ['voir', 'créer', 'modifier'],
    'ecommerce:menu:catalogue': [],
  });

  assert.deepEqual(
    getFeaturePermissions(restrictedRole, nodes[1], 'ecommerce', 'catalogue'),
    [],
  );
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
    role({ stocks: ['voir', 'créer', 'modifier'] }, { sectorId: 'unit-company' }),
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

test('les opérations spéciales Présences exigent le ladder complet', () => {
  const correctionOnly = role({
    'presence.view': ['allowed'],
    'presence.correct': ['allowed'],
  });
  const presenceNode: OrgNode = { ...nodes[1], moduleIds: ['presences'] };
  const canPermission = (_moduleId: ModuleId, _action: 'voir' | 'créer' | 'modifier') => true;

  assert.equal(
    employeeHasPresencePermission(correctionOnly, presenceNode, 'correct', canPermission),
    false,
  );
  assert.equal(
    employeeHasPresencePermission(correctionOnly, presenceNode, 'edit', canPermission),
    false,
  );
  assert.equal(
    employeeHasPresencePermission(correctionOnly, presenceNode, 'create', canPermission),
    false,
  );
  const fullRights = role({
    'presence.view': ['allowed'],
    'presence.create': ['allowed'],
    'presence.edit': ['allowed'],
    'presence.correct': ['allowed'],
  });
  assert.equal(
    employeeHasPresencePermission(fullRights, presenceNode, 'correct', canPermission),
    true,
  );
});

test('export Présences exige la lecture ainsi que le droit d’export', () => {
  const presenceNode: OrgNode = { ...nodes[1], moduleIds: ['presences'] };
  const canPermission = (_moduleId: ModuleId, _action: 'voir' | 'créer' | 'modifier') => true;
  const exportOnly = role({ 'presence.export': ['allowed'] });
  const viewAndExport = role({
    'presence.view': ['allowed'],
    'presence.export': ['allowed'],
  });

  assert.equal(
    employeeHasPresencePermission(exportOnly, presenceNode, 'export', canPermission),
    false,
  );
  assert.equal(
    employeeHasPresencePermission(viewAndExport, presenceNode, 'export', canPermission),
    true,
  );
});

test('n’affiche que les fonctionnalités explicitement incluses dans un pack Présences', () => {
  const presenceModule = modules.find(module => module.id === 'presences');
  assert.ok(presenceModule);
  const selected = getSelectedFeatureIds(
    role({
      presences: ['voir'],
      'presence.tableau-de-bord': ['voir'],
      'presence.présences': ['voir'],
      'presence.absences': ['voir'],
      'presence.historique': ['voir'],
    }),
    presenceModule,
  );

  assert.deepEqual([...selected], ['tableau-de-bord', 'présences', 'absences', 'historique']);
  assert.equal(selected.has('pointage'), false);
  assert.equal(selected.has('rapports'), false);
});

test('borne les fonctionnalités d’une entreprise aux packs sélectionnés', () => {
  const ecommerceModule = modules.find(module => module.id === 'ecommerce');
  assert.ok(ecommerceModule);

  assert.deepEqual(
    normalizeFeatureIdsForSelectedPacks(
      ecommerceModule,
      ['dashboard', 'catalogue', 'commandes'],
      ['ecommerce-catalogue'],
    ),
    ['dashboard', 'catalogue'],
  );
});

test('ne transforme pas une permission opérationnelle globale en fonctionnalités visibles', () => {
  const presenceModule = modules.find(module => module.id === 'presences');
  assert.ok(presenceModule);

  const selected = getSelectedFeatureIds(
    role({
      presences: ['voir'],
      'presence.view': ['autorisé'],
      'presence.absences': ['voir'],
    }),
    presenceModule,
  );

  assert.deepEqual([...selected], ['absences']);
});

test('ne transforme pas le droit racine Présences en accès à toutes les fonctionnalités', () => {
  const presenceModule = modules.find(module => module.id === 'presences');
  assert.ok(presenceModule);

  assert.deepEqual(
    [...getSelectedFeatureIds(role({ presences: ['voir'] }), presenceModule)],
    [],
  );
});

test('ne transforme pas une dépendance technique en fonctionnalité choisie du pack', () => {
  const presenceModule = modules.find(module => module.id === 'presences');
  assert.ok(presenceModule);
  const consultationPack = presenceFeaturePacks.find(pack => pack.id === 'presence-consultation');
  assert.ok(consultationPack);
  const generatedRole = role(
    Object.fromEntries([
      ...consultationPack.featureIds.map(featureId => [`presence.${featureId}`, ['voir']]),
      ['presence.pointage', ['voir']],
      ['presences', ['voir']],
    ]),
    { packId: consultationPack.id, packModuleId: 'presences' },
  );

  assert.deepEqual(
    [...getSelectedFeatureIds(generatedRole, presenceModule)],
    consultationPack.featureIds,
  );
  assert.equal(getSelectedFeatureIds(generatedRole, presenceModule).has('pointage'), false);
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

test('ne rend pas les prérequis visibles sans permission explicite', () => {
  const commerceRole = role({
    commerce: ['voir'],
    [commerceTabPermissionKey('sales')]: ['voir'],
  });
  const commerceTabs = getCommerceTabIds(commerceRole, true, () => true) ?? [];
  assert.equal(commerceTabs.includes('sales'), true);
  assert.equal(commerceTabs.includes('clients'), false);
  assert.equal(commerceTabs.includes('products'), false);

  const stockRole = role({
    stocks: ['voir'],
    'stocks:entries': ['créer'],
  });
  const stockPermissions = getStockPermissions(stockRole, true) ?? {};
  assert.equal(stockPermissions.entries, undefined);
  assert.equal(stockPermissions.products, undefined);
});

test('utilise une définition complète et partagée pour les fonctionnalités Présences', () => {
  const presenceModule = modules.find(module => module.id === 'presences');
  assert.ok(presenceModule);
  assert.deepEqual(
    getModuleFeatureOptions(presenceModule).map(feature => feature.label),
    presenceFeatureDefinitions.map(feature => feature.label),
  );
  assert.equal(presenceFeatureDefinitions.length, 8);
  assert.deepEqual(
    presenceModule.featurePacks?.map((pack) => pack.id),
    presenceFeaturePacks.map((pack) => pack.id),
  );
  assert.deepEqual(
    presenceModule.featurePacks?.map((pack) => pack.name),
    ['Consultation des présences', 'Gestionnaire des présences', 'Responsable des présences', 'Employé Présences', 'Manager Présences'],
  );
});

test('normalise les libellés et identifiants historiques des fonctionnalités avant affichage', () => {
  const presenceModule = {
    ...modules.find(module => module.id === 'presences')!,
    features: ['tableau-de-bord', 'Pointage', 'présences', 'horaires'],
  };
  const payrollModule = {
    ...modules.find(module => module.id === 'paie')!,
    features: ['dashboard', 'Bénéficiaires', 'historique'],
  };

  assert.deepEqual(
    getModuleFeatureOptions(presenceModule),
    [
      { id: 'tableau-de-bord', label: 'Tableau de bord' },
      { id: 'pointage', label: 'Pointage' },
      { id: 'présences', label: 'Présences' },
      { id: 'horaires', label: 'Horaires' },
    ],
  );
  assert.deepEqual(
    [...getSelectedFeatureIds(
      role({ presences: ['voir'] }),
      presenceModule,
      ['Tableau de bord', 'Pointage', 'horaires'],
    )],
    ['tableau-de-bord', 'pointage', 'horaires'],
  );
  assert.deepEqual(
    [...getEffectiveModuleFeatureIds(payrollModule, payrollModule.features)],
    ['tableau-de-bord', 'bénéficiaires', 'historique'],
  );
});

test('conserve les packs métiers configurés dans un secteur', () => {
  const distribution = sectorPresets.find(preset => preset.id === 'distribution');
  assert.ok(distribution);
  assert.deepEqual(distribution.modulePackIds?.stocks, ['stock-gestion']);
  assert.deepEqual(distribution.modulePackIds?.commerce, ['commerce-gestion']);
});

test('expose tous les packs et fonctionnalités Paie dans le catalogue entreprise', () => {
  const payroll = modules.find(module => module.id === 'paie');
  assert.ok(payroll);
  assert.deepEqual(
    getModuleFeatureOptions(payroll).map(feature => feature.id),
    ['tableau-de-bord', 'bénéficiaires', 'préparer-une-paie', 'validation', 'virements', 'solde-de-paie', 'historique'],
  );
  assert.deepEqual(
    payroll.featurePacks?.map(pack => pack.id),
    ['paie-consultation', 'paie-gestion', 'paie-supervision', 'paie-employe', 'paie-manager'],
  );
  assert.ok(payroll.featurePacks?.every(pack => pack.featureIds.length > 0));

  const availableSectors = emptyStoreData().sectorPresets;
  assert.ok(availableSectors.length > 0);
  assert.ok(availableSectors.every(sector => sector.moduleIds.includes('paie')));
  assert.ok(availableSectors.every(sector => (sector.modulePackIds?.paie ?? []).length > 0));
});

test('prépare un pack employé et un pack manager pour chaque module', () => {
  modules.forEach(module => {
    const packIds = new Set((module.featurePacks ?? []).map(pack => pack.id));
    const packPrefix = module.id === 'presences' ? 'presence' : module.id;
    assert.equal(packIds.has(`${packPrefix}-employe`), true, `pack employé absent pour ${module.id}`);
    assert.equal(packIds.has(`${packPrefix}-manager`), true, `pack manager absent pour ${module.id}`);
  });
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

test('sélectionne les rubriques Stock depuis les permissions détaillées du rôle', () => {
  const stockModule = modules.find(module => module.id === 'stocks')!;
  const role: Role = {
    id: 'role-stock-detail',
    name: 'Gestionnaire Stock',
    description: '',
    companyId: 'company-stock-detail',
    sectorId: 'unit-stock-detail',
    modulePermissions: {
      'stocks:entries': ['voir'],
      'stocks:reports': ['voir'],
    },
  };

  assert.deepEqual([...getSelectedFeatureIds(role, stockModule)], ['entries', 'reports']);
});

test('ignore les propriétés natives quand les permissions détaillées entreprise sont une liste vide', () => {
  const company: Company = {
    id: 'company-stock-entries',
    name: 'Entreprise Stock',
    manager: 'Admin',
    email: 'admin@example.test',
    phone: '',
    country: 'Sénégal',
    sector: 'Commerce',
    status: 'ACTIF',
    requestedModules: ['stocks'],
    requestedModuleFeatures: { stocks: ['entries'] },
    requestedModulePermissions: JSON.parse('{"stocks":[]}'),
    allowedModules: ['stocks'],
    refusedModules: [],
    createdAt: '2026-01-01',
  };
  const role: Role = {
    id: 'role-stock-entries',
    name: 'Gestionnaire Stock',
    description: '',
    companyId: company.id,
    sectorId: 'unit-stock',
    modulePermissions: {
      stocks: ['voir'],
      'stocks:entries': ['voir'],
    },
  };

  assert.deepEqual(restrictRoleToCompany(role, company)?.modulePermissions, {
    'stocks:entries': ['voir'],
  });
});

test('conserve les droits généraux créer et modifier quand le module les autorise', () => {
  const company: Company = {
    id: 'company-2',
    name: 'Entreprise avec écriture',
    manager: 'Admin',
    email: 'admin@example.test',
    phone: '',
    country: 'Sénégal',
    sector: 'Commerce',
    status: 'ACTIF',
    requestedModules: ['commerce'],
    requestedModuleFeatures: { commerce: ['clients'] },
    requestedModulePermissions: { commerce: { clients: ['voir', 'créer', 'modifier'] } },
    allowedModules: ['commerce'],
    refusedModules: [],
    createdAt: '2026-01-01',
  };
  const role: Role = {
    id: 'role-2',
    name: 'Responsable commercial',
    description: '',
    companyId: company.id,
    sectorId: 'unit-2',
    modulePermissions: {
      commerce: ['voir', 'créer', 'modifier'],
      'commerce:menu:clients': ['voir', 'créer', 'modifier'],
    },
  };

  assert.deepEqual(restrictRoleToCompany(role, company)?.modulePermissions, role.modulePermissions);
});