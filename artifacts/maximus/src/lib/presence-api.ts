export type PresenceItemType = 'attendance' | 'absence' | 'schedule' | 'planning' | 'mission' | 'leave' | 'holiday' | 'settings' | 'history';
export type PresenceItem = { id: string; companyId: string; type: PresenceItemType; employeeId: string | null; workDate: string | null; startDate: string | null; endDate: string | null; status: string; payload: Record<string, any>; createdBy: string; updatedBy: string; createdAt: string; updatedAt: string };
type ItemInput = Omit<PresenceItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> & { actor?: string };
const json = (body: unknown) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, options);
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(typeof body.error === 'string' ? body.error : 'Opération impossible.'); }
  return response.json() as Promise<T>;
}
export const createPresenceApi = (companyId: string) => {
  const query = (path: string) => `${path}${path.includes('?') ? '&' : '?'}companyId=${encodeURIComponent(companyId)}`;
  return {
    bootstrap: () => request<{ items: PresenceItem[] }>(query('/presence/bootstrap')),
    create: (body: Omit<ItemInput, 'companyId'>) => request<PresenceItem>('/presence/items', json({ ...body, companyId })),
    update: (id: string, body: Partial<ItemInput>) => request<PresenceItem>(query(`/presence/items/${id}`), { ...json({ ...body, companyId }), method: 'PATCH' }),
    remove: (id: string, actor: string) => request<{ ok: boolean }>(query(`/presence/items/${id}`), { ...json({ actor, companyId }), method: 'DELETE' }),
    clock: (body: { employeeId: string; workDate: string; action: 'arrival' | 'exit' | 'pauseStart' | 'pauseEnd'; actor: string; expectedStart?: string; tolerance?: number }) => request<PresenceItem>(`/presence/clock`, json({ ...body, companyId })),
  };
};