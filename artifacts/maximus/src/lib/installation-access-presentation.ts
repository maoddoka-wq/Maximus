import type { Installation, InstallationAccessResponse } from './installation-access-api';

export type InstallationAccessPresentation =
  | { state: 'central'; installationId: null; mode: null; endpointUrl: null }
  | { state: 'prepared'; installationId: null; mode: null; endpointUrl: null }
  | { state: 'primary'; installationId: string; mode: Installation['mode']; endpointUrl: string }
  | { state: 'unavailable'; installationId: string; mode: Installation['mode'] | null; endpointUrl: null };

function isSafeErpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() !== value || value === '') return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:')
      && url.username === ''
      && url.password === '';
  } catch {
    return false;
  }
}

function isAvailable(installation: Installation): boolean {
  return !installation.revokedAt
    && installation.status !== 'REVOKED'
    && (installation.status === 'READY' || installation.status === 'CONNECTED');
}

export function getInstallationAccessPresentation(
  access: InstallationAccessResponse,
): InstallationAccessPresentation {
  if (!access.primaryInstallationId) {
    return access.installations.some(isAvailable)
      ? { state: 'prepared', installationId: null, mode: null, endpointUrl: null }
      : { state: 'central', installationId: null, mode: null, endpointUrl: null };
  }

  const installation = access.installations.find(item => item.id === access.primaryInstallationId);
  if (!installation || !isAvailable(installation)) {
    return {
      state: 'unavailable',
      installationId: access.primaryInstallationId,
      mode: installation?.mode ?? null,
      endpointUrl: null,
    };
  }

  const address = installation.addresses.find(item =>
    item.isPrimary && item.status === 'ACTIVE' && isSafeErpUrl(item.url),
  );
  if (!address) {
    return {
      state: 'unavailable',
      installationId: installation.id,
      mode: installation.mode,
      endpointUrl: null,
    };
  }

  return {
    state: 'primary',
    installationId: installation.id,
    mode: installation.mode,
    endpointUrl: address.url,
  };
}