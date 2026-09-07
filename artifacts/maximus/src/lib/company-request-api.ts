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
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : 'La demande d’entreprise est indisponible.');
  }
  return body as T;
}

export const companyRequestApi = {
  create: (input: {
    name: string;
    manager: string;
    email: string;
    password: string;
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
  update: (companyId: string, input: Pick<Company, 'name' | 'manager' | 'email' | 'phone' | 'country' | 'sector'>) =>
    request<{ ok: true; company: Company }>(`/companies/${encodeURIComponent(companyId)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  remove: (companyId: string) =>
    request<{ ok: true }>(`/companies/${encodeURIComponent(companyId)}`, { method: 'DELETE' }),
};