import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyStoreData, getConfiguredModules } from './store';
import { getModuleFeatureOptions } from './module-features';
import { getCatalogSnapshot } from './catalog-workflow';
import type { LaboRecordFeatureDefinition } from './labo-composer';

test('une définition globale LABO peut être associée à plusieurs modules', () => {
  const feature: LaboRecordFeatureDefinition = {
    id: 'labo-suivi-qualite',
    label: 'Suivi qualité',
    description: 'Fiches indépendantes par module.',
    kind: 'records',
    fields: [{ id: 'title', label: 'Titre', type: 'text', required: true }],
  };

  const configured = getConfiguredModules({
    removedModules: [],
    laboFeatureCatalog: [feature],
    moduleOverrides: {
      stocks: { laboFeatureIds: [feature.id] },
      commerce: { laboFeatureIds: [feature.id] },
    },
  });

  const stockFeature = configured.find(module => module.id === 'stocks')?.laboFeatures?.[0];
  const commerceFeature = configured.find(module => module.id === 'commerce')?.laboFeatures?.[0];
  assert.equal(stockFeature?.id, feature.id);
  assert.equal(commerceFeature?.id, feature.id);
  assert.strictEqual(stockFeature, commerceFeature);
});

test('une définition LABO historique intégrée à un module reste lisible', () => {
  const legacyFeature: LaboRecordFeatureDefinition = {
    id: 'labo-fiche-historique',
    label: 'Fiche historique',
    description: '',
    kind: 'records',
    fields: [{ id: 'title', label: 'Titre', type: 'text', required: true }],
  };

  const configured = getConfiguredModules({
    removedModules: [],
    moduleOverrides: { stocks: { laboFeatures: [legacyFeature] } },
  });

  assert.equal(
    configured.find(module => module.id === 'stocks')?.laboFeatures?.[0]?.id,
    legacyFeature.id,
  );
});

test('une fonctionnalité native montée reste liée à sa source sans devenir une fiche', () => {
  const data = emptyStoreData();
  data.moduleOverrides = {
    stocks: {
      laboFeatures: [{
        id: 'labo-reuse-commerce-sales',
        label: 'Suivi commercial',
        description: 'Suivi séparé pour ce module.',
        kind: 'reuse',
        sourceModuleId: 'commerce',
        sourceFeatureId: 'sales',
      }],
    },
  };

  const snapshot = getCatalogSnapshot(data);
  const feature = snapshot.laboFeatureCatalog.find(item => item.id === 'labo-reuse-commerce-sales');
  const stocks = getConfiguredModules({
    ...data,
    ...snapshot,
  }).find(module => module.id === 'stocks');
  const commerce = getConfiguredModules({
    ...data,
    ...snapshot,
  }).find(module => module.id === 'commerce');

  assert.equal(feature?.kind, 'reuse');
  assert.equal(stocks?.laboFeatures?.[0]?.kind, 'reuse');
  assert.deepEqual(
    getModuleFeatureOptions(commerce!).map(item => item.id).includes('sales'),
    true,
  );
  assert.equal(stocks?.laboFeatureIds?.includes('labo-reuse-commerce-sales'), true);
});