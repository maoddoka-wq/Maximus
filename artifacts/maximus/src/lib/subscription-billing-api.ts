import { requestJson } from './api-request';

export type SubscriptionModulePrice = {
  id: string;
  name: string;
  monthlyAmount: number | null;
};

export type SubscriptionPriceLine = {
  id: string;
  name: string;
  monthlyAmount: number | null;
};

export type SubscriptionPriceBreakdown = {
  modules: SubscriptionPriceLine[];
  moduleTotal: number | null;
  moduleTotalComplete: boolean;
  customAmount: number | null;
  payableAmount: number | null;
};

export type SubscriptionBillingCompany = SubscriptionPriceBreakdown & {
  companyId: string;
  companyName: string;
  updatedAt: string | null;
};

export type SubscriptionPayment = {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
  checkoutUrl: string | null;
  failureReason: string;
  createdAt: string;
  paidAt: string | null;
};

export type CompanySubscriptionEntitlement = {
  billingMode: CompanySubscriptionBillingMode;
  status: 'FREE' | 'ACTIVE' | 'UNPAID' | 'EXPIRED';
  currentPeriodStartsAt: string | null;
  currentPeriodEndsAt: string | null;
  remainingSeconds: number;
};

export type CompanySubscriptionBilling = SubscriptionPriceBreakdown & {
  companyId: string;
  companyName: string;
  paymentReady: boolean;
  payments: SubscriptionPayment[];
  subscription: CompanySubscriptionEntitlement;
};

export type CompanySubscriptionBillingMode = 'FREE' | 'PAID';

export function getCompanySubscriptionBillingMode(customAmount: number | null): CompanySubscriptionBillingMode {
  return customAmount === 0 ? 'FREE' : 'PAID';
}

function record(value: unknown, errorMessage: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(errorMessage);
  }
  return value as Record<string, unknown>;
}

function nullableAmount(value: unknown, errorMessage: string): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(errorMessage);
  }
  return value;
}

function parseBreakdown(value: unknown): SubscriptionPriceBreakdown {
  const breakdown = record(value, 'Le détail des tarifs est invalide.');
  if (!Array.isArray(breakdown.modules) || typeof breakdown.moduleTotalComplete !== 'boolean') {
    throw new Error('Le détail des tarifs est incomplet.');
  }
  const modules = breakdown.modules.map((value): SubscriptionPriceLine => {
    const module = record(value, 'Une ligne tarifaire est invalide.');
    if (typeof module.id !== 'string' || typeof module.name !== 'string') {
      throw new Error('Une ligne tarifaire est incomplète.');
    }
    return {
      id: module.id,
      name: module.name,
      monthlyAmount: nullableAmount(module.monthlyAmount, 'Un tarif de module est invalide.'),
    };
  });
  const moduleTotal = nullableAmount(breakdown.moduleTotal, 'Le total des modules est invalide.');
  const customAmount = nullableAmount(breakdown.customAmount, 'Le montant personnalisé est invalide.');
  const payableAmount = nullableAmount(breakdown.payableAmount, 'Le montant à payer est invalide.');

  return {
    modules,
    moduleTotal,
    moduleTotalComplete: breakdown.moduleTotalComplete,
    customAmount,
    payableAmount,
  };
}

function parsePayment(value: unknown): SubscriptionPayment {
  const payment = record(value, 'Un paiement est invalide.');
  if (
    typeof payment.id !== 'string'
    || typeof payment.reference !== 'string'
    || typeof payment.amount !== 'number'
    || !Number.isSafeInteger(payment.amount)
    || typeof payment.currency !== 'string'
    || !['PENDING', 'PAID', 'FAILED'].includes(String(payment.status))
    || (payment.checkoutUrl !== null && typeof payment.checkoutUrl !== 'string')
    || typeof payment.failureReason !== 'string'
    || typeof payment.createdAt !== 'string'
    || (payment.paidAt !== null && typeof payment.paidAt !== 'string')
  ) {
    throw new Error('Le paiement est incomplet.');
  }
  return {
    id: payment.id,
    reference: payment.reference,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status as SubscriptionPayment['status'],
    checkoutUrl: payment.checkoutUrl as string | null,
    failureReason: payment.failureReason,
    createdAt: payment.createdAt,
    paidAt: payment.paidAt as string | null,
  };
}

function parseCompany(value: unknown): SubscriptionBillingCompany {
  const company = record(value, 'Une entreprise tarifée est invalide.');
  if (
    typeof company.companyId !== 'string'
    || typeof company.companyName !== 'string'
    || (company.updatedAt !== null && typeof company.updatedAt !== 'string')
  ) {
    throw new Error('Une entreprise tarifée est incomplète.');
  }
  return {
    ...parseBreakdown(company),
    companyId: company.companyId,
    companyName: company.companyName,
    updatedAt: company.updatedAt as string | null,
  };
}

