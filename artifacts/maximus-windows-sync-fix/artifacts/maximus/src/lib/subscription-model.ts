import type { ModuleId } from './module-ids';

export type SubscriptionStatus = 'ESSAI' | 'ACTIF' | 'IMPAYÉ' | 'SUSPENDU' | 'RÉSILIÉ' | 'EXPIRÉ';
export type SubscriptionPaymentStatus = 'À JOUR' | 'EN ATTENTE' | 'IMPAYÉ' | 'NON CONFIGURÉ';
export type SubscriptionInterval = 'MENSUEL' | 'ANNUEL';
export type PaymentMethodType = 'MOBILE_MONEY' | 'CARTE' | 'VIREMENT' | 'AUCUN';
export type InvoiceStatus = 'PAYÉE' | 'OUVERTE' | 'EN RETARD' | 'ANNULÉE';
export type SubscriptionEventType = 'ACTIVATION' | 'ESSAI' | 'CHANGEMENT DE PLAN' | 'PAIEMENT' | 'SUSPENSION' | 'RÉSILIATION';

export interface SubscriptionLimits {
  employees: number;
  modules: number;
  storageGb: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthlyAmount: number;
  annualAmount: number;
  currency: 'XOF';
  limits: SubscriptionLimits;
}

export interface SubscriptionPaymentMethod {
  type: PaymentMethodType;
  label: string;
  last4?: string;
}

export interface SubscriptionInvoice {
  id: string;
  number: string;
  amount: number;
  currency: 'XOF';
  issuedAt: string;
  dueAt: string;
  status: InvoiceStatus;
}

export interface SubscriptionHistoryEntry {
  id: string;
  type: SubscriptionEventType;
  label: string;
  date: string;
  actor: string;
}

export interface CompanySubscription {
  id: string;
  companyId: string;
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  amount: number;
  currency: 'XOF';
  interval: SubscriptionInterval;
  startedAt: string;
  endsAt: string | null;
  nextRenewalAt: string | null;
  trialEndsAt: string | null;
  paymentStatus: SubscriptionPaymentStatus;
  paymentMethod: SubscriptionPaymentMethod;
  limits: SubscriptionLimits;
  invoices: SubscriptionInvoice[];
  history: SubscriptionHistoryEntry[];
  moduleIds: ModuleId[];
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'essential',
    name: 'Essentiel',
    description: 'Pour démarrer avec un périmètre métier maîtrisé.',
    monthlyAmount: 45000,
    annualAmount: 486000,
    currency: 'XOF',
    limits: { employees: 10, modules: 4, storageGb: 10 },
  },
  {
    id: 'growth',
    name: 'Croissance',
    description: 'Pour les équipes qui structurent plusieurs activités.',
    monthlyAmount: 95000,
    annualAmount: 1026000,
    currency: 'XOF',
    limits: { employees: 50, modules: 8, storageGb: 50 },
  },
  {
    id: 'scale',
    name: 'Scale',
    description: 'Pour piloter une organisation complète et multi-module.',
    monthlyAmount: 185000,
    annualAmount: 1998000,
    currency: 'XOF',
    limits: { employees: 250, modules: 14, storageGb: 250 },
  },
];

function planForModuleCount(moduleCount: number) {
  return subscriptionPlans.find(plan => moduleCount <= plan.limits.modules) ?? subscriptionPlans.at(-1)!;
}

export function buildSubscriptionForCompany(input: {
  companyId: string;
  createdAt: string;
  moduleIds: ModuleId[];
}): CompanySubscription {
  const plan = planForModuleCount(input.moduleIds.length);
  const isActive = input.moduleIds.length > 0;
  const status: SubscriptionStatus = isActive ? 'ACTIF' : 'ESSAI';
  const paymentStatus: SubscriptionPaymentStatus = isActive ? 'NON CONFIGURÉ' : 'EN ATTENTE';

  return {
    id: `subscription-${input.companyId}`,
    companyId: input.companyId,
    planId: plan.id,
    planName: plan.name,
    status,
    amount: plan.monthlyAmount,
    currency: plan.currency,
    interval: 'MENSUEL',
    startedAt: input.createdAt,
    endsAt: null,
    nextRenewalAt: null,
    trialEndsAt: status === 'ESSAI' ? input.createdAt : null,
    paymentStatus,
    paymentMethod: { type: 'AUCUN', label: 'Aucun moyen configuré' },
    limits: { ...plan.limits },
    invoices: [],
    history: [
      {
        id: `subscription-event-${input.companyId}`,
        type: status === 'ACTIF' ? 'ACTIVATION' : 'ESSAI',
        label: status === 'ACTIF' ? 'Abonnement activé' : 'Période d’essai créée',
        date: input.createdAt,
        actor: 'MAXIMUS',
      },
    ],
    moduleIds: [...input.moduleIds],
  };
}