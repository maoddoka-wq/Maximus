import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getAdminControlRoute,
  getCompanyControlCapabilities,
  getCompanyControlScope,
} from './control-routing';

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

test('un employé peut consulter et traiter ses tâches sans pouvoir en créer', () => {
  assert.deepEqual(
    getCompanyControlCapabilities({ employeeId: 'employee-1' }),
    { canView: true, canCreate: false, canUpdate: true },
  );
});

test('un manager conserve la règle de permissions de contrôle', () => {
  assert.deepEqual(
    getCompanyControlCapabilities({
      employeeId: 'manager-1',
      sectorManager: true,
      permissions: ['voir'],
    }),
    { canView: true, canCreate: false, canUpdate: false },
  );
});

test('un administrateur d’entreprise conserve tous les droits de coordination', () => {
  assert.deepEqual(
    getCompanyControlCapabilities({ companyAdmin: true }),
    { canView: true, canCreate: true, canUpdate: true },
  );
});