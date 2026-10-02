import { normalizeRoutePath } from '@/lib/navigation';

export type AdminControlRoute = 'coordination' | 'surveillance' | null;
export type CompanyControlScope = 'company' | 'sector' | 'assigned';

export type CompanyControlCapabilitiesInput = {
  isAdmin?: boolean;
  companyAdmin?: boolean;
  sectorManager?: boolean;
  employeeId?: string;
  permissions?: string[];
};

export function getCompanyControlCapabilities(input: CompanyControlCapabilitiesInput) {
  const isPrivileged = Boolean(input.isAdmin || input.companyAdmin);
  const isAssignedEmployee = Boolean(input.employeeId && !input.sectorManager && !input.companyAdmin && !input.isAdmin);
  const permissions = new Set(input.permissions ?? []);
  const canViewByRole = permissions.has('voir');
  const canCreateByRole = canViewByRole && permissions.has('créer');
  const canUpdateByRole = canCreateByRole && permissions.has('modifier');

  return {
    canView: isPrivileged || isAssignedEmployee || canViewByRole,
    canCreate: isPrivileged || canCreateByRole,
    canUpdate: isPrivileged || isAssignedEmployee || canUpdateByRole,
  };
}

export function getAdminControlRoute(location: string): AdminControlRoute {
  const routePath = normalizeRoutePath(location);
  if (routePath === '/maximus/controle') return 'coordination';
  if (routePath === '/maximus/surveillance') return 'surveillance';
  return null;
}

export function getCompanyControlScope(input: {
  companyAdmin: boolean;
  sectorManager: boolean;
}): CompanyControlScope {
  if (input.companyAdmin) return 'company';
  if (input.sectorManager) return 'sector';
  return 'assigned';
}