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

test('parse une demande de création de fonctionnalité dans un module', () => {
  assert.deepEqual(
    parseMaxiActionRequest(
      'Créer la fonctionnalité « Export comptable » dans le module « Gestion commerciale » description : Exporter les écritures vers la comptabilité.',
    ),
    {
      type: 'create_feature',
      name: 'Export comptable',
      moduleId: 'Gestion commerciale',
      description: 'Exporter les écritures vers la comptabilité',
    },
  );
});

test('parse une demande de création de secteur', () => {
  assert.deepEqual(
    parseMaxiActionRequest(
      'Créer le secteur « Cabinet conseil » modules : Gestion commerciale, Présences fonctionnalités : clients, planning.',
    ),
    {
      type: 'create_sector',
      name: 'Cabinet conseil',
      moduleIds: ['Gestion commerciale', 'Présences'],
      moduleFeatures: {
        'Gestion commerciale': ['clients', 'planning'],
        Présences: ['clients', 'planning'],
      },
    },
  );
});

test('parse une proposition de configuration d’entreprise', () => {
  assert.deepEqual(
    parseMaxiActionRequest(
      'Configurer une entreprise « Atelier Kora » secteur : Artisanat modules : stocks, ecommerce besoins : suivi des commandes, catalogue public contact : atelier@example.com',
    ),
    {
      type: 'create_company_plan',
      name: 'Atelier Kora',
      sector: 'Artisanat',
      moduleIds: ['stocks', 'ecommerce'],
      requirements: ['suivi des commandes', 'catalogue public'],
      companyEmail: 'atelier@example.com',
    },
  );
});

test('parse une demande de modification d’entreprise', () => {
  assert.deepEqual(
    parseMaxiActionRequest(
      'Modifier l’entreprise « Atelier Kora » responsable : Nouvelle responsable email : contact@example.com secteur : Conseil couleur principale : #123456.',
    ),
    {
      type: 'update_company',
      name: 'Atelier Kora',
      companyName: 'Atelier Kora',
      companyId: 'Atelier Kora',
      changes: {
        manager: 'Nouvelle responsable',
        email: 'contact@example.com',
        sector: 'Conseil',
        primaryColor: '#123456',
      },
    },
  );
});