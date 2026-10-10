import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
} from './notification-sound.ts';

test('le son local est actif par défaut, sauf désactivation explicite', () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    },
  });

  assert.equal(isNotificationSoundEnabled(), true);
  setNotificationSoundEnabled(false);
  assert.equal(isNotificationSoundEnabled(), false);
  setNotificationSoundEnabled(true);
  assert.equal(isNotificationSoundEnabled(), true);

  delete (globalThis as { window?: Window }).window;
});
