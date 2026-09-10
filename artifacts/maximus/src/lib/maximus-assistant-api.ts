export type MaximusAssistantResponse = {
  answer: string;
  citations: string[];
  provider: 'anthropic' | 'maxi';
  model: string;
  action?: MaximusAssistantAction;
};

export type MaximusAssistantMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type MaximusAssistantActionType =
  | 'create_module'
  | 'create_pack'
  | 'create_feature'
  | 'create_sector'
  | 'create_company_plan'
  | 'create_organization_unit';
export type MaximusAssistantActionStatus = 'PENDING_CONFIRMATION' | 'EXECUTED';

export type MaximusAssistantAction = {
  type: MaximusAssistantActionType;
  status?: MaximusAssistantActionStatus;
  requiresConfirmation?: boolean;
  id?: string;
  name: string;
  description?: string;
  sector?: string;
  companyEmail?: string;
  managerName?: string;
  requirements?: string[];
  nextSteps?: string[];
  moduleId?: string;
  companyId?: string;
  companyName?: string;
  code?: string;
  parentId?: string | null;
  features?: string[];
  featureIds?: string[];
  featurePacks?: Array<{
    id: string;
    name: string;
    description: string;
    featureIds: string[];
  }>;
  moduleIds?: string[];
  modulePackIds?: Record<string, string[]>;
  moduleFeatures?: Record<string, string[]>;
  version?: number;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.error === 'string' ? body.error : 'MAXI est momentanément indisponible.');
  }

  return response.json() as Promise<T>;
}

export const maximusAssistantApi = {
  ask: (question: string, history: MaximusAssistantMessage[] = []) =>
    request<MaximusAssistantResponse>('/maximus-assistant/ask', {
      method: 'POST',
      body: JSON.stringify({ question, history: history.slice(-8) }),
    }),
  previewAction: (action: MaximusAssistantAction) =>
    request<MaximusAssistantResponse>('/maximus-assistant/actions/preview', {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),
  executeAction: (action: MaximusAssistantAction) =>
    request<MaximusAssistantResponse>('/maximus-assistant/actions/execute', {
      method: 'POST',
      body: JSON.stringify({ action, confirmed: true }),
    }),
};