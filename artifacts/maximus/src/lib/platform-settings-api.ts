export type SellerWalletMaturityMode = 'AUTOMATIC' | 'DAYS' | 'WEEKS';

export type SellerWalletMaturityPolicy = {
  mode: SellerWalletMaturityMode;
  value: number | null;
  label: string;
};

export class PlatformSettingsRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'PlatformSettingsRequestError';
  }
}

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
    throw new PlatformSettingsRequestError(
      typeof body.error === 'string' ? body.error : 'Les paramètres plateforme sont indisponibles.',
      response.status,
    );
  }
  return body as T;
}

export const platformSettingsApi = {
  sellerWalletMaturity: () => request<SellerWalletMaturityPolicy>('/platform-settings/seller-wallet-maturity'),
  updateSellerWalletMaturity: (payload: {
    mode: SellerWalletMaturityMode;
    value?: number;
  }) =>
    request<SellerWalletMaturityPolicy>('/platform-settings/seller-wallet-maturity', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};