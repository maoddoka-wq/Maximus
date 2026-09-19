import type { InstallationProfile } from './installation-api';

export type InstallationEntry = 'central' | 'company' | 'shop' | 'unavailable';
export type CompanyLoginReturnContext = {
  companyId: string;
  path: string;
};

const companyLoginPathPattern = /^\/entreprise\/[a-z0-9]+(?:-[a-z0-9]+)*\/connexion$/;

/** The server resolves the installation and host; never infer a shop from a hostname suffix. */
export function resolveInstallationEntry(profile: InstallationProfile | null): InstallationEntry {
  if (!profile || !profile.ready) return 'unavailable';
  if (!['central', 'dedicated', 'on_premise'].includes(profile.mode)) return 'unavailable';
  if (profile.entrypoint === 'unknown') return 'unavailable';
  if (profile.companyOnly) {
    if (profile.mode === 'central' || !profile.company?.id) return 'unavailable';
    if (profile.entrypoint === 'shop') return 'shop';
    return profile.entrypoint === 'company' ? 'company' : 'unavailable';
  }
  if (profile.mode !== 'central') return 'unavailable';
  return profile.entrypoint === 'central' || profile.entrypoint === 'shop'
    ? profile.entrypoint : 'unavailable';
}

export function installationLogoutPath(companyOnly: boolean, centralCompanyPath?: string | null): string {
  return companyOnly ? '/' : centralCompanyPath || '/';
}

/**
 * A branded return path is trusted only after that route's server-scoped login succeeds.
 * Pairing it with the authenticated company prevents stale or edited browser storage from
 * selecting another tenant's login page after a session restore.
 */
export function createCompanyLoginReturnContext(
  companyId: string | undefined,
  path: string,
): CompanyLoginReturnContext | null {
  if (!companyId || !companyLoginPathPattern.test(path)) return null;
  return { companyId, path };
}

export function companyLoginPathFromStoredContext(
  storedContext: string | null,
  authenticatedCompanyId: string | undefined,
): string | null {
  if (!storedContext || !authenticatedCompanyId) return null;
  try {
    const context = JSON.parse(storedContext) as Partial<CompanyLoginReturnContext>;
    if (
      context.companyId !== authenticatedCompanyId
      || typeof context.path !== 'string'
      || !companyLoginPathPattern.test(context.path)
    ) {
      return null;
    }
    return context.path;
  } catch {
    return null;
  }
}