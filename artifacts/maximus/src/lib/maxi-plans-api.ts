import { requestJson } from './api-request';
import type { MaximusAssistantAction, MaximusAssistantResponse } from './maximus-assistant-api';

export type MaxiPlan = {
  id: string;
  goal: string;
  title: string;
  summary: string;
  status: 'AWAITING_CONFIRMATION' | 'COMPLETED' | 'CANCELLED';
  currentStep: number;
  updatedAt: string;
  error: string | null;
  steps: Array<{
    index: number;
    title: string;
    action: MaximusAssistantAction;
    status: 'PENDING_CONFIRMATION' | 'EXECUTED';
    result?: MaximusAssistantResponse;
  }>;
};

export type MaxiPlanProposal = {
  plan: MaxiPlan | null;
  questions: string[];
  answer: string;
};

export type MaxiPlanPreview = {
  plan: MaxiPlan;
  token: string;
  answer: string;
  action: MaximusAssistantAction;
  workspaceVersion: number;
};

const request = <T>(path: string, options?: RequestInit) =>
  requestJson<T>(`/maximus-assistant/plans${path}`, options, {
    fallbackMessage: 'MAXI n’a pas pu traiter le plan supervisé.',
    timeoutMs: 90_000,
  });

export const maxiPlansApi = {
  list: () => request<{ plans: MaxiPlan[] }>('', { cache: 'no-store' }),
  get: (id: string) => request<MaxiPlan>(`/${encodeURIComponent(id)}`, { cache: 'no-store' }),
  prepare: (goal: string) => request<MaxiPlanProposal>('', {
    method: 'POST', body: JSON.stringify({ goal }),
  }),
  preview: (id: string, step: number) => request<MaxiPlanPreview>(`/${encodeURIComponent(id)}/preview`, {
    method: 'POST', body: JSON.stringify({ step }),
  }),
  execute: (id: string, step: number, token: string) => request<MaxiPlan>(`/${encodeURIComponent(id)}/execute`, {
    method: 'POST', body: JSON.stringify({ step, token, confirmed: true }),
  }),
  cancel: (id: string) => request<MaxiPlan>(`/${encodeURIComponent(id)}/cancel`, {
    method: 'POST', body: JSON.stringify({ confirmed: true }),
  }),
};