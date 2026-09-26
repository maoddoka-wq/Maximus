import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalAppPath, getMostSpecificNavigationHref, normalizeRoutePath } from './navigation';

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

test('sélectionne uniquement le lien le plus spécifique pour une route profonde', () => {
  assert.equal(
    getMostSpecificNavigationHref('/kora/commerce/ventes?tab=sales#detail', [
      '/entreprise/commerce',
      '/entreprise/commerce/ventes',
    ]),
    '/entreprise/commerce/ventes',
  );
});

test('sélectionne l’onglet exact sans confondre les liens qui partagent une route', () => {
  const hrefs = [
    '/entreprise/commerce',
    '/entreprise/commerce?tab=clients',
    '/entreprise/commerce?tab=purchases',
  ];
  assert.equal(
    getMostSpecificNavigationHref('/entreprise/commerce?tab=clients', hrefs),
    '/entreprise/commerce?tab=clients',
  );
  assert.equal(
    getMostSpecificNavigationHref('/entreprise/commerce?tab=unknown', hrefs),
    '/entreprise/commerce',
  );
});