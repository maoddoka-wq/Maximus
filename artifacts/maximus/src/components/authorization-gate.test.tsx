/** @jsxRuntime automatic */
/** @jsxImportSource react */
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthorizationGate } from './authorization-gate';
import { gateReducer, initialGateState, shouldBlockGateEvent } from '@/lib/authorization-gate';

const noop = () => undefined;
const gate = (over: Partial<Parameters<typeof AuthorizationGate>[0]['gate']> = {}) => ({
  locked: true, confirming: false, pending: false, requestUnlock: noop, confirmUnlock: noop, cancelUnlock: noop, relock: noop, ...over,
});
const render = (g = gate()) => renderToStaticMarkup(
  <AuthorizationGate gate={g}><input type="checkbox" data-testid="inner" /></AuthorizationGate>,
);

test('gate is locked by default with disabled fieldset and Déverrouiller action', () => {
  assert.deepEqual(initialGateState, { locked: true, confirming: false });
  const html = render();
  assert.match(html, /data-locked="true"/);
  assert.match(html, /<fieldset[^>]*\sdisabled=""/);
  assert.match(html, /authorization-gate-unlock/);
  assert.match(html, /Déverrouiller/);
});

test('unlock requires explicit confirmation and cancel keeps it locked', () => {
  const requested = gateReducer(initialGateState, 'request');
  assert.deepEqual(requested, { locked: true, confirming: true });
  assert.match(render(gate({ confirming: true })), /authorization-gate-confirm-unlock/);
  assert.deepEqual(gateReducer(requested, 'cancel'), initialGateState);
  assert.deepEqual(gateReducer(initialGateState, 'confirm'), initialGateState);
  assert.equal(gateReducer(requested, 'confirm').locked, false);
});

test('unlocked gate enables controls and can relock', () => {
  const html = render(gate({ locked: false }));
  assert.doesNotMatch(html, /<fieldset[^>]*\sdisabled=""/);
  assert.match(html, /authorization-gate-relock/);
  assert.deepEqual(gateReducer({ locked: false, confirming: false }, 'relock'), initialGateState);
});

test('locked gate blocks click and keyboard events', () => {
  assert.equal(shouldBlockGateEvent(true), true);
  assert.equal(shouldBlockGateEvent(false), false);
});
