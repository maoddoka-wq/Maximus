import assert from 'node:assert/strict';
import test from 'node:test';
import { appStateScopeMatchesSession } from './app-state-scope';
import { emptyStoreData, type StoreData } from './store';

function scopedData(companyId: string, employeeId = 'employee-1'): StoreData {
  return {
    ...emptyStoreData(),
    companies: [{ id: companyId }] as StoreData['companies'],
    employees: [{ id: employeeId, companyId }] as StoreData['employees'],
  };
}

test('accepte uniquement la portée de l’entreprise connectée', () => {
  const data = scopedData('company-a');

  assert.equal(appStateScopeMatchesSession('company:company-a', 'company:company-a', data), true);
  assert.equal(appStateScopeMatchesSession('company:company-a', 'company:company-b', data), false);
});

test('borne la portée employé à son entreprise et à son identité', () => {
  const data = scopedData('company-a', 'employee-a');

  assert.equal(appStateScopeMatchesSession('employee:employee-a', 'company:company-a', data), true);
  assert.equal(appStateScopeMatchesSession('employee:employee-a', 'company:company-b', data), false);
  assert.equal(appStateScopeMatchesSession('employee:employee-b', 'company:company-a', data), false);
});

test('réserve la portée workspace à MAXIMUS', () => {
  const data = scopedData('company-a');

  assert.equal(appStateScopeMatchesSession('admin', 'workspace', data), true);
  assert.equal(appStateScopeMatchesSession('company:company-a', 'workspace', data), false);
});