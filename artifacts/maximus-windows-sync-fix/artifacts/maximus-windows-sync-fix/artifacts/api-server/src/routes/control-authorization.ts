export type ControlActorRole = 'maximus_admin' | 'company_admin' | 'sector_manager' | 'employee';

export type ControlActorContext = {
  role: ControlActorRole;
  displayName: string;
  companyId?: string;
  employeeId?: string;
  sectorIds: string[];
};

export type ControlTaskScope = {
  companyId: string;
  sectorId?: string | null;
  assigneeEmployeeId?: string | null;
};

export function isValidControlActor(actor: ControlActorContext) {
  if (actor.role === 'maximus_admin') return true;
  if (!actor.companyId) return false;
  if (actor.role === 'employee') return Boolean(actor.employeeId);
  if (actor.role === 'sector_manager') return actor.sectorIds.length > 0;
  return true;
}

export function canReadControlScope(actor: ControlActorContext, companyId?: string, task?: ControlTaskScope) {
  if (!isValidControlActor(actor)) return false;
  if (actor.role === 'maximus_admin') return true;
  if (!companyId || !actor.companyId || actor.companyId !== companyId) return false;
  if (!task) return true;
  if (task.companyId !== actor.companyId) return false;
  if (actor.role === 'company_admin') return true;
  if (actor.role === 'sector_manager') return Boolean(task.sectorId && actor.sectorIds.includes(task.sectorId));
  return task.assigneeEmployeeId === actor.employeeId;
}

export function canCreateControlTask(actor: ControlActorContext, input: ControlTaskScope) {
  if (actor.role === 'maximus_admin') return true;
  if (!canReadControlScope(actor, input.companyId)) return false;
  if (actor.role === 'company_admin') return true;
  if (actor.role === 'sector_manager') return Boolean(input.sectorId && actor.sectorIds.includes(input.sectorId));
  return false;
}

export function canUpdateControlTask(actor: ControlActorContext, task: ControlTaskScope) {
  return canReadControlScope(actor, task.companyId, task);
}