import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalAppPath, normalizeRoutePath } from './navigation';

test('reconnaît une route profonde après actualisation avec slash final', () => {
  assert.equal(normalizeRoutePath('/maximus/secteurs/'), '/maximus/secteurs');
  assert.equal(normalizeRoutePath('/maximus/entreprises/organisation/?tab=roles'), '/maximus/entreprises/organisation');
});

test('canonicalise les anciens chemins sans perdre leurs paramètres', () => {
  assert.equal(
    canonicalAppPath('/kora/stocks/?tab=products'),
    '/entreprise/stocks?tab=products',
  );
});