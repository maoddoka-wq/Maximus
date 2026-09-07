export interface FinancialPayment {
  id: string;
  publicReference: string;
  amount: number;
  currency: string;
  status: string;
  sourceModule: string;
  sourceType: string;
  sourceId: string;
  provider: string;
  providerTransactionId: string | null;
  checkoutUrl: string | null;
  providerMessage: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface FinancialWallet {
  id: string;
  sellerId: string;
  currency: string;
  availableBalance: number;
  pendingBalance: number;
  withdrawnBalance: number;
  status: string;
}

export interface FinancialLedgerEntry {
  id: string;
  type: string;
  direction: string;
  amount: number;
  currency: string;
  reference: string;
  description: string;
  status: string;
  createdAt: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? 'Impossible de charger les données financières.');
  return body as T;
}

export const createPaymentsApi = (companyId: string) => {
  const query = `?companyId=${encodeURIComponent(companyId)}`;
  return {
    payments: () => request<{ payments: FinancialPayment[] }>(`/payments${query}`),
    wallet: () => request<{ wallet: FinancialWallet; transactions: FinancialLedgerEntry[] }>(`/wallet/${query}`),
  };
};