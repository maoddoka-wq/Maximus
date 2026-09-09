import assert from 'node:assert/strict';
import test from 'node:test';
import { provisionCompanyAccess } from './company-access-provisioning';
import { buildAppAccessContext } from './app-access';
import { seedData, type Company, type Employee } from './store';

test('propage une sélection d’inscription vers l’unité, le rôle et le menu employé', () => {
  const data = seedData();
  const company: Company = {
    id: 'signup-company',
    name: 'Entreprise inscrite',
    manager: 'Manager Test',
    email: 'manager@signup.test',
    phone: '',
    country: 'Sénégal',
    sector: 'Distribution',
    status: 'ACTIF',
    requestedModules: ['stocks'],
    requestedModulePackIds: { stocks: ['stock-gestion'] },
    requestedModuleFeatures: { stocks: ['dashboard', 'products', 'entries', 'exits', 'inventory', 'reports'] },
    requestedModulePermissions: { stocks: { products: ['voir', 'créer'], entries: ['voir'] } },
    allowedModules: ['stocks'],
    refusedModules: [],
    createdAt: '2026-09-06',
  };
  data.companies.push(company);

  const root = provisionCompanyAccess(data, company);
  const role = data.roles.find(item => item.companyId === company.id && item.packId === 'stock-gestion');
  assert.ok(role);
  const employee: Employee = {
    id: 'signup-employee',
    firstName: 'Employé',
    lastName: 'Test',
    email: 'employee@signup.test',
    phone: '',
    position: 'Gestionnaire',
    department: root.name,
    subDepartment: '',
    role: role.name,
    roleId: role.id,
    companyId: company.id,
    sectorId: root.id,
    status: 'ACTIF',
  };
  data.employees.push(employee);

  const access = buildAppAccessContext({
    data,
    session: `employee:${employee.id}`,
    employee,
    activeCompanyId: company.id,
    activeCompany: company,
    sectorTestCompanyId: null,
    serverModuleStatuses: null,
  });

  assert.deepEqual(company.allowedModules, ['stocks']);
  assert.equal(root.modulePackIds?.stocks?.[0], 'stock-gestion');
  assert.equal(access.allowed.includes('stocks'), true);
  assert.equal(access.stockPermissions?.products?.includes('créer'), true);
  assert.equal(access.stockPermissions?.settings, undefined);
});

test('propage le pack Paie et ses droits vers l’espace entreprise', () => {
  const data = seedData();
  const company: Company = {
    id: 'payroll-company',
    name: 'Entreprise avec paie',
    manager: 'Manager Paie',
    email: 'manager@payroll.test',
    phone: '',
    country: 'Sénégal',
    sector: 'Services professionnels',
    status: 'ACTIF',
    requestedModules: ['paie'],
    requestedModulePackIds: { paie: ['paie-supervision'] },
    allowedModules: ['paie'],
    refusedModules: [],
    createdAt: '2026-09-09',
  };
  data.companies.push(company);

  const root = provisionCompanyAccess(data, company);
  const role = data.roles.find(item => item.companyId === company.id && item.packId === 'paie-supervision');
  assert.ok(role);
  assert.equal(root.modulePackIds?.paie?.[0], 'paie-supervision');
  assert.deepEqual(company.requestedModulePermissions?.paie?.['préparer-une-paie'], ['voir', 'créer', 'modifier']);
  assert.deepEqual(role.modulePermissions['paie'], ['voir']);
  assert.ok(role.modulePermissions['paie:menu:préparer-une-paie']?.includes('créer'));
  assert.ok(role.modulePermissions['paie:menu:virements']?.includes('modifier'));

  const employee: Employee = {
    id: 'payroll-employee',
    firstName: 'Employé',
    lastName: 'Paie',
    email: 'employee@payroll.test',
    phone: '',
    position: 'Responsable paie',
    department: root.name,
    subDepartment: '',
    role: role.name,
    roleId: role.id,
    companyId: company.id,
    sectorId: root.id,
    status: 'ACTIF',
  };
  data.employees.push(employee);
  const access = buildAppAccessContext({
    data,
    session: `employee:${employee.id}`,
    employee,
    activeCompanyId: company.id,
    activeCompany: company,
    sectorTestCompanyId: null,
    serverModuleStatuses: null,
  });

  assert.equal(access.allowed.includes('paie'), true);
  assert.deepEqual(access.selectedPayrollFeatureIds, [
    'tableau-de-bord',
    'bénéficiaires',
    'préparer-une-paie',
    'validation',
    'virements',
    'solde-de-paie',
    'historique',
  ]);
  assert.equal(access.hasPermission('paie', 'créer'), true);
  assert.equal(access.hasPermission('paie', 'modifier'), true);
});