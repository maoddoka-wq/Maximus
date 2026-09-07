import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyStoreData, getCompanyDirectoryCompanies, normalizeStoreData, sanitizeStoreData } from './store';

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

test('conserve les packs des presets de secteur dans l’état initial', () => {
  const data = emptyStoreData();
  const distribution = data.sectorPresets.find(preset => preset.id === 'distribution');
  const services = data.sectorPresets.find(preset => preset.id === 'services');
  const commerce = data.sectorPresets.find(preset => preset.id === 'commerce');

  assert.deepEqual(distribution?.modulePackIds, {
    stocks: ['stock-gestion'],
    commerce: ['commerce-gestion'],
  });
  assert.deepEqual(services?.modulePackIds, {
    stocks: ['stock-consultation'],
    commerce: ['commerce-consultation'],
    presences: ['presence-consultation'],
  });
  assert.deepEqual(commerce?.modulePackIds, {
    commerce: ['commerce-gestion'],
    stocks: ['stock-gestion'],
    ecommerce: ['ecommerce-gestion'],
  });
});

test('rétablit les packs des presets intégrés dans une sauvegarde ancienne', () => {
  const normalized = normalizeStoreData({
    sectorPresets: [
      {
        id: 'distribution',
        name: 'Distribution personnalisée',
        moduleIds: ['commerce', 'stocks'],
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
      ],
      updatedAt: '2026-09-07T00:00:00.000Z',
    },
  });

  assert.deepEqual(normalized.sectorPresets[0]?.modulePackIds, {
    stocks: ['stock-gestion'],
    commerce: ['commerce-gestion'],
  });
  assert.deepEqual(normalized.catalogDraft?.sectorPresets[0]?.modulePackIds, {
    stocks: ['stock-consultation'],
    commerce: ['commerce-consultation'],
    presences: ['presence-consultation'],
  });
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