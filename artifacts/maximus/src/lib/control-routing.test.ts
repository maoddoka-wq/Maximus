import assert from 'node:assert/strict';
import test from 'node:test';
import { getAdminControlRoute, getCompanyControlScope } from './control-routing';

test('sépare la coordination de la surveillance système', () => {
  assert.equal(getAdminControlRoute('/maximus/controle'), 'coordination');
  assert.equal(getAdminControlRoute('/maximus/controle?statut=EN%20COURS'), 'coordination');
  assert.equal(getAdminControlRoute('/maximus/surveillance'), 'surveillance');
  assert.notEqual(
    getAdminControlRoute('/maximus/controle'),
    getAdminControlRoute('/maximus/surveillance'),
  );
});

test('ne donne jamais un périmètre global à une vue entreprise', () => {
  assert.equal(getCompanyControlScope({ companyAdmin: true, sectorManager: false }), 'company');
  assert.equal(getCompanyControlScope({ companyAdmin: false, sectorManager: true }), 'sector');
  assert.equal(getCompanyControlScope({ companyAdmin: false, sectorManager: false }), 'assigned');
});