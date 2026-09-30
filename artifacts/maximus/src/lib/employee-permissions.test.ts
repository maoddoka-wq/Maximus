import assert from 'node:assert/strict';
import test from 'node:test';
import type { Company, OrgNode, Role } from './store';
import { isRoleAssignableToUnit } from './employee-permissions';
import { modules } from './store';

function createCompany(): Company {
  return {
    id: 'company-1',
    name: 'Entreprise test',
    manager: 'Direction',
    email: 'company@example.test',
    phone: '',
    country: 'SN',
    sector: 'services',
    status: 'ACTIF',
    requestedModules: ['transport'],
    requestedModuleFeatures: { transport: ['trips', 'vehicles'] },
    requestedModulePermissions: {
      transport: {
        trips: ['voir', 'créer', 'modifier'],
        vehicles: ['voir'],
      },
    },
    allowedModules: ['transport'],
    refusedModules: [],
    createdAt: '2026-01-01',
  };
}

function createNodes(): OrgNode[] {
  return [
    {
      id: 'unit-root',
      companyId: 'company-1',
      name: 'Unité Transport',
      parentId: null,
      moduleIds: ['transport'],
      moduleFeatures: { transport: ['trips', 'vehicles'] },
    },
    {
      id: 'unit-child',
      companyId: 'company-1',
      name: 'Sous-unité Transport',
      parentId: 'unit-root',
      moduleIds: ['transport'],
      moduleFeatures: { transport: ['trips'] },
    },
  ];
}

function createRole(modulePermissions: Role['modulePermissions']): Role {
  return {
    id: 'role-1',
    companyId: 'company-1',
    sectorId: 'unit-root',
    name: 'Rôle Transport',
    description: '',
    modulePermissions,
  };
}

test('accepte un rôle borné par les droits actifs de l’entreprise et de l’unité', () => {
  assert.equal(
    isRoleAssignableToUnit(
      createRole({ 'transport:menu:trips': ['voir', 'créer'] }),
      createCompany(),
      'unit-child',
      createNodes(),
      modules,
    ),
    true,
  );
});

test('refuse un rôle dont une fonctionnalité est bloquée par l’unité descendante', () => {
  assert.equal(
    isRoleAssignableToUnit(
      createRole({ 'transport:menu:vehicles': ['voir'] }),
      createCompany(),
      'unit-child',
      createNodes(),
      modules,
    ),
    false,
  );
});

test('refuse un rôle lié à un module qui n’est pas actif pour l’entreprise', () => {
  const company = createCompany();
  company.allowedModules = [];

  assert.equal(
    isRoleAssignableToUnit(
      createRole({ 'transport:menu:trips': ['voir'] }),
      company,
      'unit-child',
      createNodes(),
      modules,
    ),
    false,
  );
});

test('refuse une permission de modification qui ne respecte pas la chaîne des droits', () => {
  assert.equal(
    isRoleAssignableToUnit(
      createRole({ 'transport:menu:trips': ['voir', 'modifier'] }),
      createCompany(),
      'unit-child',
      createNodes(),
      modules,
    ),
    false,
  );
});