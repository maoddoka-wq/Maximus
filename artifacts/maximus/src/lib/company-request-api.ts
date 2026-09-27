import { requestJson } from './api-request';
import type { Company, ModuleId } from './store';
import type { EcommerceStore } from './ecommerce-api';

export type CompanyRequest = {
  id: string;
  requestId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  company: Company;
  createdAt: string | null;
  rejectionReason: string | null;
};

export type PublicSiteDomain = {
  id: string;
  companyId: string;
  domain: string;
  targetHost: string;
  verificationName: string;
  verificationValue: string;
  status: 'PENDING' | 'ACTIVE';
  lastError: string;
  verifiedAt: string | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return requestJson<T>(path, init, { fallbackMessage: 'La demande d’entreprise est indisponible.' });
}

export const companyRequestApi = {
  createAdministrative: (input: {
    name: string;
    manager: string;
    email: string;
    password: string;
    phone?: string;
    country?: string;
    sector?: string;
    requestedModules: ModuleId[];
    requestedModulePackIds?: Partial<Record<ModuleId, string[]>>;
    requestedModuleFeatures?: Partial<Record<ModuleId, string[]>>;
    requestedModulePermissions?: Partial<Record<ModuleId, Partial<Record<string, string[]>>>>;
  }) =>
    request<{ ok: true; company: Company }>(
      '/companies',
      { method: 'POST', body: JSON.stringify(input) },
    ),
  create: (input: {
    name: string;
    manager: string;
    email: string;
    password: string;
    phone?: string;
    country?: string;
    sector?: string;
    requestedModules: ModuleId[];
    requestedModulePackIds?: Partial<Record<ModuleId, string[]>>;
    requestedModuleFeatures?: Partial<Record<ModuleId, string[]>>;
    requestedModulePermissions?: Partial<Record<ModuleId, Partial<Record<string, string[]>>>>;
  }) =>
    request<{ ok: true; requestId: string; status: 'PENDING' }>('/company-requests', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  list: () => request<{ requests: CompanyRequest[] }>('/company-requests'),
  approve: (companyId: string) =>
    request<{ ok: true; company: Company; request: CompanyRequest }>(
      `/company-requests/${encodeURIComponent(companyId)}/approve`,
      { method: 'POST' },
    ),
  reject: (companyId: string, reason?: string) =>
    request<{ ok: true; company: Company }>(
      `/company-requests/${encodeURIComponent(companyId)}/reject`,
      { method: 'POST', body: JSON.stringify({ reason: reason ?? '' }) },
    ),
  update: (companyId: string, input: Pick<Company, 'name' | 'manager' | 'email' | 'phone' | 'country' | 'sector'> & Partial<Pick<Company, 'primaryColor' | 'accentColor' | 'sidebarColor'>>) =>
    request<{ ok: true; company: Company }>(`/companies/${encodeURIComponent(companyId)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  updateDeletionLock: (companyId: string, locked: boolean) =>
    request<{ ok: true; company: Company }>(`/companies/${encodeURIComponent(companyId)}/deletion-lock`, {
      method: 'PATCH',
      body: JSON.stringify({ locked }),
    }),
  loginSettings: (companyId: string) =>
    request<{ settings: { companyId: string; customAllowed: boolean; mode: 'MAXIMUS' | 'CUSTOM'; slug: string; url: string } }>(
      `/companies/${encodeURIComponent(companyId)}/login-settings`,
    ),
  updateLoginSettings: (
    companyId: string,
    input: { customAllowed?: boolean; mode?: 'MAXIMUS' | 'CUSTOM' },
  ) =>
    request<{
      ok: true;
      company: Company;
      settings: { companyId: string; customAllowed: boolean; mode: 'MAXIMUS' | 'CUSTOM'; slug: string; url: string };
    }>(`/companies/${encodeURIComponent(companyId)}/login-settings`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  publicSiteSettings: (companyId: string) =>
    request<{ store: EcommerceStore }>(
      `/company-public-site?companyId=${encodeURIComponent(companyId)}`,
    ),
  updatePublicSiteSettings: (
    companyId: string,
    input: { name: string; slug: string; status: EcommerceStore['status'] },
  ) =>
    request<{ store: EcommerceStore }>(
      `/company-public-site?companyId=${encodeURIComponent(companyId)}`,
      { method: 'PATCH', body: JSON.stringify(input) },
    ),
  uploadPublicSiteLogo: (companyId: string, image: File) => {
    const body = new FormData();
    body.append('image', image);
    return request<{ store: EcommerceStore }>(
      `/company-public-site/logo?companyId=${encodeURIComponent(companyId)}`,
      { method: 'POST', body },
    );
  },
  publicSiteDomains: (companyId: string) =>
    request<{ domains: PublicSiteDomain[] }>(
      `/company-public-site/domains?companyId=${encodeURIComponent(companyId)}`,
    ),
  createPublicSiteDomain: (companyId: string, domain: string) =>
    request<PublicSiteDomain>(
      `/company-public-site/domains?companyId=${encodeURIComponent(companyId)}`,
      { method: 'POST', body: JSON.stringify({ domain }) },
    ),
  verifyPublicSiteDomain: (companyId: string, domainId: string) =>
    request<PublicSiteDomain>(
      `/company-public-site/domains/${encodeURIComponent(domainId)}/verify?companyId=${encodeURIComponent(companyId)}`,
      { method: 'POST' },
    ),
  deletePublicSiteDomain: (companyId: string, domainId: string) =>
    request<{ ok: true }>(
      `/company-public-site/domains/${encodeURIComponent(domainId)}?companyId=${encodeURIComponent(companyId)}`,
      { method: 'DELETE' },
    ),
  publicSiteAccess: (companyId: string) =>
    request<{ companyId: string; enabled: boolean }>(
      `/companies/${encodeURIComponent(companyId)}/public-site-access`,
    ),
  updatePublicSiteAccess: (companyId: string, enabled: boolean) =>
    request<{ ok: true; companyId: string; enabled: boolean }>(
      `/companies/${encodeURIComponent(companyId)}/public-site-access`,
      { method: 'PATCH', body: JSON.stringify({ enabled }) },
    ),
  installationManifest: (companyId: string) =>
    request<{
      manifestVersion: 1;
      source: 'maximus-central';
       applicationVersion: string;
       syncProtocolVersion: number;
      exportedAt: string;
      company: {
        id: string;
        name: string;
        manager: string;
        email: string;
        phone: string;
        country: string;
        sector: string;
        loginSlug: string;
      };
      modules: {
        ids: ModuleId[];
        packIds: Partial<Record<ModuleId, string[]>>;
        featureIds: Partial<Record<ModuleId, string[]>>;
        permissions: Partial<Record<ModuleId, Partial<Record<string, string[]>>>>;
      };
    }>(`/companies/${encodeURIComponent(companyId)}/installation-manifest`),
  issueInstallation: (companyId: string, input: { mode: 'dedicated' | 'on_premise'; endpointUrl?: string; createNew?: boolean; installationId?: string }) =>
    request<{
      ok: true;
      installation: {
        id: string;
        companyId: string;
        mode: 'dedicated' | 'on_premise';
        status: string;
        configurationVersion: number;
        lastSeenAt: string | null;
        lastSyncAt: string | null;
        revokedAt: string | null;
      };
      bootstrap: {
        centralUrl: string;
        installationId: string;
        companyId: string;
        mode: 'dedicated' | 'on_premise';
        applicationVersion: string;
        syncProtocolVersion: number;
        token: string;
      };
    }>(`/companies/${encodeURIComponent(companyId)}/installation`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  revokeInstallation: (companyId: string) =>
    request<{ ok: true }>(`/companies/${encodeURIComponent(companyId)}/installation`, {
      method: 'DELETE',
    }),
  uploadProfilePhoto: (companyId: string, photo: File) => {
    const body = new FormData();
    body.append('photo', photo);
    return request<{ ok: true; company: Company }>(`/companies/${encodeURIComponent(companyId)}/profile-photo`, {
      method: 'POST',
      headers: {},
      body,
    });
  },
  deleteProfilePhoto: (companyId: string) =>
    request<{ ok: true; company: Company }>(`/companies/${encodeURIComponent(companyId)}/profile-photo`, {
      method: 'DELETE',
    }),
  remove: (companyId: string) =>
    request<{ ok: true }>(`/companies/${encodeURIComponent(companyId)}`, { method: 'DELETE' }),
};