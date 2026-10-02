import assert from 'node:assert/strict';
import test from 'node:test';

import { mutationSuccessMessage } from './mutation-feedback';

test('conserve le message métier fourni par une mutation', () => {
  assert.equal(mutationSuccessMessage('Catalogue publié.', true, true), 'Catalogue publié.');
});

test('confirme une mutation persistée même sans message spécialisé', () => {
  assert.equal(mutationSuccessMessage(undefined, true, true), 'Modification enregistrée.');
});

test('permet de désactiver explicitement le toast de succès', () => {
  assert.equal(mutationSuccessMessage(null, true, true), undefined);
});

test('ne confirme pas une mutation locale non persistée', () => {
  assert.equal(mutationSuccessMessage(undefined, true, false), undefined);
  assert.equal(mutationSuccessMessage(undefined, false, true), undefined);
});