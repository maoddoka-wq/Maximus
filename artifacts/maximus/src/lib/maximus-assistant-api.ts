export type MaximusAssistantResponse = {
  answer: string;
  citations: string[];
  provider: 'anthropic';
  model: string;
};

export type MaximusAssistantMessage = {
  role: 'user' | 'assistant';
  content: string;
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
    throw new Error(typeof body.error === 'string' ? body.error : 'L’assistant MAXIMUS est indisponible.');
  }

  return response.json() as Promise<T>;
}

export const maximusAssistantApi = {
  ask: (question: string, history: MaximusAssistantMessage[] = []) =>
    request<MaximusAssistantResponse>('/maximus-assistant/ask', {
      method: 'POST',
      body: JSON.stringify({ question, history: history.slice(-8) }),
    }),
};