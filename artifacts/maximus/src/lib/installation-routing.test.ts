import assert from 'node:assert/strict';
import test from 'node:test';
import type { InstallationProfile } from './installation-api';
import { installationLogoutPath, resolveInstallationEntry } from './installation-routing';

const central: InstallationProfile = {
  mode: 'central', companyOnly: false, ready: true, adminLoginEnabled: true,
  registrationEnabled: true, entrypoint: 'central', canonicalUrl: null,
  installationId: null, loginUrl: '/', company: null,
};
const company = { id: 'a', name: 'Entreprise A', slug: 'entreprise-a', primaryColor: '#123456', accentColor: '#123456', sidebarColor: '#123456' };

test('central routing is explicitly resolved by the server', () => {
  assert.equal(resolveInstallationEntry(central), 'central');
  assert.equal(resolveInstallationEntry({ ...central, entrypoint: 'shop' }), 'shop');
  assert.equal(resolveInstallationEntry({ ...central, entrypoint: 'unknown' }), 'unavailable');
});

for (const mode of ['dedicated', 'on_premise']) {
  test(`${mode} root is the company login; stores remain explicit`, () => {
    const profile = { ...central, mode, companyOnly: true, company, entrypoint: 'company' as const };
    assert.equal(resolveInstallationEntry(profile), 'company');
    assert.equal(resolveInstallationEntry({ ...profile, entrypoint: 'shop' }), 'shop');
    assert.equal(resolveInstallationEntry({ ...profile, company: null }), 'unavailable');
    assert.equal(resolveInstallationEntry({ ...profile, entrypoint: 'central' }), 'unavailable');
    assert.equal(resolveInstallationEntry({ ...profile, ready: false }), 'unavailable');
  });
}

test('failed, malformed, and unknown configurations never fall back to central', () => {
  assert.equal(resolveInstallationEntry(null), 'unavailable');
  assert.equal(resolveInstallationEntry({ ...central, mode: 'invalid' }), 'unavailable');
  assert.equal(resolveInstallationEntry({ ...central, mode: 'dedicated' }), 'unavailable');
  assert.equal(resolveInstallationEntry({ ...central, companyOnly: true, company }), 'unavailable');
  assert.equal(resolveInstallationEntry({ ...central, entrypoint: undefined } as unknown as InstallationProfile), 'unavailable');
});

test('isolated logout stays local regardless of the historical central slug', () => {
  assert.equal(installationLogoutPath(true, '/entreprise/ancienne/connexion'), '/');
  assert.equal(installationLogoutPath(false, '/entreprise/a/connexion'), '/entreprise/a/connexion');
  assert.equal(installationLogoutPath(false), '/');
});