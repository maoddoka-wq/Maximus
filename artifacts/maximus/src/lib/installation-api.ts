import { requestJson } from './api-request';

export type InstallationProfile = {
  mode: 'central' | 'dedicated' | 'on_premise' | string;
  companyOnly: boolean;
  ready: boolean;
  adminLoginEnabled: boolean;
  registrationEnabled: boolean;
  entrypoint: 'central' | 'company' | 'shop' | 'unknown';
  canonicalUrl: string | null;
  loginUrl: string | null;
  installationId: string | null;
  sync?: {
    state: string;
    lastAttemptAt: string | null;
    lastSuccessAt: string | null;
    lastError: string | null;
    versionWarning?: string | null;
  };
  company: {
    id: string;
    name: string;
    slug?: string | null;
    profilePhoto?: string | null;
    primaryColor: string;
    accentColor: string;
    sidebarColor: string;
  } | null;
};

export const installationApi = {
  profile: () =>
    requestJson<InstallationProfile>('/installation', undefined, {
      fallbackMessage: 'La configuration de cette installation est indisponible.',
      cacheTtlMs: 0,
    }),
};