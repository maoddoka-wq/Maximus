import type { Company, Employee, ModuleAvailability, ModuleId, OrgNode, Role, StoreData } from './store';
import type { Session, SidebarFeatureGroup } from './navigation';
import {
  employeeHasPresencePermission,
  employeeRoleMatchesUnit,
  getCommerceTabIds,
  getEmployeeAncestry,
  getSelectedFeatureIds,
  getStockPermissions,
  restrictRoleToCompany,
  roleHasPermission,
  type ModulePermission,
  type PresencePermission,
} from './employee-permissions';
import { getConfiguredModules } from './store';
import { getModuleFeatureOptions } from './module-features';
import { buildSidebarFeatureGroups } from './sidebar-navigation';

export type AppAccessInput = {
  data: StoreData;
  session: Session;
  employee: Employee | null;
  activeCompanyId?: string;
  activeCompany?: Company;
  sectorTestCompanyId: string | null;
  serverModuleStatuses: Record<string, ModuleAvailability> | null;
  serverModuleAccessReady?: boolean;
};

export type AppAccessContext = {
  companyId: string;
  accessRole: Role | null;
  employeeNode: OrgNode | null;
  allowed: ModuleId[];
  canViewModule: (moduleId: ModuleId) => boolean;
  hasPermission: (moduleId: ModuleId, permission: ModulePermission) => boolean;
  hasPresencePermission: (permission: PresencePermission) => boolean;
  presenceEmployees: Employee[];
  selectedPresenceFeatureIds?: string[];
  selectedEcommerceFeatureIds?: string[];
  stockPermissions?: Record<string, string[]>;
  commerceTabIds?: string[];
  sidebarFeatureGroups: SidebarFeatureGroup[];
  verticalModuleNavigation: boolean;
  sectorManager: boolean;
  canManagePeople: boolean;
};

