import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAppAccessContext } from './app-access';
import { emptyStoreData, type Company, type Employee, type OrgNode, type Role } from './store';

function createAccessFixture() {
  const data = emptyStoreData();
  const company: Company = {
    id: 'company-test',
    name: 'Entreprise de test',
    manager: 'Awa Diallo',
    email: 'admin@company-test.example',
    phone: '',
    country: 'Sénégal',
    sector: 'Services',
    status: 'ACTIF',
    requestedModules: ['commerce'],
    allowedModules: ['commerce'],
    refusedModules: [],
    createdAt: '2026-09-07',
  };
  const node: OrgNode = {
    id: 'unit-test',
    companyId: company.id,
    name: 'Unité commerciale',
    type: 'service',
    parentId: null,
    moduleIds: ['commerce'],
  };
  const role: Role = {
    id: 'commerce-reader',
    companyId: company.id,
    sectorId: node.id,
    name: 'Lecteur commerce',
    description: '',
    modulePermissions: { commerce: ['voir', 'créer'] },
  };
  const employee: Employee = {
    id: 'employee-awa',
    firstName: 'Awa',
    lastName: 'Diallo',
    email: 'awa@company-test.example',
    phone: '',
    position: 'Commerciale',
    department: node.name,
    subDepartment: '',
    role: role.name,
    roleId: role.id,
    status: 'ACTIF',
    companyId: company.id,
    sectorId: node.id,
  };
  data.companies.push(company);
  data.orgNodes.push(node);
  data.roles.push(role);
  data.employees.push(employee);
  return { data, company, employee };
}

test('calcule un accès employé limité à son rôle et à son unité', () => {
  const { data, company, employee } = createAccessFixture();

  const access = buildAppAccessContext({
    data,
    session: `employee:${employee.id}`,
    employee,
    activeCompanyId: company.id,
    activeCompany: company,
    sectorTestCompanyId: null,
    serverModuleStatuses: null,
  });

  assert.equal(access.companyId, company.id);
  assert.ok(access.allowed.includes('commerce'));
  assert.ok(!access.allowed.includes('stocks'));
  assert.equal(access.hasPermission('commerce', 'créer'), true);
  assert.equal(access.hasPermission('stocks', 'voir'), false);
  assert.equal(access.sectorManager, false);
});

test('affiche les modules dans le menu de l’administrateur d’entreprise', () => {
  const { data, company } = createAccessFixture();

  const access = buildAppAccessContext({
    data,
    session: `company:${company.id}`,
    employee: null,
    activeCompanyId: company.id,
    activeCompany: company,
    sectorTestCompanyId: null,
    serverModuleStatuses: null,
  });

  assert.deepEqual(access.allowed, ['commerce']);
  assert.equal(access.verticalModuleNavigation, true);
  assert.deepEqual(access.sidebarFeatureGroups.map(group => group.label), ['Gestion commerciale']);
  assert.ok(access.sidebarFeatureGroups[0]?.items.some(item => item.href === '/entreprise/commerce?tab=dashboard'));
});

test('affiche les fonctionnalités de tous les modules autorisés dans le menu entreprise', () => {
  const { data, company } = createAccessFixture();
  company.requestedModules = ['commerce', 'stocks', 'presences'];
  company.allowedModules = ['commerce', 'stocks', 'presences'];

  const access = buildAppAccessContext({
    data,
    session: `company:${company.id}`,
    employee: null,
    activeCompanyId: company.id,
    activeCompany: company,
    sectorTestCompanyId: null,
    serverModuleStatuses: null,
  });

  assert.deepEqual(access.sidebarFeatureGroups.map(group => group.label), [
    'Gestion commerciale',
    'Gestion de stock',
    'Présences',
  ]);
  assert.ok(access.sidebarFeatureGroups.every(group => group.items.length > 0));
  assert.equal(access.verticalModuleNavigation, true);
});

test('n’affiche aucune fonctionnalité Paie sans sélection explicite de l’entreprise', () => {
  const { data, company } = createAccessFixture();
  company.requestedModules = ['paie'];
  company.allowedModules = ['paie'];
  delete company.requestedModuleFeatures;
  delete company.requestedModulePackIds;

  const access = buildAppAccessContext({
    data,
    session: `company:${company.id}`,
    employee: null,
    activeCompanyId: company.id,
    activeCompany: company,
    sectorTestCompanyId: null,
    serverModuleStatuses: null,
  });

  assert.deepEqual(access.selectedPayrollFeatureIds, []);
  assert.deepEqual(access.sidebarFeatureGroups, []);
});

test('refuse un rôle de secteur qui sort du périmètre de son entreprise', () => {
  const { data, company, employee } = createAccessFixture();
  const foreignCompany = { ...company, id: 'foreign-company' };

  const access = buildAppAccessContext({
    data,
    session: `employee:${employee.id}`,
    employee: { ...employee, companyId: 'foreign-company' },
    activeCompanyId: 'foreign-company',
    activeCompany: foreignCompany,
    sectorTestCompanyId: null,
    serverModuleStatuses: null,
  });

  assert.deepEqual(access.allowed, []);
  assert.equal(access.hasPermission('finance', 'voir'), false);
});

