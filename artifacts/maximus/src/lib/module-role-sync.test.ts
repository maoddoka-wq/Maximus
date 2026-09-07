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