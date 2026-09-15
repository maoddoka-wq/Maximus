import { normalizeRoutePath } from '@/lib/navigation';

export type AdminControlRoute = 'coordination' | 'surveillance' | null;
export type CompanyControlScope = 'company' | 'sector' | 'assigned';

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