test('applique les permissions du rôle pendant un test réel de secteur', () => {
  const { data, company, employee } = createAccessFixture();
  const testCompanyId = 'sector-test-company';
  const testNodeId = 'sector-test-node';
  const testRoleId = 'sector-test-role';
  const testCompany = {
    ...company,
    id: testCompanyId,
    allowedModules: ['commerce', 'stocks'] as const,
    managerRoleId: testRoleId,
  };
  const testNode = {
    ...data.orgNodes[0],
    id: testNodeId,
    companyId: testCompanyId,
  };
  const testRole = {
    ...data.roles[0],
    id: testRoleId,
    companyId: testCompanyId,
    sectorId: testNodeId,
  };
  data.companies = [testCompany];
  data.orgNodes = [testNode];
  data.roles = [testRole];

  const access = buildAppAccessContext({
    data,
    session: `company:${testCompanyId}`,
    employee: null,
    activeCompanyId: testCompanyId,
    activeCompany: testCompany,
    sectorTestCompanyId: testCompanyId,
    serverModuleStatuses: null,
  });

  assert.deepEqual(access.allowed, ['commerce']);
  assert.equal(access.hasPermission('commerce', 'créer'), true);
  assert.equal(access.hasPermission('stocks', 'voir'), false);
  assert.equal(access.sectorManager, false);
  assert.equal(employee.companyId, company.id);
});

test('affiche le menu des modules pendant un test réel de secteur', () => {
  const { data, company } = createAccessFixture();
  const testCompanyId = 'sector-test-menu-company';
  const testNodeId = 'sector-test-menu-node';
  const testRoleId = 'sector-test-menu-role';
  const testCompany = {
    ...company,
    id: testCompanyId,
    allowedModules: ['commerce'],
    managerRoleId: testRoleId,
  };
  const testNode = {
    ...data.orgNodes[0],
    id: testNodeId,
    companyId: testCompanyId,
  };
  const testRole = {
    ...data.roles[0],
    id: testRoleId,
    companyId: testCompanyId,
    sectorId: testNodeId,
  };
  data.companies = [testCompany];
  data.orgNodes = [testNode];
  data.roles = [testRole];

  const access = buildAppAccessContext({
    data,
    session: `company:${testCompanyId}`,
    employee: null,
    activeCompanyId: testCompanyId,
    activeCompany: testCompany,
    sectorTestCompanyId: testCompanyId,
    serverModuleStatuses: null,
  });

  assert.deepEqual(access.sidebarFeatureGroups.map(group => group.label), ['Gestion commerciale']);
  assert.equal(access.verticalModuleNavigation, true);
});

test('affiche immédiatement les modules du test réel sans attendre les accès serveur', () => {
  const { data, company } = createAccessFixture();
  const testCompanyId = 'sector-test-ready-company';
  const testNodeId = 'sector-test-ready-node';
  const testRoleId = 'sector-test-ready-role';
  const testCompany = {
    ...company,
    id: testCompanyId,
    allowedModules: ['commerce', 'stocks'],
    managerRoleId: testRoleId,
  };
  const testNode = {
    ...data.orgNodes[0],
    id: testNodeId,
    companyId: testCompanyId,
    moduleIds: ['commerce', 'stocks'],
  };
  const testRole = {
    ...data.roles[0],
    id: testRoleId,
    companyId: testCompanyId,
    sectorId: testNodeId,
    modulePermissions: {
      commerce: ['voir'],
      stocks: ['voir'],
    },
  };
  data.companies = [testCompany];
  data.orgNodes = [testNode];
  data.roles = [testRole];

  const access = buildAppAccessContext({
    data,
    session: `company:${testCompanyId}`,
    employee: null,
    activeCompanyId: testCompanyId,
    activeCompany: testCompany,
    sectorTestCompanyId: testCompanyId,
    serverModuleStatuses: null,
    serverModuleAccessReady: false,
  });

  assert.deepEqual(access.allowed, ['commerce', 'stocks']);
  assert.deepEqual(access.sidebarFeatureGroups.map(group => group.label), [
    'Gestion commerciale',
    'Gestion de stock',
  ]);
  assert.equal(access.verticalModuleNavigation, true);
});

test('limite le menu e-commerce de l’administrateur aux fonctionnalités choisies', () => {
  const { data, company } = createAccessFixture();
  company.requestedModules = ['commerce', 'ecommerce'];
  company.allowedModules = ['commerce', 'ecommerce'];
  company.requestedModulePackIds = {};
  company.requestedModuleFeatures = {
    ecommerce: ['dashboard', 'catalogue'],
  };

  const access = buildAppAccessContext({
    data,
    session: `company:${company.id}`,
    employee: null,
    activeCompanyId: company.id,
    activeCompany: company,
    sectorTestCompanyId: null,
    serverModuleStatuses: null,
  });

  assert.deepEqual(access.selectedEcommerceFeatureIds, ['dashboard', 'catalogue', 'parametres']);
  assert.equal(access.verticalModuleNavigation, true);
  assert.deepEqual(access.sidebarFeatureGroups.map(group => group.label), ['Gestion commerciale', 'E-commerce']);
  assert.deepEqual(
    access.sidebarFeatureGroups.find(group => group.label === 'E-commerce')?.items.map(item => item.href),
    [
      '/entreprise/ecommerce?tab=dashboard',
      '/entreprise/ecommerce?tab=catalogue',
      '/entreprise/ecommerce?tab=categories',
      '/entreprise/ecommerce?tab=parametres',
    ],
  );
});