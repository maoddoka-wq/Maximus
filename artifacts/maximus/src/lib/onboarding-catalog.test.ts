import assert from 'node:assert/strict';
import test from 'node:test';
import { activeModuleIds, getCustomerNeeds, isNeedAvailable } from './onboarding-catalog';
import { emptyStoreData } from './store';

test('construit les choix client depuis les métadonnées des modules', () => {
  const data = emptyStoreData();
  const needs = getCustomerNeeds(data);

  assert.deepEqual(
    needs.map(need => need.id),
    ['sell', 'stock', 'team', 'finance', 'attendance', 'online-store'],
  );
  assert.equal(needs.find(need => need.id === 'sell')?.moduleIds[0], 'commerce');
});

test('conserve un besoin métier déclaratif quand sa capacité n’est pas encore activée', () => {
  const data = emptyStoreData();
  const needs = getCustomerNeeds(data);
  const enabled = activeModuleIds(data);
  const finance = needs.find(need => need.id === 'finance');

  assert.ok(finance);
  assert.equal(isNeedAvailable(finance, enabled), false);
  assert.equal(isNeedAvailable(needs.find(need => need.id === 'stock')!, enabled), true);
});

test('une surcharge publiée peut adapter le texte client sans toucher au composant', () => {
  const data = emptyStoreData();
  data.moduleOverrides = {
    commerce: {
      customerNeed: {
        id: 'sell',
        label: 'Développer mes ventes',
        description: 'Une présentation adaptée à votre activité.',
        order: 1,
      },
    },
  };

  assert.equal(getCustomerNeeds(data)[0]?.label, 'Développer mes ventes');
});
