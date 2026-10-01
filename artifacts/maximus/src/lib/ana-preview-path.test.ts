import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAnaPreviewHref,
  buildWorkspaceHomeHref,
  isAnaPreviewPath,
  stripViteBasePath,
} from './ana-preview-path';

test('recognizes the local preview route at root and under the artifact base path', () => {
  assert.equal(isAnaPreviewPath('/__preview/ana', '/'), true);
  assert.equal(isAnaPreviewPath('/maximus/__preview/ana/', '/maximus/'), true);
  assert.equal(isAnaPreviewPath('/maximus/__preview/ana?profile=stock-manager', '/maximus/'), true);
});

test('does not confuse similarly named or unrelated routes with the preview route', () => {
  assert.equal(isAnaPreviewPath('/maximus/entreprise/ana', '/maximus/'), false);
  assert.equal(isAnaPreviewPath('/maximus/__preview/ana-extra', '/maximus/'), false);
  assert.equal(isAnaPreviewPath('/other/__preview/ana', '/maximus/'), false);
});

test('builds links that stay inside the artifact base path', () => {
  assert.equal(buildAnaPreviewHref('/'), '/__preview/ana');
  assert.equal(buildAnaPreviewHref('/maximus/'), '/maximus/__preview/ana');
  assert.equal(buildWorkspaceHomeHref('/maximus/'), '/maximus/');
  assert.equal(stripViteBasePath('/maximus/', '/maximus/'), '/');
});