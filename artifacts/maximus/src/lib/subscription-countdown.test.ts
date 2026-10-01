import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getSubscriptionCountdown,
  shouldShowSubscriptionExpiryWarning,
  SUBSCRIPTION_WARNING_WINDOW_SECONDS,
} from './subscription-countdown';

test('affiche le temps restant jusqu’à la fin de la période', () => {
  const countdown = getSubscriptionCountdown('2026-10-02T01:01:01.000Z', Date.parse('2026-10-01T00:00:00.000Z'));

  assert.equal(countdown.remainingSeconds, 90_061);
  assert.equal(countdown.expired, false);
  assert.equal(countdown.label, '1 j 01 h 01 min 01 s');
});

test('signale une échéance atteinte ou absente', () => {
  assert.equal(getSubscriptionCountdown('2026-10-01T00:00:00.000Z', Date.parse('2026-10-01T00:00:00.000Z')).label, 'Expiré');
  assert.equal(getSubscriptionCountdown(null).label, 'Aucune échéance active');
});

test('affiche le rappel dans les 48 heures avant l’échéance, mais pas avant ou après', () => {
  const now = Date.parse('2026-10-01T00:00:00.000Z');
  const justOutsideWindow = new Date(now + (SUBSCRIPTION_WARNING_WINDOW_SECONDS + 1) * 1000).toISOString();
  const atWindowStart = new Date(now + SUBSCRIPTION_WARNING_WINDOW_SECONDS * 1000).toISOString();
  const expired = new Date(now - 1000).toISOString();

  assert.equal(shouldShowSubscriptionExpiryWarning(justOutsideWindow, now), false);
  assert.equal(shouldShowSubscriptionExpiryWarning(atWindowStart, now), true);
  assert.equal(shouldShowSubscriptionExpiryWarning(expired, now), false);
});