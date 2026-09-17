import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's native TypeScript runner resolves the .ts test import.
import { canCreateControlTask, canReadControlScope, canUpdateControlTask, type ControlActorContext } from './control-authorization.ts';
// @ts-expect-error Node's native TypeScript runner resolves the .ts test import.
import { buildTaskCreatedTrace, buildTaskStatusTrace } from './control-trace.ts';

const companyAdmin: ControlActorContext = {
  role: 'company_admin',
  displayName: 'Administrateur KORA',
  companyId: 'kora',
  sectorIds: [],
};
const sectorManager: ControlActorContext = {
  role: 'sector_manager',
  displayName: 'Mamadou Ba',
  companyId: 'kora',
  employeeId: 'demo-emp-mamadou',
  sectorIds: ['finance', 'finance-team'],
};
const employee: ControlActorContext = {
  role: 'employee',
  displayName: 'Awa Ndiaye',
  companyId: 'kora',
  employeeId: 'demo-emp-awa',
  sectorIds: ['commerce'],
};

test('l’administrateur MAXIMUS traverse toutes les entreprises', () => {
  const actor: ControlActorContext = { role: 'maximus_admin', displayName: 'MAXIMUS', sectorIds: [] };
  assert.equal(canReadControlScope(actor, 'other-company'), true);
  assert.equal(canCreateControlTask(actor, { companyId: 'other-company', sectorId: 'other-sector' }), true);
});

test('l’administrateur d’entreprise reste dans son entreprise', () => {
  assert.equal(canReadControlScope(companyAdmin, 'kora'), true);
  assert.equal(canReadControlScope(companyAdmin, 'other-company'), false);
  assert.equal(canCreateControlTask(companyAdmin, { companyId: 'other-company' }), false);
});

test('le manager de secteur reste limité à ses secteurs descendants', () => {
  assert.equal(canReadControlScope(sectorManager, 'kora', { companyId: 'kora', sectorId: 'finance' }), true);
  assert.equal(canReadControlScope(sectorManager, 'kora', { companyId: 'kora', sectorId: 'rh' }), false);
  assert.equal(canCreateControlTask(sectorManager, { companyId: 'kora', sectorId: 'finance-team' }), true);
  assert.equal(canCreateControlTask(sectorManager, { companyId: 'kora', sectorId: 'rh' }), false);
});

test('l’employé ne lit et ne modifie que ses tâches', () => {
  const ownTask = { companyId: 'kora', sectorId: 'commerce', assigneeEmployeeId: 'demo-emp-awa' };
  const otherTask = { companyId: 'kora', sectorId: 'commerce', assigneeEmployeeId: 'demo-emp-ibrahima' };
  assert.equal(canReadControlScope(employee, 'kora', ownTask), true);
  assert.equal(canUpdateControlTask(employee, ownTask), true);
  assert.equal(canReadControlScope(employee, 'kora', otherTask), false);
  assert.equal(canUpdateControlTask(employee, otherTask), false);
  assert.equal(canCreateControlTask(employee, ownTask), false);
});

test('aucun acteur ne franchit la frontière d’entreprise', () => {
  assert.equal(canUpdateControlTask(sectorManager, { companyId: 'other-company', sectorId: 'finance' }), false);
  assert.equal(canUpdateControlTask(employee, { companyId: 'other-company', assigneeEmployeeId: 'demo-emp-awa' }), false);
});

test('la création et le changement de statut produisent une trace cohérente', () => {
  const now = new Date('2026-09-04T20:00:00.000Z');
  const created = buildTaskCreatedTrace(
    { title: 'Contrôler le stock', companyId: 'kora', moduleId: 'stocks' },
    'task-1',
    { displayName: 'Awa Ndiaye' },
    now,
  );
  const updated = buildTaskStatusTrace(
    { id: 'task-1', title: 'Contrôler le stock', companyId: 'kora', moduleId: 'stocks', status: 'À FAIRE' },
    'VALIDÉ',
    { displayName: 'Awa Ndiaye' },
    now,
  );

  assert.equal(created.event.entityId, created.audit.entityId);
  assert.equal(created.event.actorName, created.audit.actorName);
  assert.equal(updated.event.entityId, updated.audit.entityId);
  assert.equal(updated.event.type, 'APPROVAL_GRANTED');
  assert.equal(updated.audit.action, 'TÂCHE_VALIDÉ');
});