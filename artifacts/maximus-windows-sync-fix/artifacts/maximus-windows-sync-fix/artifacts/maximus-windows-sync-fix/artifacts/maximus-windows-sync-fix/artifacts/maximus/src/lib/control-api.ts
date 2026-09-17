import { requestJson } from './api-request';
import type { AuditEntry, ControlTask, DomainEvent } from '@/lib/store';

type ControlScope = 'admin' | 'all' | 'assigned' | 'sector';

export type ControlBootstrap = {
  tasks: ControlTask[];
  events: DomainEvent[];
  auditEntries: AuditEntry[];
};

export type SystemHealthCheckStatus = 'UP' | 'DOWN' | 'DEGRADED' | 'UNKNOWN';

export type SystemHealthCheck = {
  key: string;
  label: string;
  status: SystemHealthCheckStatus;
  severity: string;
  message: string;
  details?: Record<string, unknown>;
};

export type SystemHealthIncident = {
  id: string;
  key: string;
  severity: string;
  status: 'ACTIVE' | 'RESOLVED';
  title: string;
  message: string;
  details?: Record<string, unknown>;
  occurrenceCount: number;
  firstSeenAt?: string;
  lastSeenAt?: string;
  resolvedAt?: string;
};

export type SystemHealth = {
  status: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
  checkedAt: string;
  checks: SystemHealthCheck[];
  activeIncidents: SystemHealthIncident[];
  recentIncidents: SystemHealthIncident[];
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

function normalizeHealth(payload: unknown): SystemHealth {
  const value = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const checks = Array.isArray(value.checks) ? value.checks : [];
  const incidents = (input: unknown): SystemHealthIncident[] => Array.isArray(input) ? input as SystemHealthIncident[] : [];
  return {
    status: value.status === 'DOWN' || value.status === 'DEGRADED' ? value.status : 'OPERATIONAL',
    checkedAt: typeof value.checkedAt === 'string' ? value.checkedAt : '',
    checks: checks as SystemHealthCheck[],
    activeIncidents: incidents(value.activeIncidents),
    recentIncidents: incidents(value.recentIncidents),
  };
}

type NewTaskInput = Omit<ControlTask, 'id' | 'status' | 'createdAt' | 'updatedAt'>;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  return requestJson<T>(path, options, { fallbackMessage: 'La persistance du contrôle est indisponible.' });
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
  health: async () => normalizeHealth(await request<unknown>('/control/health')),
  createTask: (input: NewTaskInput) => request<ControlTask>('/control/tasks', json(input)),
  updateTaskStatus: (task: ControlTask, status: ControlTask['status']) =>
    request<ControlTask>(`/control/tasks/${encodeURIComponent(task.id)}/status`, json({ status, companyId: task.companyId }, 'PATCH')),
};