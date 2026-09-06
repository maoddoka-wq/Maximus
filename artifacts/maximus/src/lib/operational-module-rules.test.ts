import test from 'node:test';
import assert from 'node:assert/strict';

import {
  transitionOptions,
  validateOperationalRecord,
  type OperationalRuleConfig,
} from './operational-module-rules';

const field = (key: string, label = key, type?: 'number' | 'select') => ({
  key,
  label,
  ...(type ? { type } : {}),
});

function config(id: OperationalRuleConfig['id'], fields: OperationalRuleConfig['fields']): OperationalRuleConfig {
  return { id, fields };
}

test('refuse une fiche opérationnelle quand un champ obligatoire est vide', () => {
  const result = validateOperationalRecord(
    config('achats', [field('supplier', 'Fournisseur'), field('amount', 'Montant', 'number')]),
    { supplier: ' ', amount: '1000' },
  );

  assert.equal(result, 'Le champ « Fournisseur » est obligatoire.');
});

test('valide les commandes avec un montant strictement positif', () => {
  const fields = [field('supplier'), field('amount', 'Montant', 'number')];

  assert.equal(
    validateOperationalRecord(config('achats', fields), { supplier: 'Senelec', amount: '0' }),
    'Le montant doit être strictement supérieur à zéro.',
  );
  assert.equal(validateOperationalRecord(config('achats', fields), { supplier: 'Senelec', amount: '150000' }), '');
});

test('impose un débit égal au crédit en comptabilité', () => {
  const fields = [field('debit', 'Débit', 'number'), field('credit', 'Crédit', 'number')];

  assert.equal(
    validateOperationalRecord(config('comptabilite', fields), { debit: '100', credit: '90' }),
    'Le débit et le crédit doivent être strictement égaux.',
  );
  assert.equal(validateOperationalRecord(config('comptabilite', fields), { debit: '100', credit: '100' }), '');
});

test('empêche un net de paie supérieur au brut', () => {
  const fields = [field('gross', 'Brut', 'number'), field('net', 'Net', 'number')];

  assert.equal(
    validateOperationalRecord(config('paie', fields), { gross: '100', net: '101' }),
    'Le net à payer ne peut pas dépasser le salaire brut.',
  );
});

test('limite le score fournisseur à une valeur comprise entre zéro et cent', () => {
  const fields = [field('name'), field('score', 'Score', 'number')];

  assert.equal(
    validateOperationalRecord(config('fournisseurs', fields), { name: 'Fournisseur A', score: '101' }),
    'Le score fournisseur doit être compris entre 0 et 100.',
  );
  assert.equal(validateOperationalRecord(config('fournisseurs', fields), { name: 'Fournisseur A', score: '80' }), '');
});

test('verrouille les statuts finalisés et expose les transitions autorisées', () => {
  assert.deepEqual(transitionOptions('VALIDÉ'), ['VALIDÉ']);
  assert.deepEqual(transitionOptions('ARCHIVÉ'), ['ARCHIVÉ']);
  assert.deepEqual(transitionOptions('BROUILLON'), [
    'BROUILLON',
    'EN ATTENTE',
    'ACTIF',
    'VALIDÉ',
    'ARCHIVÉ',
  ]);
  assert.deepEqual(transitionOptions('EN ATTENTE'), [
    'EN ATTENTE',
    'ACTIF',
    'VALIDÉ',
    'CONFIRMÉ',
    'ARCHIVÉ',
  ]);
});