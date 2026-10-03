import assert from 'node:assert/strict';
import test from 'node:test';
import { runGuardedAuthorization } from './authorization-gate';

function harness(over: Partial<Parameters<typeof runGuardedAuthorization>[0]> = {}) {
  const state = { busy: false, key: 'a', successes: 0, actions: 0 };
  const input = {
    isLocked: () => false,
    isBusy: () => state.busy,
    setBusy: (busy: boolean) => { state.busy = busy; },
    currentKey: () => state.key,
    key: 'a',
    confirm: async () => true,
    action: async () => { state.actions += 1; },
    onSuccess: () => { state.successes += 1; },
    ...over,
  };
  return { state, input };
}

test('locked gate never runs the action', async () => {
  const { state, input } = harness({ isLocked: () => true });
  assert.equal(await runGuardedAuthorization(input), false);
  assert.equal(state.actions, 0);
});

test('declined confirmation does nothing and keeps gate open', async () => {
  const { state, input } = harness({ confirm: async () => false });
  assert.equal(await runGuardedAuthorization(input), false);
  assert.equal(state.actions + state.successes, 0);
});

test('concurrent confirmations run the action once', async () => {
  const { state, input } = harness();
  const [first, second] = await Promise.all([runGuardedAuthorization(input), runGuardedAuthorization(input)]);
  assert.deepEqual([first, second], [true, false]);
  assert.equal(state.actions, 1);
  assert.equal(state.busy, false);
});

test('context change while confirming discards the old action', async () => {
  const { state, input } = harness();
  input.confirm = async () => { state.key = 'b'; return true; };
  assert.equal(await runGuardedAuthorization(input), false);
  assert.equal(state.actions, 0);
});

test('failed action does not relock and reports the error', async () => {
  const errors: unknown[] = [];
  const { state, input } = harness({ action: async () => { throw new Error('x'); }, onError: error => errors.push(error) });
  assert.equal(await runGuardedAuthorization(input), false);
  assert.equal(state.successes, 0);
  assert.equal(errors.length, 1);
  const falseResult = harness({ action: async () => false });
  assert.equal(await runGuardedAuthorization(falseResult.input), false);
  assert.equal(falseResult.state.successes, 0);
});

test('successful action relocks once', async () => {
  const { state, input } = harness();
  assert.equal(await runGuardedAuthorization(input), true);
  assert.equal(state.successes, 1);
});
