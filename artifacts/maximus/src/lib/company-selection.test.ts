import assert from 'node:assert/strict';
import test from 'node:test';
import { getModulePackError, normalizeFeatureIdsForSelectedPacks, normalizeModuleFeatureIds } from './module-features';
import { modules, type Module } from './store';

const module: Module = {
  id: 'atelier', name: 'Atelier', description: '', features: ['Échéances', 'Historique'],
  featurePacks: [
    { id: 'atelier-suivi', name: 'Suivi', featureIds: ['echeances'] },
    { id: 'atelier-stale', name: 'Obsolète', featureIds: ['deleted-feature'] },
  ],
};

test('packless selections remain explicit, including an empty selection', () => {
  assert.deepEqual(normalizeFeatureIdsForSelectedPacks(module, ['Échéances'], []), ['échéances']);
  assert.deepEqual(normalizeFeatureIdsForSelectedPacks(module, [], []), []);
  const commerce = modules.find(item => item.id === 'commerce')!;
  assert.deepEqual(normalizeFeatureIdsForSelectedPacks(commerce, ['settings'], []), ['settings']);
});

test('pack aliases and labels match canonical feature IDs without admitting other features', () => {
  assert.equal(getModulePackError(module, ['atelier-suivi']), null);
  assert.deepEqual(normalizeFeatureIdsForSelectedPacks(module, ['échéances', 'historique'], ['atelier-suivi']), ['échéances']);
  assert.deepEqual(normalizeModuleFeatureIds(module, ['not-real']), []);
});

test('stale pack IDs and missing feature references surface actionable errors', () => {
  assert.match(getModulePackError(module, ['deleted-pack'])!, /n’est plus publié/);
  assert.match(getModulePackError(module, ['atelier-stale'])!, /fonctionnalité absente/);
});