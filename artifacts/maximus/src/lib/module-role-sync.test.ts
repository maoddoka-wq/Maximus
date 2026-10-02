import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyStoreData, type Company, type OrgNode, type StoreData } from './store';
import { synchronizeUnitPackRoles } from './module-role-sync';

function createData(): { data: StoreData; company: Company } {
  const data = emptyStoreData();
  const company: Company = {
    id: 'company-test',
    name: 'Entreprise de test',
    manager: 'Responsable',
    email: 'admin@company-test.example',
    phone: '',
    country: 'Sénégal',
    sector: 'Distribution',
    status: 'ACTIF',
    requestedModules: ['stocks'],
    allowedModules: ['stocks'],
    refusedModules: [],
    createdAt: '2026-09-07',
  };
  data.companies.push(company);
  return { data, company };
}

function createStockUnit(): OrgNode {
  return {
    id: 'test-stock-unit',
    companyId: 'company-test',
    name: 'Unité stock de test',
    type: 'service',
    parentId: null,
    moduleIds: ['stocks'],
    modulePackIds: { stocks: ['stock-gestion'] },
    moduleFeatures: {
      stocks: ['dashboard', 'products', 'entries', 'exits', 'inventory', 'reports'],
    },
  };
}

test('crée un rôle automatique avec les permissions du pack et de l’unité', () => {
  const { data, company } = createData();
  const node = createStockUnit();

  synchronizeUnitPackRoles(data, company, node);

  const role = data.roles.find(item => item.packId === 'stock-gestion' && item.sectorId === node.id);
  assert.ok(role);
  assert.equal(role.name, 'Gestionnaire de stock');
  assert.equal(role.packModuleId, 'stocks');
  assert.deepEqual(role.modulePermissions['stocks:entries'], ['voir']);
  assert.equal(role.modulePermissions['stocks:settings'], undefined);
});

test('conserve les permissions du pack Transport dans un secteur', () => {
  const { data, company } = createData();
  company.requestedModules = ['transport'];
  company.allowedModules = ['transport'];
  const node: OrgNode = {
    id: 'test-transport-unit',
    companyId: company.id,
    name: 'Exploitation Taxi',
    type: 'service',
    parentId: null,
    moduleIds: ['transport'],
    modulePackIds: { transport: ['transport-gestion'] },
    moduleFeatures: { transport: ['overview', 'trips', 'drivers', 'vehicles'] },
  };

  synchronizeUnitPackRoles(data, company, node);

  const role = data.roles.find(item => item.packId === 'transport-gestion' && item.sectorId === node.id);
  assert.ok(role);
  assert.equal(role.packModuleId, 'transport');
  assert.equal(role.modulePermissions['transport'], undefined);
  assert.deepEqual(role.modulePermissions['transport:menu:overview'], ['voir']);
  assert.deepEqual(role.modulePermissions['transport:menu:trips'], ['voir', 'créer', 'modifier']);
  assert.deepEqual(role.modulePermissions['transport:menu:drivers'], ['voir', 'créer', 'modifier']);
  assert.deepEqual(role.modulePermissions['transport:menu:vehicles'], ['voir', 'créer', 'modifier']);
});

test('ne conserve qu’un seul rôle automatique par pack et préserve les affectations des doublons', () => {
  const { data, company } = createData();
  const node = createStockUnit();
  synchronizeUnitPackRoles(data, company, node);

  const generatedRole = data.roles.find(role => role.packId === 'stock-gestion');
  assert.ok(generatedRole);
  const duplicateRole = { ...generatedRole, id: 'duplicate-stock-pack-role' };
  data.roles.push(duplicateRole);
  data.employees.push({
    id: 'duplicate-role-employee',
    firstName: 'Employé',
    lastName: 'Affecté',
    email: 'duplicate@example.test',
    phone: '',
    position: 'Magasinier',
    department: node.name,
    subDepartment: '',
    role: duplicateRole.name,
    roleId: duplicateRole.id,
    status: 'ACTIF',
    companyId: company.id,
    sectorId: node.id,
  });

  synchronizeUnitPackRoles(data, company, node);

  assert.equal(data.roles.filter(role => role.packId === 'stock-gestion').length, 1);
  assert.equal(data.roles.find(role => role.id === duplicateRole.id)?.packId, undefined);
  assert.equal(data.employees.find(employee => employee.id === 'duplicate-role-employee')?.roleId, duplicateRole.id);
});

test('supprime un rôle automatique retiré lorsqu’il n’est pas affecté', () => {
  const { data, company } = createData();
  const node = createStockUnit();

  synchronizeUnitPackRoles(data, company, node);
  node.modulePackIds = {};
  synchronizeUnitPackRoles(data, company, node);

  assert.equal(data.roles.some(role => role.sectorId === node.id), false);
});

test('convertit en rôle personnalisé un rôle automatique déjà affecté', () => {
  const { data, company } = createData();
  const node = createStockUnit();

  synchronizeUnitPackRoles(data, company, node);
  const role = data.roles.find(item => item.packId === 'stock-gestion' && item.sectorId === node.id);
  assert.ok(role);
  data.employees.push({
    id: 'test-employee',
    firstName: 'Test',
    lastName: 'Employé',
    email: 'test.employee@example.com',
    phone: '',
    position: 'Magasinier',
    department: node.name,
    subDepartment: '',
    role: role.name,
    roleId: role.id,
    status: 'ACTIF',
    companyId: company.id,
    sectorId: node.id,
  });

  node.modulePackIds = {};
  synchronizeUnitPackRoles(data, company, node);

  const preservedRole = data.roles.find(item => item.id === role.id);
  assert.ok(preservedRole);
  assert.equal(preservedRole.packId, undefined);
  assert.equal(preservedRole.packModuleId, undefined);
});