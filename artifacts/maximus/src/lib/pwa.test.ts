import test from 'node:test';
import assert from 'node:assert/strict';
import { clientPwaPath, clientPwaStartPath, clientPwaStorageKey, parseClientPwaPath } from './pwa';

test('génère une URL de lancement et une identité propres à chaque boutique', () => {
  const startPath = clientPwaStartPath('boutique-senegal');

  assert.equal(startPath, '/client-app/shop/boutique-senegal/');
  assert.deepEqual(parseClientPwaPath(startPath), { slug: 'boutique-senegal' });
  assert.notEqual(clientPwaStorageKey('boutique-senegal'), clientPwaStorageKey('autre-boutique'));
});

test('conserve le slug de la boutique dans chaque navigation PWA', () => {
  assert.equal(clientPwaPath('boutique-senegal'), '/client-app/shop/boutique-senegal/');
  assert.equal(clientPwaPath('boutique-senegal', '/produit/cafe'), '/client-app/shop/boutique-senegal/produit/cafe');
  assert.equal(clientPwaPath('boutique-senegal', '/panier'), '/client-app/shop/boutique-senegal/panier');
  assert.equal(clientPwaPath('boutique-senegal', '/compte/commandes/commande-1'), '/client-app/shop/boutique-senegal/compte/commandes/commande-1');
  assert.deepEqual(parseClientPwaPath(clientPwaPath('boutique-senegal', '/panier')), { slug: 'boutique-senegal' });
  assert.deepEqual(parseClientPwaPath(clientPwaPath('boutique-senegal', '/compte/commandes/commande-1')), { slug: 'boutique-senegal' });
});

test('conserve le lancement des boutiques sur domaine personnalisé', () => {
  assert.deepEqual(parseClientPwaPath('/client-app/'), { domain: true });
  assert.deepEqual(parseClientPwaPath('/client-app/panier'), { domain: true });
  assert.equal(clientPwaStorageKey(undefined, true), 'domain');
  assert.equal(clientPwaPath(undefined, '', true), '/client-app/');
  assert.equal(clientPwaPath(undefined, '/panier', true), '/client-app/panier');
});

test('refuse une route PWA boutique incomplète et accepte ses sous-routes', () => {
  assert.equal(parseClientPwaPath('/client-app/shop/'), null);
  assert.equal(parseClientPwaPath('/client-app/shop'), null);
  assert.deepEqual(parseClientPwaPath('/client-app/shop/a/b/'), { slug: 'a' });
});