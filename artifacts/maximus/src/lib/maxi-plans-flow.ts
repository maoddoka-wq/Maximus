import type { MaxiPlan } from './maxi-plans-api';

export const MAXI_PLAN_LIMITS = [
  'Moteur local par règles et documentation, sans API d’IA externe ni modèle génératif entraîné.',
  'Six capacités seulement : module, pack, fonctionnalité, secteur, plan entreprise (sans activation) et unité d’organisation.',
  'Aucun code n’est généré.',
  'Aucun paiement ni publication automatique.',
  'Chaque étape exige un aperçu serveur puis votre confirmation explicite.',
];

export const isPlanReadonly = (plan: MaxiPlan) => plan.status !== 'AWAITING_CONFIRMATION';

export function currentStep(plan: MaxiPlan) {
  if (isPlanReadonly(plan)) return null;
  return plan.steps.find(s => s.index === plan.currentStep && s.status === 'PENDING_CONFIRMATION') ?? null;
}

export type PreviewState = { planId: string; step: number; token: string } | null;

/** The execute button is allowed only for a preview matching the current step. */
export function canExecute(plan: MaxiPlan, preview: PreviewState) {
  const step = currentStep(plan);
  return Boolean(step && preview && preview.planId === plan.id && preview.step === step.index && preview.token);
}

export const errorStatus = (e: unknown) => (e && typeof e === 'object' && 'status' in e ? (e as { status: number }).status : 0);
export const isConflict = (e: unknown) => errorStatus(e) === 409;
export const isTimeout = (e: unknown) => Boolean(e && typeof e === 'object' && (e as { kind?: string }).kind === 'timeout');
