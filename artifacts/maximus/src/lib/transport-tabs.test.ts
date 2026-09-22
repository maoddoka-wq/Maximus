import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveTransportTab } from './transport-tabs';

test('résout chaque identifiant canonique Transport vers sa vue correspondante', () => {
  const expected = {
    overview: 'overview',
    trips: 'trips',
    drivers: 'drivers',
    vehicles: 'vehicles',
    historique: 'historique',
    parametres: 'parametres',
  } as const;

  for (const [featureId, tabId] of Object.entries(expected)) {
    assert.equal(resolveTransportTab(featureId), tabId);
  }
});

test('conserve la compatibilité des anciens identifiants Transport', () => {
  assert.equal(resolveTransportTab('courses'), 'trips');
  assert.equal(resolveTransportTab('chauffeurs'), 'drivers');
  assert.equal(resolveTransportTab('vehicules'), 'vehicles');
  assert.equal(resolveTransportTab('history'), 'historique');
  assert.equal(resolveTransportTab('settings'), 'parametres');
  assert.equal(resolveTransportTab('unknown'), undefined);
});