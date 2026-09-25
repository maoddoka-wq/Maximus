import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyStoreData, getConfiguredModules } from './store';
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

test('une ancienne réutilisation native devient une fiche LABO indépendante', () => {
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

  assert.equal(feature?.kind, 'records');
  assert.deepEqual(feature?.fields.map(field => field.id), ['title', 'details']);
  assert.equal(stocks?.laboFeatures?.[0]?.kind, 'records');
  assert.deepEqual(stocks?.laboFeatures?.[0]?.origin, {
    moduleId: 'commerce',
    featureId: 'sales',
  });
});