export function buildAppAccessContext({
  data,
  session,
  employee,
  activeCompanyId,
  activeCompany,
  sectorTestCompanyId,
  serverModuleStatuses,
  serverModuleAccessReady = true,
}: AppAccessInput): AppAccessContext {
  const companyId = activeCompanyId ?? '';
  const configuredModules = getConfiguredModules(data);
  const rawEmployeeRole = employee
    ? (data.roles.find(role => role.id === employee.roleId) ?? data.roles.find(role => role.name === employee.role))
    : null;
  const rawTestCompanyRole =
    sectorTestCompanyId && activeCompany?.managerRoleId
      ? data.roles.find(role => role.id === activeCompany.managerRoleId) ?? null
      : null;
  const accessRole = restrictRoleToCompany(rawEmployeeRole ?? rawTestCompanyRole, activeCompany);
  const moduleStatus = (moduleId: ModuleId): ModuleAvailability =>
    serverModuleStatuses?.[moduleId] ??
    data.moduleStatuses?.[moduleId] ??
    configuredModules.find(module => module.id === moduleId)?.status ??
    'INACTIF';
  const isModuleActive = (moduleId: ModuleId) => !['INACTIF', 'MAINTENANCE'].includes(moduleStatus(moduleId));
  const localCompanyAllowed = data.companies.find(company => company.id === companyId)?.allowedModules ?? [];
  const companyAllowed = (sectorTestCompanyId || serverModuleAccessReady ? localCompanyAllowed : [])
    .filter(isModuleActive);
  const companyAdmin = session.startsWith('company:') && !sectorTestCompanyId;
  const keepCompanySettings = (module: NonNullable<typeof configuredModules[number]>, featureIds: string[]) =>
    module.id === 'ecommerce' && companyAdmin
      ? [...new Set([...featureIds, 'parametres'])]
      : featureIds;
  const companySelectedFeatureIds = (module: NonNullable<typeof configuredModules[number]>) => {
    if (!companyAdmin || !activeCompany) return undefined;

    const selectedPackIds = activeCompany.requestedModulePackIds?.[module.id] ?? [];
    if (selectedPackIds.length > 0) {
      return keepCompanySettings(module, [
        ...new Set(
          (module.featurePacks ?? [])
            .filter(pack => selectedPackIds.includes(pack.id))
            .flatMap(pack => pack.featureIds),
        ),
      ]);
    }

    const requestedFeatures = activeCompany.requestedModuleFeatures;
    if (!requestedFeatures || !Object.prototype.hasOwnProperty.call(requestedFeatures, module.id)) {
      return undefined;
    }

    const validFeatureIds = new Set(getModuleFeatureOptions(module).map(feature => feature.id));
    return keepCompanySettings(module, [
      ...new Set((requestedFeatures[module.id] ?? []).filter(featureId => validFeatureIds.has(featureId))),
    ]);
  };
  const selectedFeatureIdsByModule = Object.fromEntries(
    configuredModules
      .map(module => [module.id, companySelectedFeatureIds(module)] as const)
      .filter(([, featureIds]) => featureIds !== undefined),
  ) as Partial<Record<ModuleId, string[]>>;
  const employeeNode = employee?.sectorId
    ? data.orgNodes.find(node => node.id === employee.sectorId && node.companyId === employee.companyId) ?? null
    : sectorTestCompanyId && accessRole?.sectorId
      ? data.orgNodes.find(node => node.id === accessRole.sectorId && node.companyId === companyId) ?? null
      : null;
  const employeeAncestry = getEmployeeAncestry(data.orgNodes, employeeNode);
  const accessRoleMatchesScope = sectorTestCompanyId
    ? Boolean(accessRole && employeeNode && accessRole.companyId === companyId && accessRole.sectorId === employeeNode.id)
    : employeeRoleMatchesUnit(accessRole, employee, employeeAncestry);
  const canViewModule = (moduleId: ModuleId) => roleHasPermission(accessRole, employeeNode, moduleId, 'voir');
  const allowed =
    session.startsWith('company:') && !sectorTestCompanyId
      ? companyAllowed
      : sectorTestCompanyId && accessRole && accessRoleMatchesScope
        ? companyAllowed.filter(moduleId => canViewModule(moduleId))
        : accessRole && accessRoleMatchesScope
          ? companyAllowed.filter(moduleId => canViewModule(moduleId))
          : [];
  const hasPermission = (moduleId: ModuleId, permission: ModulePermission) => {
    if (session.startsWith('company:') && !sectorTestCompanyId) return true;
    if (!accessRoleMatchesScope || !accessRole) return false;
    return roleHasPermission(accessRole, employeeNode, moduleId, permission);
  };
  const hasPresencePermission = (permission: PresencePermission) => {
    if (session.startsWith('company:') && !sectorTestCompanyId) return true;
    if (!accessRoleMatchesScope || !accessRole) return false;
    return employeeHasPresencePermission(accessRole, employeeNode, permission, hasPermission);
  };

  const presenceModule = configuredModules.find(module => module.id === 'presences');
  const selectedPresenceFeatureIds =
    presenceModule && companyAdmin
      ? companySelectedFeatureIds(presenceModule)
      : accessRole && presenceModule
        ? [...getSelectedFeatureIds(accessRole, presenceModule, employeeNode?.moduleFeatures?.[presenceModule.id])]
      : undefined;
  const ecommerceModule = configuredModules.find(module => module.id === 'ecommerce');
  const selectedEcommerceFeatureIds =
    ecommerceModule && companyAdmin
      ? companySelectedFeatureIds(ecommerceModule)
      : accessRole && ecommerceModule
        ? [...getSelectedFeatureIds(accessRole, ecommerceModule, employeeNode?.moduleFeatures?.[ecommerceModule.id])]
        : undefined;
  const sectorManager = Boolean(employee?.isSectorAdmin && employeeNode && accessRole && accessRoleMatchesScope);
  const presenceEmployees = data.employees
    .filter(item => item.companyId === companyId)
    .filter(item => {
      if (!sectorManager || !employeeNode?.id) return true;
      let node = data.orgNodes.find(candidate => candidate.id === item.sectorId && candidate.companyId === companyId);
      while (node) {
        if (node.id === employeeNode.id) return true;
        node = node.parentId
          ? data.orgNodes.find(candidate => candidate.id === node?.parentId && candidate.companyId === companyId)
          : undefined;
      }
      return false;
    });

  const stockModule = configuredModules.find(module => module.id === 'stocks');
  const commerceModule = configuredModules.find(module => module.id === 'commerce');
  const salesModule = configuredModules.find(module => module.id === 'ventes');
  const selectedStockFeatureIds =
    accessRole && stockModule
      ? getSelectedFeatureIds(accessRole, stockModule, employeeNode?.moduleFeatures?.[stockModule.id])
      : undefined;
  const selectedCommerceFeatureIds =
    accessRole && commerceModule
      ? getSelectedFeatureIds(accessRole, commerceModule, employeeNode?.moduleFeatures?.[commerceModule.id])
      : undefined;
  const selectedSalesFeatureIds =
    accessRole && salesModule
      ? getSelectedFeatureIds(accessRole, salesModule, employeeNode?.moduleFeatures?.[salesModule.id])
      : undefined;
  const selectedCommercialTabIds =
    selectedCommerceFeatureIds !== undefined || selectedSalesFeatureIds !== undefined
      ? new Set([
          ...(selectedCommerceFeatureIds ?? []),
          ...[...(selectedSalesFeatureIds ?? [])].flatMap(featureId =>
            featureId === 'devis' || featureId === 'commandes'
              ? ['sales']
              : featureId === 'facturation'
                ? ['invoices']
                : [],
          ),
        ])
      : undefined;
  const stockPermissions = getStockPermissions(accessRole, accessRoleMatchesScope, selectedStockFeatureIds);
  const commerceTabIds = getCommerceTabIds(
    accessRole,
    accessRoleMatchesScope,
    canViewModule,
    selectedCommercialTabIds,
  );
  const sidebarFeatureGroups: SidebarFeatureGroup[] =
    (employee || sectorTestCompanyId) && allowed.length >= 1
      ? buildSidebarFeatureGroups({
          allowed,
          configuredModules,
          employeeRole: accessRole,
          employeeNode,
          companyAdmin,
          selectedFeatureIdsByModule,
          commerceTabIds,
          stockPermissions,
        })
      : [];

  return {
    companyId,
    accessRole,
    employeeNode,
    allowed,
    canViewModule,
    hasPermission,
    hasPresencePermission,
    presenceEmployees,
    selectedPresenceFeatureIds,
    selectedEcommerceFeatureIds,
    stockPermissions,
    commerceTabIds,
    sidebarFeatureGroups,
    verticalModuleNavigation: Boolean(
      (employee || sectorTestCompanyId)
      && allowed.length >= 1
      && sidebarFeatureGroups.length,
    ),
    sectorManager,
    canManagePeople: session.startsWith('company:') || sectorManager,
  };
}