import assert from 'node:assert/strict';
import test from 'node:test';
import { canExecute, currentStep, isConflict, isPlanReadonly, isTimeout } from './maxi-plans-flow.ts';
import type { MaxiPlan } from './maxi-plans-api';

const plan = (over: Partial<MaxiPlan> = {}): MaxiPlan => ({
  id: 'p1', goal: 'g', title: 't', summary: 's', status: 'AWAITING_CONFIRMATION', currentStep: 1, updatedAt: '', error: null,
  steps: [
    { index: 0, title: 'a', action: { type: 'create_module' } as never, status: 'EXECUTED' },
    { index: 1, title: 'b', action: { type: 'create_pack' } as never, status: 'PENDING_CONFIRMATION' },
  ], ...over,
});

test('current step and execute guard', () => {
  assert.equal(currentStep(plan())?.index, 1);
  assert.equal(canExecute(plan(), { planId: 'p1', step: 1, token: 'x' }), true);
  assert.equal(canExecute(plan(), { planId: 'p1', step: 0, token: 'x' }), false);
  assert.equal(canExecute(plan(), { planId: 'p2', step: 1, token: 'x' }), false);
  assert.equal(canExecute(plan(), null), false);
});

test('readonly plans', () => {
  assert.equal(isPlanReadonly(plan({ status: 'COMPLETED' })), true);
  assert.equal(canExecute(plan({ status: 'CANCELLED' }), { planId: 'p1', step: 1, token: 'x' }), false);
});

test('error classifiers', () => {
  assert.equal(isConflict({ status: 409 }), true);
  assert.equal(isTimeout({ kind: 'timeout' }), true);
  assert.equal(isConflict(new Error('x')), false);
});
