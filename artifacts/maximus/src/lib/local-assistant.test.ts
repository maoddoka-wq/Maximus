import assert from 'node:assert/strict';
import test from 'node:test';
import { answerAssistantQuestion, buildAssistantScope } from './local-assistant';
import { emptyStoreData } from './store';

test('limite le contexte assistant aux données de l’entreprise et aux modules autorisés', () => {
  const data = emptyStoreData();
  data.companies.push(
    {
      id: 'company-a',
      name: 'Entreprise A',
      manager: 'Admin A',
      email: 'a@test.local',
      phone: '',
      country: 'Sénégal',
      sector: 'Commerce',
      status: 'ACTIF',
      requestedModules: ['stocks'],
      allowedModules: ['stocks'],
      refusedModules: [],
      createdAt: '2026-09-09',
    },
    {
      id: 'company-b',
      name: 'Entreprise B',
      manager: 'Admin B',
      email: 'b@test.local',
      phone: '',
      country: 'Sénégal',
      sector: 'Services',
      status: 'ACTIF',
      requestedModules: ['stocks'],
      allowedModules: ['stocks'],
      refusedModules: [],
      createdAt: '2026-09-09',
    },
  );
  data.products.push(
    { id: 'a-low', sku: 'A-1', name: 'Article A', category: 'A', stock: 1, threshold: 5, price: 1000, companyId: 'company-a' },
    { id: 'b-low', sku: 'B-1', name: 'Article B', category: 'B', stock: 0, threshold: 4, price: 1000, companyId: 'company-b' },
  );

  const scope = buildAssistantScope({
    data,
    companyId: 'company-a',
    userLabel: 'Admin A',
    visibleEmployees: [],
    allowedModules: ['stocks'],
    isCompanyAdmin: true,
    isSectorManager: false,
  });
  const answer = answerAssistantQuestion(scope, 'Quels articles sont sous le seuil ?');

  assert.deepEqual(scope.products.map(product => product.id), ['a-low']);
  assert.match(answer.answer, /Article A/);
  assert.doesNotMatch(answer.answer, /Article B/);
});

test('ne révèle pas les stocks lorsque le module n’est pas autorisé', () => {
  const data = emptyStoreData();
  data.companies.push({
    id: 'company-a',
    name: 'Entreprise A',
    manager: 'Admin A',
    email: 'a@test.local',
    phone: '',
    country: 'Sénégal',
    sector: 'Services',
    status: 'ACTIF',
    requestedModules: [],
    allowedModules: [],
    refusedModules: [],
    createdAt: '2026-09-09',
  });
  data.products.push({
    id: 'a-low',
    sku: 'A-1',
    name: 'Article privé',
    category: 'A',
    stock: 1,
    threshold: 5,
    price: 1000,
    companyId: 'company-a',
  });

  const scope = buildAssistantScope({
    data,
    companyId: 'company-a',
    userLabel: 'Admin A',
    visibleEmployees: [],
    allowedModules: [],
    isCompanyAdmin: true,
    isSectorManager: false,
  });
  const answer = answerAssistantQuestion(scope, 'Quels articles sont sous le seuil ?');

  assert.deepEqual(scope.products, []);
  assert.match(answer.answer, /modules opérationnels|stocks/);
  assert.doesNotMatch(answer.answer, /Article privé/);
});