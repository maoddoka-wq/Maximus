import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildModulePack, emptyModulePackDraft, updatePackPermission } from './module-pack';
import { getModuleFeatureOptions } from './module-features';
import type { Module } from './store';

const moduleFixture: Module = {
  id: 'achats',
  name: 'Achats',
  description: 'Demandes et commandes fournisseurs.',
  features: ['Demandes', 'Commandes'],
  status: 'ACTIF',
};
const [firstFeature] = getModuleFeatureOptions(moduleFixture);

test('construit un pack uniquement avec les fonctionnalités ayant un droit', () => {
  const draft = updatePackPermission(emptyModulePackDraft(), firstFeature.id, 'edit');
  const pack = buildModulePack(moduleFixture, { ...draft, name: 'Gestionnaire' }, 'pack-stocks');

  assert.deepEqual(pack, {
    id: 'pack-stocks',
    name: 'Gestionnaire',
    description: '',
    featureIds: [firstFeature.id],
    featurePermissions: { [firstFeature.id]: ['voir', 'créer', 'modifier'] },
  });
});

test('refuse un pack sans fonctionnalité autorisée', () => {
  const pack = buildModulePack(moduleFixture, { ...emptyModulePackDraft(), name: 'Pack vide' }, 'pack-empty');

  assert.equal(pack, null);
});
