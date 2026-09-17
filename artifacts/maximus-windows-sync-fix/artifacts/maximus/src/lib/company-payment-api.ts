import { requestJson } from './api-request';

export type CompanyPaymentAccess = {
  companyId: string;
  status: 'ACTIF' | 'INACTIF';
  enabled: boolean;
  providers: string[];
  updatedAt: string | null;
};

export async function loadCompanyPaymentAccess(companyId: string): Promise<CompanyPaymentAccess> {
  return requestJson<CompanyPaymentAccess>(
    `/companies/${encodeURIComponent(companyId)}/payment-settings`,
    undefined,
    { fallbackMessage: 'Les systèmes de paiement sont indisponibles.' },
  );
}

export async function setCompanyPaymentAccess(
  companyId: string,
  enabled: boolean,
  providers: string[] = ['DIAMANOPAY'],
): Promise<CompanyPaymentAccess> {
  return requestJson<CompanyPaymentAccess>(
    `/companies/${encodeURIComponent(companyId)}/payment-settings`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled, providers }),
    },
    { fallbackMessage: 'La configuration des systèmes de paiement n’a pas pu être enregistrée.' },
  );
}