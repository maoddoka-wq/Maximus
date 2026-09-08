import type { AuditEntry, ControlTask, DomainEvent } from '@/lib/store';

type ControlScope = 'admin' | 'all' | 'assigned' | 'sector';

export type ControlBootstrap = {
  tasks: ControlTask[];
  events: DomainEvent[];
  auditEntries: AuditEntry[];
};

function normalizeBootstrap(payload: unknown): ControlBootstrap {
  const value = payload && typeof payload === 'object'
    ? payload as Record<string, unknown>
    : {};
  return {
    tasks: Array.isArray(value.tasks) ? value.tasks as ControlTask[] : [],
    events: Array.isArray(value.events) ? value.events as DomainEvent[] : [],
    auditEntries: Array.isArray(value.auditEntries) ? value.auditEntries as AuditEntry[] : [],
  };
}

type NewTaskInput = Omit<ControlTask, 'status' | 'createdAt' | 'updatedAt'>;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.error === 'string' ? body.error : 'La persistance du contrôle est indisponible.');
  }
  return response.json() as Promise<T>;
}

const json = (body: unknown, method = 'POST'): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const controlApi = {
  bootstrap: async (input: { companyId?: string; scope: ControlScope }) => {
    const query = new URLSearchParams({ scope: input.scope });
    if (input.companyId) query.set('companyId', input.companyId);
    return normalizeBootstrap(await request<unknown>(`/control/bootstrap?${query.toString()}`));
  },
  createTask: (input: NewTaskInput) => request<ControlTask>('/control/tasks', json(input)),
  updateTaskStatus: (task: ControlTask, status: ControlTask['status']) =>
    request<ControlTask>(`/control/tasks/${encodeURIComponent(task.id)}/status`, json({ status }, 'PATCH')),
};