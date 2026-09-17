import { requestJson } from './api-request';

export interface OnboardingProposal {
  companyProfile: {
    businessType: string;
    sector: string;
    description: string;
    employeeEstimate?: number;
    physicalSales?: boolean;
    onlineSales?: boolean;
    stockManagement?: boolean;
    customerManagement?: boolean;
    hrNeeds?: boolean;
    vehicleNeeds?: boolean;
    rentalNeeds?: boolean;
    financeNeeds?: boolean;
  };
  recommendedModules: {
    moduleId: string;
    moduleName: string;
    reason: string;
    confidence: number;
    packIds: string[];
    featureIds: string[];
  }[];
  suggestedSettings: Record<string, { value: string; source: string; requiresConfirmation: boolean }>;
  unknowns: string[];
  catalogVersion?: number;
}

export interface OnboardingDraft {
  draftId: string;
  status: string;
  proposal: OnboardingProposal;
}

export const onboardingApi = {
  createDraft: (input: { description: string }) =>
    requestJson<OnboardingDraft>('/onboarding/drafts', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getDraft: (draftId: string) =>
    requestJson<OnboardingDraft>(`/onboarding/drafts/${draftId}`),
  updateDraft: (draftId: string, input: { description?: string; proposal: OnboardingProposal }) =>
    requestJson<OnboardingDraft>(`/onboarding/drafts/${draftId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  confirmDraft: (draftId: string, input: {
    name: string;
    manager: string;
    email: string;
    password: string;
    phone?: string;
    country?: string;
    sector?: string;
  }) =>
    requestJson<{ ok: true; draft: OnboardingDraft; requestId: string; status: 'PENDING' }>(
      `/onboarding/drafts/${draftId}/confirm`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    ),
};
