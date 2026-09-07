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