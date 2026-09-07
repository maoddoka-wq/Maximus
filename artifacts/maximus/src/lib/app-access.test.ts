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
  assert.equal(access.verticalModuleNavigation, true);
  assert.ok(access.sidebarFeatureGroups.some(group => group.label === 'Gestion commerciale'));
  assert.equal(employee.companyId, company.id);
});