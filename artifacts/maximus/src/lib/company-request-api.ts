import { requestJson } from './api-request';
import type { Company, ModuleId } from './store';

export type CompanyRequest = {
  id: string;
  requestId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  company: Company;
  createdAt: string | null;
  rejectionReason: string | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return requestJson<T>(path, init, { fallbackMessage: 'La demande d’entreprise est indisponible.' });
}

export const companyRequestApi = {
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