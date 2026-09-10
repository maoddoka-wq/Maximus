import test from 'node:test';
import assert from 'node:assert/strict';
import { clientPwaStartPath, clientPwaStorageKey, parseClientPwaPath } from './pwa';

test('génère une URL de lancement et une identité propres à chaque boutique', () => {
  const startPath = clientPwaStartPath('boutique-senegal');

  assert.equal(startPath, '/client-app/shop/boutique-senegal/');
  assert.deepEqual(parseClientPwaPath(startPath), { slug: 'boutique-senegal' });
  assert.notEqual(clientPwaStorageKey('boutique-senegal'), clientPwaStorageKey('autre-boutique'));
});

test('conserve le lancement des boutiques sur domaine personnalisé', () => {
  assert.deepEqual(parseClientPwaPath('/client-app/'), { domain: true });
  assert.equal(clientPwaStorageKey(undefined, true), 'domain');
});

test('refuse une route PWA boutique incomplète ou imbriquée', () => {
  assert.equal(parseClientPwaPath('/client-app/shop/'), null);
  assert.equal(parseClientPwaPath('/client-app/shop/a/b/'), null);
});