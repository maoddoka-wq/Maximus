import assert from 'node:assert/strict';
import test from 'node:test';
import {
  answerAdminAssistantQuestion,
  answerAssistantQuestion,
  buildAdminAssistantScope,
  buildAssistantScope,
} from './local-assistant';
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

test('réserve le contexte global de l’assistant à l’administration principale', () => {
  const data = emptyStoreData();
  data.companies.push({
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
    requestedModulePackIds: { stocks: ['stock-gestion'] },
    requestedModuleFeatures: { stocks: ['dashboard', 'products'] },
    createdAt: '2026-09-09',
  });
  data.roles.push({
    id: 'role-a',
    name: 'Gestionnaire',
    description: 'Gestion du stock',
    modulePermissions: { stocks: ['voir'] },
    companyId: 'company-a',
  });

  const scope = buildAdminAssistantScope(data, 'Administration principale');
  const answer = answerAdminAssistantQuestion(scope, 'Comment créer un pack avec des permissions sûres ?');

  assert.equal(scope.companies.length, 1);
  assert.ok(scope.modules.some(module => module.id === 'paie'));
  assert.match(answer.answer, /module.*fonctionnalités.*pack.*permissions/i);
  assert.doesNotMatch(answer.answer, /Article privé|données de l’entreprise A/i);
});

test('explique le parcours organisationnel complet depuis l’assistant administratif', () => {
  const data = emptyStoreData();
  data.orgNodes.push({
    id: 'unit-a',
    companyId: 'company-a',
    name: 'Direction',
    parentId: null,
    moduleIds: ['stocks'],
  });
  data.employees.push({
    id: 'employee-a',
    firstName: 'Awa',
    lastName: 'Admin',
    email: 'awa@test.local',
    phone: '',
    position: 'Manager',
    department: 'Direction',
    subDepartment: '',
    role: 'Manager',
    status: 'ACTIF',
    companyId: 'company-a',
    sectorId: 'unit-a',
  });

  const answer = answerAdminAssistantQuestion(
    buildAdminAssistantScope(data, 'Administration principale'),
    'Comment organiser une entreprise et ses rôles ?',
  );

  assert.match(answer.answer, /entreprise.*unités.*rôles.*employés.*managers/i);
  assert.match(answer.answer, /session serveur/i);
});