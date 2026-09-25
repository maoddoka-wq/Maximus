import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createLaboFeatureId,
  createLaboReuseFeatureId,
  sourceFeatureHref,
  validateLaboFeatures,
  type LaboFeatureDefinition,
} from './labo-composer';

describe('LABO composition definitions', () => {
  it('creates stable readable ids from French labels and source references', () => {
    assert.equal(createLaboFeatureId('Suivi des livraisons'), 'custom-suivi-des-livraisons');
    assert.equal(createLaboFeatureId('Équipe & présence'), 'custom-equipe-presence');
    assert.equal(createLaboReuseFeatureId('e-commerce', 'commandes'), 'reuse-e-commerce-commandes');
    assert.equal(sourceFeatureHref('ecommerce', 'orders'), '/entreprise/ecommerce?tab=orders');
  });

  it('accepts record fields with a valid ordered workflow', () => {
    const feature: LaboFeatureDefinition = {
      id: 'custom-demandes',
      label: 'Demandes',
      description: '',
      kind: 'records',
      fields: [{ id: 'reference', label: 'Référence', type: 'text', required: true }],
      workflow: {
        stages: [
          { id: 'brouillon', label: 'Brouillon', requiredFieldIds: [] },
          { id: 'valide', label: 'Validé', requiredFieldIds: ['reference'] },
        ],
      },
    };

    assert.deepEqual(validateLaboFeatures([feature]), []);
  });

  it('rejects repeated feature and field ids, invalid choices, and a one-stage workflow', () => {
    const feature: LaboFeatureDefinition = {
      id: 'custom-demandes',
      label: 'Demandes',
      description: '',
      kind: 'records',
      fields: [
        { id: 'reference', label: 'Référence', type: 'select', required: true, options: ['A', 'A'] },
        { id: 'reference', label: 'Autre référence', type: 'text', required: false },
      ],
      workflow: {
        stages: [{ id: 'brouillon', label: 'Brouillon', requiredFieldIds: ['absent'] }],
      },
    };

    const errors = validateLaboFeatures([feature, feature]);
    assert.ok(errors.some(error => error.includes('plusieurs fois')));
    assert.ok(errors.some(error => error.includes('répété')));
    assert.ok(errors.some(error => error.includes('choix répétés')));
    assert.ok(errors.some(error => error.includes('deux étapes')));
    assert.ok(errors.some(error => error.includes('champ qui n’existe pas')));
  });
});