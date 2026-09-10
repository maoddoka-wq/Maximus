export type PayrollWallet = {
  currency: string;
  availableBalance: number;
  reservedBalance: number;
  totalFunded: number;
};

export type PayrollBeneficiary = {
  id: string;
  employeeId: string | null;
  fullName: string;
  mobile: string;
  accountNumberMasked: string;
  provider: 'WAVE';
  monthlySalary: number;
  paymentDay: number;
  active: boolean;
};

export type PayrollBeneficiaryInput = {
  employeeId: string | null;
  fullName: string;
  mobile: string;
  accountNumber: string;
  provider: 'WAVE';
  monthlySalary: number;
  paymentDay: number;
};

export type PayrollBatch = {
  id: string;
  period: string;
  paymentDate: string;
  totalAmount: number;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';
  itemCount: number;
  paidCount: number;
  failedCount: number;
  createdAt: string;
};

export type PayrollItem = {
  id: string;
  batchId: string;
  beneficiaryId: string;
  beneficiaryName: string;
  mobile: string;
  amount: number;
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  failureReason: string;
  processedAt: string | null;
};

export type PayrollTopup = {
  id: string;
  amount: number;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  provider: string;
  checkoutUrl: string | null;
  failureReason: string;
  createdAt: string;
};

export type PayrollBootstrap = {
  wallet: PayrollWallet;
  beneficiaries: PayrollBeneficiary[];
  batches: PayrollBatch[];
  items: PayrollItem[];
  topups: PayrollTopup[];
};

type RequestOptions = RequestInit & { json?: unknown };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { json, headers, ...init } = options;
  const response = await fetch(`/api/payroll${path}`, {
    ...init,
    cache: 'no-store',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(headers ?? {}) },
    body: json === undefined ? init.body : JSON.stringify(json),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? 'La demande Paie a échoué.');
  return payload as T;
}

export function createPayrollApi() {
  return {
    bootstrap: () => request<PayrollBootstrap>('/bootstrap'),
    createBeneficiary: (input: PayrollBeneficiaryInput) =>
      request<PayrollBeneficiary>('/beneficiaries', { method: 'POST', json: input }),
    updateBeneficiary: (id: string, input: Partial<PayrollBeneficiaryInput>) =>
      request<PayrollBeneficiary>(`/beneficiaries/${encodeURIComponent(id)}`, { method: 'PATCH', json: input }),
    archiveBeneficiary: (id: string) =>
      request<{ ok: true }>(`/beneficiaries/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    createBatch: (input: { period: string; paymentDate: string; beneficiaryIds: string[]; amounts?: Record<string, number> }) =>
      request<{ batch: PayrollBatch }>('/batches', { method: 'POST', json: input }),
    submitBatch: (id: string) => request<{ batch: PayrollBatch }>(`/batches/${id}/submit`, { method: 'POST' }),
    approveBatch: (id: string) => request<{ batch: PayrollBatch }>(`/batches/${id}/approve`, { method: 'POST' }),
    payoutBatch: (id: string) => request<{ batch: PayrollBatch }>(`/batches/${id}/payout`, { method: 'POST' }),
    topup: (amount: number, idempotencyKey: string) =>
      request<{ topup: PayrollTopup }>('/wallet/topups', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, json: { amount, idempotencyKey } }),
  };
}