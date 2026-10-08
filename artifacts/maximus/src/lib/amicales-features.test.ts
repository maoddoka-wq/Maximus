import assert from 'node:assert/strict';
import test from 'node:test';
import { amicaleFeatureDefinitions, resolveAmicaleAllowedFeatureIds } from './amicales-features.ts';

test('un module Amicales actif sans périmètre explicite expose son manifeste', () => {
  assert.deepEqual(
    resolveAmicaleAllowedFeatureIds({ featureIds: [], configuration: {} }),
    amicaleFeatureDefinitions.map(feature => feature.id),
  );
});

test('une sélection Amicales explicitement vide reste vide', () => {
  assert.deepEqual(
    resolveAmicaleAllowedFeatureIds({ featureIds: [], configuration: { featureScope: 'explicit' } }),
    [],
  );
});

test('un accès Amicales limité à un pack n’expose que les fonctionnalités de ce pack', () => {
  assert.deepEqual(
    resolveAmicaleAllowedFeatureIds({ featureIds: [], configuration: { packIds: ['amicale-activites'] } }),
    ['dashboard', 'activites', 'annonces'],
  );
});
