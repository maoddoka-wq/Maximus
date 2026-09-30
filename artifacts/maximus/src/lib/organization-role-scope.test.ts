import assert from 'node:assert/strict';
import test from 'node:test';
import { modules, type OrgNode, type Role } from './store';
import { getUnitFeatureIds, restrictRoleToUnitScope } from './organization-role-scope';

const transport = modules.find(module => module.id === 'transport')!;

function createUnit(moduleFeatures?: OrgNode['moduleFeatures']): OrgNode {
  return {
    id: 'transport-unit',
    companyId: 'company-1',
    name: 'Unité Transport',
    parentId: null,
    moduleIds: ['transport'],
    ...(moduleFeatures ? { moduleFeatures } : {}),
  };
}

function createRole(modulePermissions: Role['modulePermissions']): Role {
  return {
    id: 'role-1',
    companyId: 'company-1',
    sectorId: 'transport-unit',
    name: 'Rôle Transport',
    description: '',
    modulePermissions,
  };
}

test('limite les permissions du rôle aux modules et fonctionnalités choisis pour l’unité', () => {
  const unit = createUnit({ transport: ['trips'] });
  const role = createRole({
    transport: ['voir'],
    'transport:menu:trips': ['voir', 'créer'],
    'transport:menu:vehicles': ['voir'],
    'stocks:products': ['voir'],
  });

  const scopedRole = restrictRoleToUnitScope(role, unit, [unit], modules);

  assert.deepEqual(scopedRole.modulePermissions, {
    'transport:menu:trips': ['voir', 'créer'],
  });
});

test('une liste de fonctionnalités explicitement vide interdit tous les droits détaillés', () => {
  const unit = createUnit({ transport: [] });
  const role = createRole({
    'transport:menu:trips': ['voir'],
  });

  const scopedRole = restrictRoleToUnitScope(role, unit, [unit], modules);

  assert.deepEqual(scopedRole.modulePermissions, {});
  assert.deepEqual([...getUnitFeatureIds(unit, transport)!], []);
});

test('applique les fonctionnalités choisies même si l’unité n’a pas de liste de modules explicite', () => {
  const unit = createUnit({ transport: ['trips'] });
  delete unit.moduleIds;
  const role = createRole({
    'transport:menu:trips': ['voir'],
    'transport:menu:vehicles': ['voir'],
  });

  const scopedRole = restrictRoleToUnitScope(role, unit, [unit], modules);

  assert.deepEqual(scopedRole.modulePermissions, {
    'transport:menu:trips': ['voir'],
  });
});

test('les unités historiques sans liste explicite gardent les fonctionnalités du rôle', () => {
  const unit = createUnit();
  const role = createRole({
    'transport:menu:trips': ['voir'],
    'transport:menu:vehicles': ['voir'],
  });

  const scopedRole = restrictRoleToUnitScope(role, unit, [unit], modules);

  assert.deepEqual(scopedRole.modulePermissions, role.modulePermissions);
  assert.equal(getUnitFeatureIds(unit, transport), undefined);
});

test('une fonctionnalité refusée par une unité parente reste exclue du rôle', () => {
  const root = createUnit({ transport: ['trips'] });
  const child = {
    ...createUnit({ transport: ['trips', 'vehicles'] }),
    id: 'transport-child',
    name: 'Sous-unité Transport',
    parentId: root.id,
  };
  const role = createRole({
    'transport:menu:trips': ['voir'],
    'transport:menu:vehicles': ['voir'],
  });

  const scopedRole = restrictRoleToUnitScope(role, child, [root, child], modules);

  assert.deepEqual(scopedRole.modulePermissions, {
    'transport:menu:trips': ['voir'],
  });
});