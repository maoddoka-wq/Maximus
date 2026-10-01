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
  subscriptionStatus: string | null;
  paidThroughAt: string | null;
  daysRemaining: number | null;
  lastPaymentStatus: string | null;
};

export type CompanyEcommerceSubscriptionState =
  | 'NOT_MANAGED'
  | 'UNAVAILABLE'
  | 'PAYMENT_REQUIRED'
  | 'ACTIVE'
  | 'EXPIRED';

export type EcommercePaymentStatus = 'CREATING' | 'PENDING' | 'PAID' | 'FAILED';
export type EcommercePaymentProvider = 'WAVE' | 'ORANGE_MONEY';

export type EcommercePayment = {
  id: string;
  reference: string;
  amount: number;
  currency: 'XOF';
  provider: EcommercePaymentProvider;
  status: EcommercePaymentStatus;
  checkoutUrl: string | null;
  paidAt: string | null;
};

export type CompanyEcommerceSubscriptionDetails = {
  required: boolean;
  available: boolean;
  status: CompanyEcommerceSubscriptionState;
  moduleStatus: EcommerceSubscriptionAccessStatus;
  monthlyAmount: number | null;
  currency: 'XOF';
  paidThroughAt: string | null;
  daysRemaining: number | null;
  payment: EcommercePayment | null;
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
const subscriptionStates = new Set<CompanyEcommerceSubscriptionState>([
  'NOT_MANAGED',
  'UNAVAILABLE',
  'PAYMENT_REQUIRED',
  'ACTIVE',
  'EXPIRED',
]);
const paymentStatuses = new Set<EcommercePaymentStatus>(['CREATING', 'PENDING', 'PAID', 'FAILED']);
const paymentProviders = new Set<EcommercePaymentProvider>(['WAVE', 'ORANGE_MONEY']);

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function parsePayment(value: unknown): EcommercePayment | null {
  if (value === null) return null;
  if (!value || typeof value !== 'object') {
    throw new Error('La réponse du paiement E-commerce est invalide.');
  }
  const payment = value as Record<string, unknown>;
  if (
    typeof payment.id !== 'string'
    || typeof payment.reference !== 'string'
    || typeof payment.amount !== 'number'
    || !Number.isSafeInteger(payment.amount)
    || payment.amount < 0
    || payment.currency !== 'XOF'
    || typeof payment.provider !== 'string'
    || !paymentProviders.has(payment.provider as EcommercePaymentProvider)
    || typeof payment.status !== 'string'
    || !paymentStatuses.has(payment.status as EcommercePaymentStatus)
    || !nullableString(payment.checkoutUrl)
    || !nullableString(payment.paidAt)
  ) {
    throw new Error('La réponse du paiement E-commerce est incomplète.');
  }
  return {
    id: payment.id,
    reference: payment.reference,
    amount: payment.amount,
    currency: 'XOF',
    provider: payment.provider as EcommercePaymentProvider,
    status: payment.status as EcommercePaymentStatus,
    checkoutUrl: payment.checkoutUrl,
    paidAt: payment.paidAt,
  };
}

function parseCompanySubscriptionDetails(value: unknown): CompanyEcommerceSubscriptionDetails {
  if (!value || typeof value !== 'object') {
    throw new Error('La réponse de l’abonnement E-commerce est invalide.');
  }
  const subscription = value as Record<string, unknown>;
  if (
    typeof subscription.required !== 'boolean'
    || typeof subscription.available !== 'boolean'
    || typeof subscription.status !== 'string'
    || !subscriptionStates.has(subscription.status as CompanyEcommerceSubscriptionState)
    || typeof subscription.moduleStatus !== 'string'
    || !allowedStatuses.has(subscription.moduleStatus as EcommerceSubscriptionAccessStatus)
    || (subscription.monthlyAmount !== null && (
      typeof subscription.monthlyAmount !== 'number'
      || !Number.isSafeInteger(subscription.monthlyAmount)
      || subscription.monthlyAmount < 0
    ))
    || subscription.currency !== 'XOF'
    || !nullableString(subscription.paidThroughAt)
    || (subscription.daysRemaining !== null && (
      typeof subscription.daysRemaining !== 'number'
      || !Number.isSafeInteger(subscription.daysRemaining)
    ))
  ) {
    throw new Error('La réponse de l’abonnement E-commerce est incomplète.');
  }
  return {
    required: subscription.required,
    available: subscription.available,
    status: subscription.status as CompanyEcommerceSubscriptionState,
    moduleStatus: subscription.moduleStatus as EcommerceSubscriptionAccessStatus,
    monthlyAmount: subscription.monthlyAmount as number | null,
    currency: 'XOF',
    paidThroughAt: subscription.paidThroughAt,
    daysRemaining: subscription.daysRemaining as number | null,
    payment: parsePayment(subscription.payment),
  };
}

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
    || (entry.subscriptionStatus !== null && typeof entry.subscriptionStatus !== 'string')
    || (entry.paidThroughAt !== null && typeof entry.paidThroughAt !== 'string')
    || (entry.daysRemaining !== null && (
      typeof entry.daysRemaining !== 'number'
      || !Number.isSafeInteger(entry.daysRemaining)
    ))
    || (entry.lastPaymentStatus !== null && typeof entry.lastPaymentStatus !== 'string')
  ) {
    throw new Error('La réponse des abonnements E-commerce est incomplète.');
  }

  return {
    companyId: entry.companyId,
    companyName: entry.companyName,
    status: entry.status as EcommerceSubscriptionAccessStatus,
    monthlyAmount: entry.monthlyAmount as number | null,
    updatedAt: entry.updatedAt as string | null,
    subscriptionStatus: entry.subscriptionStatus as string | null,
    paidThroughAt: entry.paidThroughAt as string | null,
    daysRemaining: entry.daysRemaining as number | null,
    lastPaymentStatus: entry.lastPaymentStatus as string | null,
  };
}

export async function loadCompanyEcommerceSubscription(): Promise<CompanyEcommerceSubscriptionDetails> {
  const response = await requestJson<{ subscription: unknown }>('/company/ecommerce-subscription', undefined, {
    fallbackMessage: 'Le statut de l’abonnement E-commerce est indisponible.',
  });
  return parseCompanySubscriptionDetails(response.subscription);
}

export async function createCompanyEcommerceCheckout(input: {
  provider: EcommercePaymentProvider;
  redirectUrl: string;
}): Promise<EcommercePayment> {
  const response = await requestJson<{ payment: unknown }>('/company/ecommerce-subscription/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }, { fallbackMessage: 'La création du paiement E-commerce a échoué.' });
  const payment = parsePayment(response.payment);
  if (!payment) throw new Error('La réponse du paiement E-commerce est invalide.');
  return payment;
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