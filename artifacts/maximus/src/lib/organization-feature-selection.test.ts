import assert from 'node:assert/strict';
import test from 'node:test';
import { modules } from './store';
import {
  getFeaturesAfterPackChange,
  getFeatureIdsForSelectedPacks,
  toggleOrganizationFeatureSelection,
} from './organization-feature-selection';

const transport = modules.find(module => module.id === 'transport')!;

test('un pack initialise les fonctionnalités de départ avec des identifiants canoniques', () => {
  assert.deepEqual(
    getFeatureIdsForSelectedPacks(transport, ['transport-consultation']),
    ['overview', 'trips', 'drivers', 'vehicles'],
  );
});

test('les fonctionnalités restent choisissables en dehors du pack sélectionné', () => {
  const selected = toggleOrganizationFeatureSelection(
    transport,
    ['overview', 'trips'],
    'parametres',
  );
  assert.deepEqual(selected, ['overview', 'trips', 'parametres']);
});

test('un changement de pack conserve les choix explicites de fonctionnalités', () => {
  assert.deepEqual(
    getFeaturesAfterPackChange(
      transport,
      ['transport-gestion'],
      ['overview', 'parametres'],
      true,
    ),
    ['overview', 'parametres'],
  );
});

test('le premier pack fournit les choix initiaux si aucune sélection manuelle n’existe', () => {
  assert.deepEqual(
    getFeaturesAfterPackChange(transport, ['transport-consultation'], undefined, false),
    ['overview', 'trips', 'drivers', 'vehicles'],
  );
});

test('les fonctionnalités individuelles restent configurables sans sélectionner de pack', () => {
  const selected = toggleOrganizationFeatureSelection(transport, ['overview'], 'historique');
  assert.deepEqual(selected, ['overview', 'historique']);
});