import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAppAccessContext } from './app-access';
import { seedData } from './store';

test('calcule un accès employé limité à son rôle et à son unité', () => {
  const data = seedData();
  const employee = data.employees.find(item => item.id === 'demo-emp-awa');
  assert.ok(employee);

  const access = buildAppAccessContext({
    data,
    session: `employee:${employee.id}`,
    employee,
    activeCompanyId: 'kora',
    activeCompany: data.companies.find(company => company.id === 'kora'),
    sectorTestCompanyId: null,
    serverModuleStatuses: null,
  });

  assert.equal(access.companyId, 'kora');
  assert.ok(access.allowed.includes('commerce'));
  assert.ok(!access.allowed.includes('stocks'));
  assert.equal(access.hasPermission('commerce', 'créer'), true);
  assert.equal(access.hasPermission('stocks', 'voir'), false);
  assert.equal(access.sectorManager, false);
});

test('refuse un rôle de secteur qui sort du périmètre de son entreprise', () => {
  const data = seedData();
  const employee = data.employees.find(item => item.id === 'demo-emp-mamadou');
  assert.ok(employee);
  const company = data.companies.find(item => item.id === 'kora');
  assert.ok(company);
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