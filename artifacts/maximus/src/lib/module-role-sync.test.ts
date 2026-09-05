import test from 'node:test';
import assert from 'node:assert/strict';
import { seedData, type OrgNode } from './store';
import { synchronizeUnitPackRoles } from './module-role-sync';

function createStockUnit(): OrgNode {
  return {
    id: 'test-stock-unit',
    companyId: 'kora',
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
  const data = seedData();
  const company = data.companies.find(item => item.id === 'kora');
  assert.ok(company);
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
  const data = seedData();
  const company = data.companies.find(item => item.id === 'kora');
  assert.ok(company);
  const node = createStockUnit();

  synchronizeUnitPackRoles(data, company, node);
  node.modulePackIds = {};
  synchronizeUnitPackRoles(data, company, node);

  assert.equal(data.roles.some(role => role.sectorId === node.id), false);
});

test('convertit en rôle personnalisé un rôle automatique déjà affecté', () => {
  const data = seedData();
  const company = data.companies.find(item => item.id === 'kora');
  assert.ok(company);
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