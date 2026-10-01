import { requestJson } from './api-request';
import type { ModuleAvailability } from './store';

export type EcommerceSubscriptionAccessStatus = Extract<
  ModuleAvailability,
  'ACTIF' | 'BETA' | 'MAINTENANCE' | 'INACTIF'
>;

export type CompanyEcommerceSubscription = {
  companyId: string;
  companyName: string;
  status: EcommerceSubscriptionAccessStatus;
  monthlyAmount: number | null;
  updatedAt: string | null;
};

export type EcommerceSubscriptionUpdate = {
  status: EcommerceSubscriptionAccessStatus;
  monthlyAmount: number | null;
};

const allowedStatuses = new Set<EcommerceSubscriptionAccessStatus>([
  'ACTIF',
  'BETA',
  'MAINTENANCE',
  'INACTIF',
]);

function parseSubscription(value: unknown): CompanyEcommerceSubscription {
  if (!value || typeof value !== 'object') {
    throw new Error('La réponse des abonnements E-commerce est invalide.');
  }

  const entry = value as Record<string, unknown>;
  if (
    typeof entry.companyId !== 'string'
    || typeof entry.companyName !== 'string'
    || typeof entry.status !== 'string'
    || !allowedStatuses.has(entry.status as EcommerceSubscriptionAccessStatus)
    || (entry.monthlyAmount !== null && (
      typeof entry.monthlyAmount !== 'number'
      || !Number.isSafeInteger(entry.monthlyAmount)
      || entry.monthlyAmount < 0
    ))
    || (entry.updatedAt !== null && typeof entry.updatedAt !== 'string')
  ) {
    throw new Error('La réponse des abonnements E-commerce est incomplète.');
  }

  return {
    companyId: entry.companyId,
    companyName: entry.companyName,
    status: entry.status as EcommerceSubscriptionAccessStatus,
    monthlyAmount: entry.monthlyAmount as number | null,
    updatedAt: entry.updatedAt as string | null,
  };
}

export async function loadEcommerceSubscriptions(): Promise<CompanyEcommerceSubscription[]> {
  const response = await requestJson<{ subscriptions: unknown }>('/platform-settings/ecommerce-subscriptions', undefined, {
    fallbackMessage: 'Les abonnements E-commerce sont indisponibles.',
  });

  if (!Array.isArray(response.subscriptions)) {
    throw new Error('La réponse des abonnements E-commerce est invalide.');
  }

  return response.subscriptions.map(parseSubscription);
}

export async function updateEcommerceSubscription(
  companyId: string,
  input: EcommerceSubscriptionUpdate,
): Promise<CompanyEcommerceSubscription> {
  const response = await requestJson<{ subscription: unknown }>(
    `/platform-settings/ecommerce-subscriptions/${encodeURIComponent(companyId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    { fallbackMessage: 'La mise à jour de l’abonnement E-commerce a échoué.' },
  );

  return parseSubscription(response.subscription);
}