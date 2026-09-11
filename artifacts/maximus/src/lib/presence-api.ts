import { requestJson } from './api-request';

export type PresenceItemType = 'attendance' | 'absence' | 'schedule' | 'planning' | 'mission' | 'holiday' | 'settings' | 'history' | 'leave';
export type PresenceWriteType = Exclude<PresenceItemType, 'history'>;
export type PresencePayload = Record<string, unknown>;
export type PresenceItem = { id: string; companyId: string; type: PresenceItemType; employeeId: string | null; workDate: string | null; startDate: string | null; endDate: string | null; status: string; payload: PresencePayload; createdBy: string; updatedBy: string; createdAt: string; updatedAt: string };
export type PresenceItemInput = { type: PresenceWriteType; companyId?: string; employeeId?: string | null; workDate?: string | null; startDate?: string | null; endDate?: string | null; status: string; payload: PresencePayload; actor?: string };
const json = (body: unknown) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  return requestJson<T>(path, options, { fallbackMessage: 'Opération impossible.' });
}
export const createPresenceApi = (companyId: string) => {
  const query = (path: string) => `${path}${path.includes('?') ? '&' : '?'}companyId=${encodeURIComponent(companyId)}`;
  return {
    bootstrap: () => request<{ items: PresenceItem[] }>(query('/presence/bootstrap')),
    create: (body: Omit<PresenceItemInput, 'companyId'>) => request<PresenceItem>(query('/presence/items'), json(body)),
    update: (id: string, body: Partial<PresenceItemInput>) => request<PresenceItem>(query(`/presence/items/${id}`), { ...json(body), method: 'PATCH' }),
    remove: (id: string, actor: string) => request<{ ok: boolean }>(query(`/presence/items/${id}`), { ...json({ actor }), method: 'DELETE' }),
    clock: (body: { employeeId: string; workDate: string; action: 'arrival' | 'exit' | 'pauseStart' | 'pauseEnd'; actor: string; expectedStart?: string; tolerance?: number }) => request<PresenceItem>(query('/presence/clock'), json(body)),
  };
};