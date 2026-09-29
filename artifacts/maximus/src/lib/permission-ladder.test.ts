import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePermissionLadder, togglePermissionLadder } from './permission-ladder';

test('la modification entraîne automatiquement la création et la consultation', () => {
  assert.deepEqual(togglePermissionLadder([], 'modifier'), ['voir', 'créer', 'modifier']);
});

test('retirer la création retire aussi la modification sans retirer la consultation', () => {
  assert.deepEqual(
    togglePermissionLadder(['voir', 'créer', 'modifier'], 'créer'),
    ['voir'],
  );
});

test('retirer la consultation retire tous les droits dépendants', () => {
  assert.deepEqual(
    togglePermissionLadder(['voir', 'créer', 'modifier'], 'voir'),
    [],
  );
});

test('une ancienne permission modifier sans création reste limitée à voir', () => {
  assert.deepEqual(normalizePermissionLadder(['voir', 'modifier']), ['voir']);
});

test('les trois états disponibles suivent l’ordre attendu', () => {
  assert.deepEqual(normalizePermissionLadder(['voir']), ['voir']);
  assert.deepEqual(normalizePermissionLadder(['voir', 'créer']), ['voir', 'créer']);
  assert.deepEqual(normalizePermissionLadder(['voir', 'créer', 'modifier']), [
    'voir',
    'créer',
    'modifier',
  ]);
});