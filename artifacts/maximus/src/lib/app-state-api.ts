import { ApiRequestError, requestJson } from './api-request';
import type { StoreData } from './store';

type AppStateResponse = {
  scope: string;
  version: number;
  data: Partial<StoreData>;
};

export class AppStateRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AppStateRequestError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    return await requestJson<T>(path, init, { fallbackMessage: 'Les données métier sont indisponibles.' });
  } catch (cause) {
    if (cause instanceof ApiRequestError) {
      throw new AppStateRequestError(cause.message, cause.status);
    }
    throw cause;
  }
}

export const appStateApi = {
  bootstrap: () => request<AppStateResponse>('/app-state/bootstrap'),
  save: (data: StoreData, version: number) =>
    request<{ ok: true; version: number }>('/app-state', {
      method: 'PUT',
      body: JSON.stringify({ data, version }),
    }),
};