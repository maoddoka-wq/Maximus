import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPublicProductUrl } from './ecommerce-product-link';

test('construit un lien absolu vers la fiche produit de la boutique', () => {
  assert.equal(
    buildPublicProductUrl('https://maximus.example', 'boutique-senegal', 'cafe'),
    'https://maximus.example/shop/boutique-senegal/produit/cafe',
  );
});

test('encode les slugs pour conserver une URL publique valide', () => {
  assert.equal(
    buildPublicProductUrl('https://maximus.example', 'boutique été', 'café rouge'),
    'https://maximus.example/shop/boutique%20%C3%A9t%C3%A9/produit/caf%C3%A9%20rouge',
  );
});