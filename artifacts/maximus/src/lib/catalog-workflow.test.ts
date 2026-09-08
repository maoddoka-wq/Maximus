import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCatalogImpact,
  getCatalogSnapshot,
  publishCatalogDraft,
  updateCatalogDraft,
  validateCatalogDraft,
} from './catalog-workflow';
import { modules, type StoreData } from './store';

function fixture(): StoreData {
  return {
    companies: [
      {
        id: 'company-1',
        name: 'Entreprise test',
        manager: 'Admin',
        email: 'admin@test.demo',
        phone: '',
        country: 'Sénégal',
        sector: 'Distribution',
        status: 'ACTIF',
        requestedModules: ['commerce', 'stocks'],
        allowedModules: ['commerce', 'stocks'],
        refusedModules: [],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    employees: [],
    roles: [],
    products: [],
    movements: [],
    sales: [],
    activities: [],
    controlTasks: [],
    domainEvents: [],
    auditEntries: [],
    orgNodes: [
      {
        id: 'unit-1',
        companyId: 'company-1',
        name: 'Direction',
        type: 'direction',
        parentId: null,
        moduleIds: ['commerce', 'stocks'],
        modulePackIds: { stocks: ['stock-gestion'] },
      },
    ],
    notifications: [],
    purchaseOrders: [],
    accountingEntries: [],
    payrollSlips: [],
    crmOpportunities: [],
    supplierRecords: [],
    deliveries: [],
    businessDocuments: [],
    subscriptions: [],
    sectorPresets: [
      {
        id: 'distribution',
        name: 'Distribution',
        moduleIds: ['commerce', 'stocks'],
        modulePackIds: { commerce: ['commerce-gestion'], stocks: ['stock-gestion'] },
      },
    ],
    moduleStatuses: {},
    moduleOverrides: {},
    removedModules: [],
    catalogVersion: 2,
  };
}

test('enregistre les modifications du catalogue en brouillon sans toucher au publié', () => {
  const data = fixture();
  updateCatalogDraft(data, draft => {
    draft.moduleStatuses.commerce = 'MAINTENANCE';
  });

  assert.equal(data.moduleStatuses?.commerce, undefined);
  assert.equal(data.catalogDraft?.moduleStatuses.commerce, 'MAINTENANCE');
  assert.equal(getCatalogSnapshot(data).moduleStatuses.commerce, 'MAINTENANCE');
});

test('bloque la publication d’un catalogue incohérent', () => {
  const data = fixture();
  updateCatalogDraft(data, draft => {
    draft.moduleOverrides.stocks = {
      featurePacks: [
        { id: 'pack-a', name: 'Gestion', featureIds: ['products'] },
        { id: 'pack-b', name: 'Gestion', featureIds: ['entries'] },
      ],
    };
    draft.sectorPresets[0].modulePackIds = {
      commerce: ['commerce-gestion'],
      stocks: ['pack-inexistant'],
    };
  });

  const validation = validateCatalogDraft(data);
  assert.ok(validation.errors.some(error => error.includes('même nom')));
  assert.ok(validation.errors.some(error => error.includes('pack absent')));
});

test('signale un brouillon de catalogue ancien sans faire planter sa validation', () => {
  const data = fixture();
  updateCatalogDraft(data, draft => {
    draft.moduleOverrides.ecommerce = {
      description: null as never,
      features: null as never,
      featurePacks: [
        {
          id: 'legacy-pack',
          name: null as never,
          featureIds: null as never,
          description: null as never,
        },
      ],
    };
  });

  const validation = validateCatalogDraft(data);

  assert.ok(validation.errors.some(error => error.includes('description')));
  assert.ok(validation.errors.some(error => error.includes('fonctionnalité')));
});

test('publie un catalogue et nettoie les accès aux modules retirés', () => {
  const data = fixture();
  updateCatalogDraft(data, draft => {
    draft.removedModules = ['stocks'];
    draft.moduleStatuses.stocks = 'INACTIF';
    draft.sectorPresets = draft.sectorPresets.map(sector => ({
      ...sector,
      moduleIds: sector.moduleIds.filter(moduleId => moduleId !== 'stocks'),
      modulePackIds: { commerce: ['commerce-gestion'] },
    }));
  });

  const impact = getCatalogImpact(data);
  assert.equal(impact.changedModules, 1);
  assert.equal(impact.affectedCompanies, 1);
  assert.equal(impact.affectedUnits, 1);

  publishCatalogDraft(data);

  assert.equal(data.catalogDraft, undefined);
  assert.equal(data.catalogVersion, 3);
  assert.deepEqual(data.companies[0].allowedModules, ['commerce']);
  assert.deepEqual(data.orgNodes[0].moduleIds, ['commerce']);
  assert.deepEqual(data.sectorPresets[0].moduleIds, ['commerce']);
  assert.equal(modules.some(module => module.id === 'stocks'), true);
});