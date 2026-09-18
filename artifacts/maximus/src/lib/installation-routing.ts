import type { InstallationProfile } from './installation-api';

export type InstallationEntry = 'central' | 'company' | 'shop' | 'unavailable';

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