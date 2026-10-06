import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowCompanyPushPrompt } from './company-push-prompt.ts';

const eligiblePrompt = {
  supportError: null,
  accessAllowed: true,
  subscribed: false,
  dismissed: false,
  permission: 'default' as const,
};

test('demande le consentement uniquement si l’entreprise autorise les notifications', () => {
  assert.equal(shouldShowCompanyPushPrompt(eligiblePrompt), true);
  assert.equal(shouldShowCompanyPushPrompt({ ...eligiblePrompt, accessAllowed: false }), false);
  assert.equal(shouldShowCompanyPushPrompt({ ...eligiblePrompt, accessAllowed: null }), false);
});

test('masque la demande si elle ne peut pas aboutir ou a déjà été traitée', () => {
  assert.equal(shouldShowCompanyPushPrompt({ ...eligiblePrompt, supportError: 'unsupported' }), false);
  assert.equal(shouldShowCompanyPushPrompt({ ...eligiblePrompt, subscribed: true }), false);
  assert.equal(shouldShowCompanyPushPrompt({ ...eligiblePrompt, dismissed: true }), false);
  assert.equal(shouldShowCompanyPushPrompt({ ...eligiblePrompt, permission: 'unsupported' }), false);
});
