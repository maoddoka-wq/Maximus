import assert from 'node:assert/strict';
import test from 'node:test';
import type { OrgNode } from './store';
import { getEffectiveUnitModuleIds, getSelectableUnitModuleIds } from './organization-module-scope';

const nodes: OrgNode[] = [
  {
    id: 'root',
    companyId: 'company-a',
    name: 'Direction',
    parentId: null,
    moduleIds: ['stocks', 'transport'],
  },
  {
    id: 'child',
    companyId: 'company-a',
    name: 'Exploitation',
    parentId: 'root',
    moduleIds: ['stocks', 'commerce'],
  },
  {
    id: 'grandchild',
    companyId: 'company-a',
    name: 'Équipe',
    parentId: 'child',
  },
  {
    id: 'foreign-parent',
    companyId: 'company-b',
    name: 'Autre entreprise',
    parentId: null,
    moduleIds: ['commerce'],
  },
];

test('une unité enfant ne peut pas dépasser les modules sélectionnés dans sa branche', () => {
  assert.deepEqual(
    [...(getEffectiveUnitModuleIds(nodes, nodes[1]) ?? [])],
    ['stocks'],
  );
  assert.deepEqual(
    [...(getEffectiveUnitModuleIds(nodes, nodes[2]) ?? [])],
    ['stocks'],
  );
});

test('les choix d’une nouvelle unité respectent tous les modules de ses parents', () => {
  assert.deepEqual(
    [...getSelectableUnitModuleIds(nodes, 'child', ['stocks', 'transport', 'commerce'])],
    ['stocks'],
  );
});

test('une unité sans restriction explicite hérite de ses ancêtres', () => {
  assert.deepEqual(
    [...(getEffectiveUnitModuleIds(nodes, nodes[2]) ?? [])],
    ['stocks'],
  );
});

test('une racine conserve le choix des modules autorisés de l’entreprise', () => {
  assert.deepEqual(
    [...getSelectableUnitModuleIds(nodes, '', ['stocks', 'commerce'])],
    ['stocks', 'commerce'],
  );
});

test('une unité ne récupère pas le parent homonyme d’une autre entreprise', () => {
  const child: OrgNode = {
    id: 'foreign-child',
    companyId: 'company-a',
    name: 'Enfant',
    parentId: 'foreign-parent',
    moduleIds: ['commerce'],
  };
  assert.deepEqual(
    [...getEffectiveUnitModuleIds([...nodes, child], child)!],
    ['commerce'],
  );
});