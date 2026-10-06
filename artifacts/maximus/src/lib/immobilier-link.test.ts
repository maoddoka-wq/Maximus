import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPublicImmobilierUrl } from './immobilier-link.ts';

test('construit un lien absolu vers la fiche publique du bien', () => {
  assert.equal(
    buildPublicImmobilierUrl('https://maximus.example', 'agence-senegal', 'villa-almadies'),
    'https://maximus.example/shop/agence-senegal/immobilier/villa-almadies',
  );
});

test('encode les slugs du magasin et du bien', () => {
  assert.equal(
    buildPublicImmobilierUrl('https://maximus.example', 'agence été', 'villa à louer'),
    'https://maximus.example/shop/agence%20%C3%A9t%C3%A9/immobilier/villa%20%C3%A0%20louer',
  );
});
