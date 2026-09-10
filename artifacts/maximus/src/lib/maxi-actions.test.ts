import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMaxiActionRequest } from './maxi-actions';

test('parse une demande MAXI de création de module', () => {
  assert.deepEqual(
    parseMaxiActionRequest(
      'Créer le module « Gestion des projets » avec description : Planifier les projets et suivre les livrables. fonctionnalités : Pilotage, Rapports.',
    ),
    {
      type: 'create_module',
      name: 'Gestion des projets',
      description: 'Planifier les projets et suivre les livrables',
      features: ['Pilotage', 'Rapports'],
    },
  );
});

test('parse une demande MAXI de création de pack', () => {
  assert.deepEqual(
    parseMaxiActionRequest(
      'Créer le pack « Suivi de projets » pour le module « Gestion des projets » description : Suivre les projets. fonctionnalités : Pilotage, Rapports.',
    ),
    {
      type: 'create_pack',
      name: 'Suivi de projets',
      moduleId: 'Gestion des projets',
      description: 'Suivre les projets',
      featureIds: ['Pilotage', 'Rapports'],
    },
  );
});

test('parse une demande MAXI de création d’unité', () => {
  assert.deepEqual(
    parseMaxiActionRequest(
      'Créer l’unité « Équipe projets » pour l’entreprise « Entreprise Action » code : PROJ modules : Gestion des projets.',
    ),
    {
      type: 'create_organization_unit',
      name: 'Équipe projets',
      companyId: 'Entreprise Action',
      code: 'PROJ',
      moduleIds: ['Gestion des projets'],
    },
  );
});

test('ne transforme pas une demande incomplète en mutation', () => {
  assert.equal(parseMaxiActionRequest('Créer un module rapidement'), null);
});