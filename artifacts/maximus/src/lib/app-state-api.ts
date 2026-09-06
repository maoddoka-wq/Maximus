import type { StoreData } from './store';

type AppStateResponse = {
  scope: string;
  version: number;
  data: Partial<StoreData>;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : 'Les données métier sont indisponibles.');
  }
  return body as T;
}

export const appStateApi = {
  bootstrap: () => request<AppStateResponse>('/app-state/bootstrap'),
  save: (data: StoreData, version: number) =>
    request<{ ok: true; version: number }>('/app-state', {
      method: 'PUT',
      body: JSON.stringify({ data, version }),
    }),
};