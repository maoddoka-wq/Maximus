/** @jsxRuntime automatic */
/** @jsxImportSource react */
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { NotificationSettings } from './notification-settings';

test('garde les réglages masqués avant confirmation de l’autorisation entreprise', () => {
  assert.equal(renderToStaticMarkup(<NotificationSettings />), '');
});
