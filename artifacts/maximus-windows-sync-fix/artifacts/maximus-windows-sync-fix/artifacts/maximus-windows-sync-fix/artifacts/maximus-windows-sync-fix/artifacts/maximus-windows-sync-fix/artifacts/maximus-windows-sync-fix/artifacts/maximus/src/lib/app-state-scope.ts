import type { Session } from './navigation';
import type { StoreData } from './store';

export function appStateScopeMatchesSession(session: Session, scope: string, data: StoreData): boolean {
  if (session === 'admin') return scope === 'workspace';
  if (session.startsWith('company:')) return scope === session;
  if (!session.startsWith('employee:') || !scope.startsWith('company:')) return false;
  const employeeId = session.slice('employee:'.length);
  const employee = data.employees.find((item) => item.id === employeeId);
  return Boolean(employee)
    && data.companies.length <= 1
    && employee?.companyId === scope.slice('company:'.length);
}