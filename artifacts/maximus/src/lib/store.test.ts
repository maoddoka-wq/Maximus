import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyStoreData, getCompanyDirectoryCompanies, getConfiguredModules, normalizeStoreData, sanitizeStoreData, sectorPresets } from './store';

test('reconstruit les collections métier quand une sauvegarde partielle contient null', () => {
  const normalized = normalizeStoreData({
    companies: null as never,
    roles: null as never,
    orgNodes: null as never,
    controlTasks: null as never,
    domainEvents: null as never,
    auditEntries: null as never,
    commerceStates: [] as never,
    moduleOverrides: [] as never,
  });

  assert.deepEqual(normalized.companies, []);
  assert.deepEqual(normalized.roles, []);
  assert.deepEqual(normalized.orgNodes, []);
  assert.deepEqual(normalized.controlTasks, []);
  assert.deepEqual(normalized.domainEvents, []);
  assert.deepEqual(normalized.auditEntries, []);
  assert.deepEqual(normalized.commerceStates, {});
  assert.deepEqual(normalized.moduleOverrides, {});
});

test('normalise les champs textuels optionnels d’une entreprise avant le formulaire', () => {
  const normalized = normalizeStoreData({
    companies: [{
      id: 'company-null-fields',
      name: 'Entreprise test',
      manager: 'Responsable',
      email: 'owner@test.local',
      phone: null,
      country: null,
      sector: null,
      status: 'ACTIF',
      requestedModules: ['commerce'],
      allowedModules: ['commerce'],
      refusedModules: [],
      createdAt: '2026-09-07',
    } as never],
  });

  assert.deepEqual(normalized.companies[0], {
    id: 'company-null-fields',
    name: 'Entreprise test',
    manager: 'Responsable',
    email: 'owner@test.local',
    phone: '',
    country: '',
    sector: '',
    status: 'ACTIF',
    requestedModules: ['commerce'],
    allowedModules: ['commerce'],
    refusedModules: [],
    createdAt: '2026-09-07',
  });
});

test('répare les tableaux de droits absents des anciennes fiches entreprise', () => {
  const normalized = normalizeStoreData({
    companies: [{
      id: 'legacy-company',
      name: 'Entreprise historique',
      manager: 'Responsable',
      email: 'owner@test.local',
      phone: '',
      country: 'Sénégal',
      sector: 'Services',
      status: 'ACTIF',
      createdAt: '2026-09-07',
    } as never],
  });

  assert.deepEqual(normalized.companies[0]?.requestedModules, []);
  assert.deepEqual(normalized.companies[0]?.allowedModules, []);
  assert.deepEqual(normalized.companies[0]?.refusedModules, []);
});

test('conserve les données valides pendant le nettoyage des credentials', () => {
  const data = emptyStoreData();
  data.companies.push({
    id: 'company-test',
    name: 'Entreprise test',
    manager: 'Admin',
    email: 'admin@test.local',
    phone: '',
    country: 'Sénégal',
    sector: 'Services',
    status: 'ACTIF',
    requestedModules: ['commerce'],
    allowedModules: ['commerce'],
    refusedModules: [],
    createdAt: '2026-09-07',
    adminPassword: 'ne-doit-pas-sortir',
  } as never);

  const sanitized = sanitizeStoreData(data);
  assert.equal(sanitized.companies[0]?.name, 'Entreprise test');
  assert.equal('adminPassword' in sanitized.companies[0], false);
});

test('ne repropose plus les secteurs intégrés retirés dans l’état initial', () => {
  const data = emptyStoreData();
  assert.equal(data.sectorPresets.some(preset =>
    ['distribution', 'agroalimentaire', 'services', 'commerce'].includes(preset.id),
  ), false);
});

