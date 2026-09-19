import assert from 'node:assert/strict';
import test from 'node:test';
import type { InstallationAccessResponse } from './installation-access-api';
import { getInstallationAccessPresentation } from './installation-access-presentation';

const installation = (overrides: Partial<InstallationAccessResponse['installations'][number]> = {}) => ({
  id: 'installation-1',
  mode: 'dedicated' as const,
  status: 'READY',
  endpointUrl: null,
  lastSeenAt: null,
  lastSyncAt: null,
  configurationVersion: 1,
  revokedAt: null,
  addresses: [],
  ...overrides,
});

test('presents central access when no installation exists', () => {
  assert.deepEqual(getInstallationAccessPresentation({
    installations: [],
    centralLoginUrl: 'https://central.example.com/',
    primaryInstallationId: null,
  }), { state: 'central', installationId: null, mode: null, endpointUrl: null });
});

test('keeps central access when an installation is only prepared', () => {
  assert.equal(getInstallationAccessPresentation({
    installations: [installation()],
    centralLoginUrl: 'https://central.example.com/',
    primaryInstallationId: null,
  }).state, 'prepared');
});

for (const mode of ['dedicated', 'on_premise'] as const) {
  test(`promotes the validated ${mode} endpoint when it is primary`, () => {
    const result = getInstallationAccessPresentation({
      installations: [installation({
        mode,
        addresses: [{
          id: 'address-1',
          installationId: 'installation-1',
          url: mode === 'dedicated' ? 'https://erp.example.com' : 'http://erp.lan',
          hostname: mode === 'dedicated' ? 'erp.example.com' : 'erp.lan',
          status: 'ACTIVE',
          isPrimary: true,
          validationMethod: mode === 'dedicated' ? 'public' : 'local',
          verificationName: null,
          verificationValue: null,
          lastError: null,
          verifiedAt: null,
        }],
      })],
      centralLoginUrl: 'https://central.example.com/',
      primaryInstallationId: 'installation-1',
    });
    assert.equal(result.state, 'primary');
    assert.equal(result.mode, mode);
    assert.ok(result.endpointUrl);
  });
}

test('never falls back to a central or stale link for an unavailable primary', () => {
  for (const candidate of [
    installation({ status: 'REVOKED', revokedAt: '2025-01-01T00:00:00Z' }),
    installation({ status: 'READY', endpointUrl: 'https://stale.example.com' }),
    installation({
      addresses: [{
        id: 'address-1',
        installationId: 'installation-1',
        url: 'javascript:alert(1)',
        hostname: 'invalid',
        status: 'ACTIVE',
        isPrimary: true,
        validationMethod: 'public',
        verificationName: null,
        verificationValue: null,
        lastError: null,
        verifiedAt: null,
      }],
    }),
  ]) {
    assert.deepEqual(getInstallationAccessPresentation({
      installations: [candidate],
      centralLoginUrl: 'https://central.example.com/',
      primaryInstallationId: 'installation-1',
    }), {
      state: 'unavailable',
      installationId: 'installation-1',
      mode: 'dedicated',
      endpointUrl: null,
    });
  }
});