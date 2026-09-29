import assert from 'node:assert/strict';
import test from 'node:test';
import { getOrganizationSubtreeIds, unitHasAssignmentsInSubtree } from './organization-deletion';

test('la suppression d’une unité couvre sa branche sans inclure les unités voisines', () => {
  const ids = getOrganizationSubtreeIds([
    { id: 'root', parentId: undefined },
    { id: 'child', parentId: 'root' },
    { id: 'grandchild', parentId: 'child' },
    { id: 'sibling', parentId: undefined },
  ], 'root');

  assert.deepEqual([...ids], ['root', 'child', 'grandchild']);
});

test('seuls les employés et rôles du même tenant bloquent la suppression', () => {
  const nodeIds = new Set(['unit-a', 'unit-a-child']);
  const foreignAssignments = {
    employees: [{ companyId: 'company-b', sectorId: 'unit-a-child' }],
    roles: [{ companyId: 'company-b', sectorId: 'unit-a' }],
  };
  const localAssignment = {
    employees: [{ companyId: 'company-a', sectorId: 'unit-a-child' }],
    roles: [],
  };

  assert.equal(unitHasAssignmentsInSubtree(foreignAssignments, 'company-a', nodeIds), false);
  assert.equal(unitHasAssignmentsInSubtree(localAssignment, 'company-a', nodeIds), true);
});