test('propose les huit profils d’activité de départ pour le Sénégal', () => {
  const data = emptyStoreData();
  assert.equal(data.sectorPresets.length, 8);
  assert.deepEqual(
    data.sectorPresets.map(preset => preset.id),
    sectorPresets.map(preset => preset.id),
  );
  assert.ok(data.sectorPresets.every(preset => preset.moduleIds.length > 0));
  assert.ok(data.sectorPresets.every(preset =>
    preset.moduleIds.every(moduleId => ['commerce', 'ecommerce', 'stocks', 'presences'].includes(moduleId)),
  ));
});

test('réinjecte les profils de départ dans une ancienne sauvegarde vide', () => {
  const normalized = normalizeStoreData({
    sectorPresets: [],
    catalogVersion: 1,
  });

  assert.equal(normalized.catalogVersion, 2);
  assert.deepEqual(
    normalized.sectorPresets.map(preset => preset.id),
    sectorPresets.map(preset => preset.id),
  );
});

test('nettoie les secteurs intégrés retirés des anciennes sauvegardes', () => {
  const normalized = normalizeStoreData({
    sectorPresets: [
      {
        id: 'distribution',
        name: 'Distribution personnalisée',
        moduleIds: ['commerce', 'stocks'],
      },
      {
        id: 'custom-sector',
        name: 'Construction',
        moduleIds: ['commerce'],
      },
    ],
    catalogDraft: {
      moduleOverrides: {},
      moduleStatuses: {},
      removedModules: [],
      sectorPresets: [
        {
          id: 'services',
          name: 'Services',
          moduleIds: ['commerce', 'stocks', 'presences'],
        },
        {
          id: 'custom-sector-draft',
          name: 'Conseil',
          moduleIds: ['commerce'],
        },
      ],
      updatedAt: '2026-09-07T00:00:00.000Z',
    },
  });

  assert.deepEqual(normalized.sectorPresets.map(preset => preset.id), ['custom-sector']);
  assert.deepEqual(normalized.catalogDraft?.sectorPresets.map(preset => preset.id), ['custom-sector-draft']);
});

test('isole les écrans de fonctionnalités des overrides de modules incomplets', () => {
  const configured = getConfiguredModules({
    removedModules: [],
    moduleOverrides: {
      ecommerce: {
        name: null as never,
        features: null as never,
        featurePacks: [
          {
            id: 'legacy-pack',
            name: 'Pack historique',
            featureIds: null as never,
            featurePermissions: null as never,
          },
          {
            id: null as never,
            name: 'Pack sans identifiant',
            featureIds: ['catalog'],
          },
        ],
      },
      presences: {
        features: null as never,
        featurePacks: null as never,
      },
    },
  });

  const ecommerce = configured.find(module => module.id === 'ecommerce');
  const presences = configured.find(module => module.id === 'presences');

  assert.equal(ecommerce?.name, 'E-commerce');
  assert.ok(Array.isArray(ecommerce?.features));
  assert.deepEqual(ecommerce?.featurePacks, [{
    id: 'legacy-pack',
    name: 'Pack historique',
    description: '',
    featureIds: [],
    featurePermissions: {},
  }]);
  assert.ok(Array.isArray(presences?.features));
  assert.ok(Array.isArray(presences?.featurePacks));
});

test('retire les demandes en attente de l’annuaire des entreprises', () => {
  const companies = emptyStoreData().companies.concat([
    {
      id: 'pending-company',
      name: 'Demande en attente',
      manager: 'Responsable',
      email: 'pending@example.test',
      phone: '',
      country: 'Sénégal',
      sector: 'Services',
      status: 'EN ATTENTE',
      requestedModules: ['commerce'],
      allowedModules: [],
      refusedModules: [],
      createdAt: '2026-09-07',
    },
    {
      id: 'active-company',
      name: 'Entreprise active',
      manager: 'Responsable',
      email: 'active@example.test',
      phone: '',
      country: 'Sénégal',
      sector: 'Services',
      status: 'ACTIF',
      requestedModules: ['commerce'],
      allowedModules: ['commerce'],
      refusedModules: [],
      createdAt: '2026-09-07',
    },
  ]);

  assert.deepEqual(getCompanyDirectoryCompanies(companies).map(company => company.id), ['active-company']);
});