import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCompanyBlueprint, companyFromBlueprint, validateCompanyBlueprint } from './ai-company-blueprint';
import { modules, seedData } from './store';

test('le moteur local compose un brouillon depuis le catalogue MAXIMUS', () => {
  const data = seedData();
  const blueprint = buildCompanyBlueprint(data, {
    companyName: 'Teranga Distribution',
    managerName: 'Aminata Fall',
    adminEmail: 'admin@teranga.example',
    country: 'Sénégal',
    sector: 'Distribution',
    prompt: 'Une entreprise de distribution avec un entrepôt, du commerce et des sorties de stock.',
  });

  assert.equal(blueprint.source, 'local-rule-engine');
  assert.ok(blueprint.units.length >= 1);
  assert.ok(blueprint.units.some(unit => unit.moduleIds.includes('stocks')));
  assert.ok(blueprint.units.every(unit => unit.moduleIds.every(moduleId => modules.some(module => module.id === moduleId))));
  assert.deepEqual(validateCompanyBlueprint(data, blueprint).errors, []);
});

test('les dépendances de fonctionnalités sont conservées dans le brouillon', () => {
  const data = seedData();
  const blueprint = buildCompanyBlueprint(data, {
    companyName: 'Keur Services',
    managerName: 'Moussa Ba',
    adminEmail: 'admin@keur.example',
    country: 'Sénégal',
    sector: 'Services',
    prompt: 'Une société de services avec présences, pointage et absences.',
  });
  const presenceUnit = blueprint.units.find(unit => unit.moduleIds.includes('presences'));
  assert.ok(presenceUnit);
  const presenceFeatures = presenceUnit?.moduleFeatures.presences ?? [];
  assert.ok(presenceFeatures.length > 0);
  assert.ok(presenceUnit?.roles[0]?.modulePermissions['presences']);
});

test('un module absent du catalogue est refusé avant application', () => {
  const data = seedData();
  const blueprint = buildCompanyBlueprint(data, {
    companyName: 'Test',
    managerName: 'Test',
    adminEmail: 'test@example.com',
    country: 'Sénégal',
    sector: 'Services',
    prompt: 'Une activité avec un module imaginaire.',
  });
  blueprint.units[0].moduleIds = ['module-inconnu' as never];
  const validation = validateCompanyBlueprint(data, blueprint);
  assert.ok(validation.errors.some(error => error.includes('n’existe plus')));
});

test('l’entreprise produite conserve le périmètre et les couleurs du brouillon', () => {
  const data = seedData();
  const blueprint = buildCompanyBlueprint(data, {
    companyName: 'Atelier Baobab',
    managerName: 'Ndeye Sarr',
    adminEmail: 'admin@baobab.example',
    country: 'Sénégal',
    sector: 'Services',
    prompt: 'Une équipe de services avec rapports.',
  });
  const company = companyFromBlueprint(blueprint, 'company-test', '2026-09-05');
  assert.equal(company.status, 'ACTIF');
  assert.equal(company.primaryColor, '#123B5D');
  assert.equal(company.accentColor, '#D6A94A');
  assert.deepEqual(company.allowedModules, company.requestedModules);
  assert.ok(company.refusedModules.every(moduleId => !company.allowedModules.includes(moduleId)));
});