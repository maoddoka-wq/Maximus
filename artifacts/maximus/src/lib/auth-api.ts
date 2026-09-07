export type AuthUser = {
  role: 'maximus_admin' | 'company_admin' | 'sector_manager' | 'employee';
  displayName: string;
  companyId?: string;
  employeeId?: string;
  sectorIds: string[];
  permissions?: Record<string, string[]>;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, { ...options, credentials: 'include' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.error === 'string' ? body.error : 'La connexion MAXIMUS a échoué.');
  }
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
}

export const authApi = {
  login: (email: string, password: string) => request<{ user: AuthUser }>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }),
  session: () => request<{ user: AuthUser | null }>('/auth/session'),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  provisionAccount: (input: {
    id: string;
    email: string;
    displayName: string;
    companyId: string;
    employeeId: string;
    sectorIds: string[];
    role: 'sector_manager' | 'employee';
    permissions?: Record<string, string[]>;
    password?: string;
  }) => request<{ ok: true }>('/auth/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }),
  provisionCompanyAdmin: (input: {
    id: string;
    email: string;
    displayName: string;
    companyId: string;
    password: string;
  }) => request<{ ok: true }>('/auth/company-admins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }),
  updateCompanyPassword: (companyId: string, password: string) => request<{ ok: true }>('/auth/company-password', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId, password }),
  }),
  revokeAccount: (employeeId: string) => request<void>(`/auth/accounts/${encodeURIComponent(employeeId)}`, { method: 'DELETE' }),
};