export async function loadSubscriptionBilling(): Promise<{
  modules: SubscriptionModulePrice[];
  companies: SubscriptionBillingCompany[];
}> {
  const response = await requestJson<{ modules: unknown; companies: unknown }>(
    '/platform-settings/subscription-billing',
    undefined,
    { fallbackMessage: 'La grille tarifaire est indisponible.' },
  );
  if (!Array.isArray(response.modules) || !Array.isArray(response.companies)) {
    throw new Error('La grille tarifaire reçue est invalide.');
  }
  const modules = response.modules.map((value): SubscriptionModulePrice => {
    const module = record(value, 'Un tarif de module est invalide.');
    if (typeof module.id !== 'string' || typeof module.name !== 'string') {
      throw new Error('Un tarif de module est incomplet.');
    }
    return {
      id: module.id,
      name: module.name,
      monthlyAmount: nullableAmount(module.monthlyAmount, 'Un montant de module est invalide.'),
    };
  });
  return {
    modules,
    companies: response.companies.map(parseCompany),
  };
}

export async function updateSubscriptionModulePrice(
  moduleId: string,
  monthlyAmount: number | null,
): Promise<SubscriptionModulePrice> {
  const response = await requestJson<{ module: unknown }>(
    `/platform-settings/subscription-billing/modules/${encodeURIComponent(moduleId)}`,
    {
      method: 'PUT',
      body: JSON.stringify({ monthlyAmount }),
    },
    { fallbackMessage: 'La mise à jour du tarif module a échoué.' },
  );
  const module = record(response.module, 'Le tarif de module reçu est invalide.');
  if (typeof module.id !== 'string' || typeof module.name !== 'string') {
    throw new Error('Le tarif de module reçu est incomplet.');
  }
  return {
    id: module.id,
    name: module.name,
    monthlyAmount: nullableAmount(module.monthlyAmount, 'Le montant du module est invalide.'),
  };
}

export async function updateCompanySubscriptionPrice(
  companyId: string,
  customAmount: number | null,
): Promise<void> {
  await requestJson(
    `/platform-settings/subscription-billing/companies/${encodeURIComponent(companyId)}`,
    {
      method: 'PUT',
      body: JSON.stringify({ customAmount }),
    },
    { fallbackMessage: 'La mise à jour du prix personnalisé a échoué.' },
  );
}

export async function loadCompanySubscription(): Promise<CompanySubscriptionBilling> {
  const response = await requestJson<Record<string, unknown>>(
    '/company-subscription',
    undefined,
    { fallbackMessage: 'Les informations d’abonnement sont indisponibles.' },
  );
  if (
    typeof response.companyId !== 'string'
    || typeof response.companyName !== 'string'
    || typeof response.paymentReady !== 'boolean'
    || !Array.isArray(response.payments)
  ) {
    throw new Error('Les informations d’abonnement reçues sont incomplètes.');
  }
  const subscription = record(response.subscription, 'Le statut d’abonnement reçu est invalide.');
  if (
    !['FREE', 'PAID'].includes(String(subscription.billingMode))
    || !['FREE', 'ACTIVE', 'UNPAID', 'EXPIRED'].includes(String(subscription.status))
    || (subscription.currentPeriodStartsAt !== null && typeof subscription.currentPeriodStartsAt !== 'string')
    || (subscription.currentPeriodEndsAt !== null && typeof subscription.currentPeriodEndsAt !== 'string')
    || !Number.isInteger(subscription.remainingSeconds)
    || (subscription.remainingSeconds as number) < 0
  ) {
    throw new Error('Le statut d’abonnement reçu est invalide.');
  }
  return {
    ...parseBreakdown(response),
    companyId: response.companyId,
    companyName: response.companyName,
    paymentReady: response.paymentReady,
    payments: response.payments.map(parsePayment),
    subscription: {
      billingMode: subscription.billingMode as CompanySubscriptionBillingMode,
      status: subscription.status as CompanySubscriptionEntitlement['status'],
      currentPeriodStartsAt: subscription.currentPeriodStartsAt as string | null,
      currentPeriodEndsAt: subscription.currentPeriodEndsAt as string | null,
      remainingSeconds: subscription.remainingSeconds as number,
    },
  };
}

export async function createCompanySubscriptionPayment(redirectUrl: string): Promise<SubscriptionPayment> {
  const response = await requestJson<{ payment: unknown }>(
    '/company-subscription/payments',
    {
      method: 'POST',
      body: JSON.stringify({ redirectUrl }),
    },
    { fallbackMessage: 'La création du paiement a échoué.' },
  );
  return parsePayment(response.payment);
}

export async function refreshCompanySubscriptionPayment(paymentId: string): Promise<SubscriptionPayment> {
  const response = await requestJson<{ payment: unknown }>(
    `/company-subscription/payments/${encodeURIComponent(paymentId)}`,
    undefined,
    { dedupe: false, fallbackMessage: 'La vérification du paiement a échoué.' },
  );
  return parsePayment(response.payment);
}