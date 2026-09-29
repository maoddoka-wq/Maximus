import assert from 'node:assert/strict';
import test from 'node:test';
import { getSelectedFeatureIds } from './employee-permissions';
import { modules, type Role } from './store';

const transportModule = modules.find(module => module.id === 'transport')!;

function transportPackRole(): Role {
  return {
    id: 'transport-role',
    name: 'Gestionnaire Taxi',
    description: '',
    modulePermissions: {
      'transport:menu:overview': ['voir'],
      'transport:menu:historique': ['voir'],
      'transport:menu:parametres': ['voir'],
    },
    packId: 'transport-gestion',
    packModuleId: 'transport',
  };
}

test('les fonctionnalités choisies pour une unité dépassent le pack Transport initial', () => {
  assert.deepEqual(
    [...getSelectedFeatureIds(
      transportPackRole(),
      transportModule,
      ['overview', 'historique', 'parametres'],
    )],
    ['overview', 'historique', 'parametres'],
  );
});

test('sans sélection explicite, le pack Transport reste le modèle de départ', () => {
  assert.deepEqual(
    [...getSelectedFeatureIds(transportPackRole(), transportModule)],
    ['overview', 'trips', 'drivers', 'vehicles'],
  );
});