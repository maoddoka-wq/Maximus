import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clientDeletionBlockReason,
  productDeletionBlockReason,
  supplierDeletionBlockReason,
} from './commerce-deletion-guards';

test('bloque la suppression d’un produit présent dans chaque historique métier', () => {
  assert.match(productDeletionBlockReason('p1', {
    sales: [{ items: [{ productId: 'p1' }] }],
    purchaseOrders: [],
    returns: [],
  }) ?? '', /vente/);
  assert.match(productDeletionBlockReason('p1', {
    sales: [],
    purchaseOrders: [{ productId: 'p1' }],
    returns: [],
  }) ?? '', /commande fournisseur/);
  assert.match(productDeletionBlockReason('p1', {
    sales: [],
    purchaseOrders: [],
    returns: [{ productId: 'p1' }],
  }) ?? '', /retour/);
});

test('bloque clients et fournisseurs sans dépendre de la casse du nom', () => {
  assert.match(clientDeletionBlockReason('Client Démo', {
    sales: [{ client: 'client démo' }],
    credits: [],
    returns: [],
  }) ?? '', /factures/);
  assert.match(supplierDeletionBlockReason('Fournisseur Démo', {
    purchaseOrders: [],
    returns: [{ partner: 'FOURNISSEUR DÉMO' }],
  }) ?? '', /avoir/);
});

test('autorise uniquement une fiche sans référence historique', () => {
  assert.equal(productDeletionBlockReason('p1', { sales: [], purchaseOrders: [], returns: [] }), null);
  assert.equal(clientDeletionBlockReason('Libre', { sales: [], credits: [], returns: [] }), null);
  assert.equal(supplierDeletionBlockReason('Libre', { purchaseOrders: [], returns: [] }), null);
});