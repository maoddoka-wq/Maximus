import type { Company, Employee, ModuleAvailability, ModuleId, OrgNode, Role, StoreData } from './store';
import type { Session, SidebarFeatureGroup } from './navigation';
import {
  employeeHasPresencePermission,
  canHandleCompanyApprovals,
  canManageTechnicalAdministration,
  canViewCompanyReports,
  employeeRoleMatchesUnit,
  getCommerceTabIds,
  getEmployeeAncestry,
  getSelectedFeatureIds,
  getStockPermissions,
  restrictRoleToCompany,
  roleHasFeaturePermission,
  roleHasPermission,
  roleHasResponsibility,
  type ModulePermission,
  type PresencePermission,
} from './employee-permissions';
import { getConfiguredModules } from './store';
import { getModuleFeatureOptions } from './module-features';
import { buildSidebarFeatureGroups } from './sidebar-navigation';
import type { ServerModuleAccess } from './module-api';

export type AppAccessInput = {
  data: StoreData;
  session: Session;
  employee: Employee | null;
  activeCompanyId?: string;
  activeCompany?: Company;
  sectorTestCompanyId: string | null;
  serverModuleStatuses: Record<string, ModuleAvailability> | null;
  serverModuleAccess?: ServerModuleAccess[] | null;
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
  selectedPayrollFeatureIds?: string[];
  selectedTransportFeatureIds?: string[];
  transportFeaturePermissions?: Record<string, { canCreate: boolean; canModify: boolean }>;
  stockPermissions?: Record<string, string[]>;
  commerceTabIds?: string[];
  sidebarFeatureGroups: SidebarFeatureGroup[];
  verticalModuleNavigation: boolean;
  sectorManager: boolean;
  canManagePeople: boolean;
  technicalAdmin: boolean;
  generalManagement: boolean;
  canManageAccess: boolean;
  canViewReports: boolean;
  canHandleApprovals: boolean;
};

export function buildAppAccessContext({
  data,
  session,
  employee,
  activeCompanyId,
  activeCompany,
  sectorTestCompanyId,
  serverModuleStatuses,
  serverModuleAccess = null,
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
    serverModuleAccess?.find((item) => item.id === moduleId)?.status ??
    serverModuleStatuses?.[moduleId] ??
    data.moduleStatuses?.[moduleId] ??
    configuredModules.find(module => module.id === moduleId)?.status ??
    'INACTIF';
  const isModuleActive = (moduleId: ModuleId) => !['INACTIF', 'MAINTENANCE'].includes(moduleStatus(moduleId));
  const localCompanyAllowed = data.companies.find(company => company.id === companyId)?.allowedModules ?? [];
  const companyAllowed = (sectorTestCompanyId || serverModuleAccessReady ? localCompanyAllowed : [])
    .filter(isModuleActive);
  const companyAdmin = session.startsWith('company:') && !sectorTestCompanyId;
  let workspaceAdmin = companyAdmin;
  const keepCompanySettings = (
    module: NonNullable<typeof configuredModules[number]>,
    featureIds: string[],
    preserveAdminSettings = true,
  ) =>
    preserveAdminSettings && module.id === 'ecommerce' && workspaceAdmin
      ? [...new Set([...featureIds, 'parametres'])]
      : featureIds;
  const companySelectedFeatureIds = (module: NonNullable<typeof configuredModules[number]>) => {
    if (!workspaceAdmin || !activeCompany) return undefined;

    const serverAccess = serverModuleAccess?.find((item) => item.id === module.id);
    const serverConfiguration = serverAccess?.configuration;
    const serverFeatureIds = serverAccess?.featureIds;
    const hasExplicitServerSelection =
      Array.isArray(serverFeatureIds)
      && (serverFeatureIds.length > 0 || serverConfiguration?.featureScope === 'explicit');
    const selectedPackIds = activeCompany.requestedModulePackIds?.[module.id] ?? [];
    if (selectedPackIds.length > 0) {
      const packFeatures = [
        ...new Set(
          (module.featurePacks ?? [])
            .filter(pack => selectedPackIds.includes(pack.id))
            .flatMap(pack => pack.featureIds),
        ),
      ];
      return keepCompanySettings(
        module,
        hasExplicitServerSelection
          ? serverFeatureIds ?? []
          : packFeatures,
        !hasExplicitServerSelection,
      );
    }

    if (hasExplicitServerSelection) {
      return keepCompanySettings(module, serverFeatureIds ?? [], false);
    }

    const requestedFeatures = activeCompany.requestedModuleFeatures;
    if (!requestedFeatures || !Object.prototype.hasOwnProperty.call(requestedFeatures, module.id)) {
      // Comme les autres modules, un module autorisé sans sélection détaillée
      // expose ses fonctionnalités configurées. Une sélection explicite reste
      // respectée lorsqu’elle existe.
      return undefined;
    }

    const validFeatureIds = new Set(getModuleFeatureOptions(module).map(feature => feature.id));
    return keepCompanySettings(module, [
      ...new Set((requestedFeatures[module.id] ?? []).filter(featureId => validFeatureIds.has(featureId))),
    ]);
  };
  const companyFeatureCeiling = (module: NonNullable<typeof configuredModules[number]>) => {
    if (!activeCompany) return undefined;

    const serverAccess = serverModuleAccess?.find((item) => item.id === module.id);
    const serverConfiguration = serverAccess?.configuration;
    const serverFeatureIds = serverAccess?.featureIds;
    const hasExplicitServerSelection =
      Array.isArray(serverFeatureIds)
      && (serverFeatureIds.length > 0 || serverConfiguration?.featureScope === 'explicit');
    if (hasExplicitServerSelection) {
      return new Set(serverFeatureIds ?? []);
    }

    const selectedPackIds = activeCompany.requestedModulePackIds?.[module.id] ?? [];
    if (selectedPackIds.length > 0) {
      return new Set(
        (module.featurePacks ?? [])
          .filter(pack => selectedPackIds.includes(pack.id))
          .flatMap(pack => pack.featureIds),
      );
    }

    const requestedFeatures = activeCompany.requestedModuleFeatures;
    if (!requestedFeatures || !Object.prototype.hasOwnProperty.call(requestedFeatures, module.id)) {
      return undefined;
    }
    return new Set(requestedFeatures[module.id] ?? []);
  };
  const employeeNode = employee?.sectorId
    ? data.orgNodes.find(node => node.id === employee.sectorId && node.companyId === employee.companyId) ?? null
    : sectorTestCompanyId && accessRole?.sectorId
      ? data.orgNodes.find(node => node.id === accessRole.sectorId && node.companyId === companyId) ?? null
      : null;
  const employeeAncestry = getEmployeeAncestry(data.orgNodes, employeeNode);
  const accessRoleMatchesScope = sectorTestCompanyId
    ? Boolean(accessRole && employeeNode && accessRole.companyId === companyId && accessRole.sectorId === employeeNode.id)
    : employeeRoleMatchesUnit(accessRole, employee, employeeAncestry);
  const technicalAdmin = canManageTechnicalAdministration(accessRole, companyAdmin, accessRoleMatchesScope);
  workspaceAdmin = companyAdmin || technicalAdmin;
  const selectedFeatureIdsByModule = Object.fromEntries(
    configuredModules
      .map(module => [module.id, companySelectedFeatureIds(module)] as const)
      .filter(([, featureIds]) => featureIds !== undefined),
  ) as Partial<Record<ModuleId, string[]>>;
  const canViewModule = (moduleId: ModuleId) =>
    workspaceAdmin && !sectorTestCompanyId
      ? true
      : roleHasPermission(accessRole, employeeNode, moduleId, 'voir');
  const allowed =
    workspaceAdmin && !sectorTestCompanyId
      ? companyAllowed
      : sectorTestCompanyId && accessRole && accessRoleMatchesScope
        ? companyAllowed.filter(moduleId => canViewModule(moduleId))
        : accessRole && accessRoleMatchesScope
          ? companyAllowed.filter(moduleId => canViewModule(moduleId))
          : [];
  const hasPermission = (moduleId: ModuleId, permission: ModulePermission) => {
    if (workspaceAdmin && !sectorTestCompanyId) return true;
    if (!accessRoleMatchesScope || !accessRole) return false;
    return roleHasPermission(accessRole, employeeNode, moduleId, permission);
  };
  const hasPresencePermission = (permission: PresencePermission) => {
    if (workspaceAdmin && !sectorTestCompanyId) return true;
    if (!accessRoleMatchesScope || !accessRole) return false;
    return employeeHasPresencePermission(accessRole, employeeNode, permission, hasPermission);
  };

  const presenceModule = configuredModules.find(module => module.id === 'presences');
  const selectedPresenceFeatureIds =
    presenceModule && workspaceAdmin
      ? companySelectedFeatureIds(presenceModule)
      : accessRole && presenceModule
        ? [...getSelectedFeatureIds(accessRole, presenceModule, employeeNode?.moduleFeatures?.[presenceModule.id])]
      : undefined;
  const ecommerceModule = configuredModules.find(module => module.id === 'ecommerce');
  const selectedEcommerceFeatureIds =
    ecommerceModule && workspaceAdmin
      ? companySelectedFeatureIds(ecommerceModule)
      : accessRole && ecommerceModule
        ? [...getSelectedFeatureIds(accessRole, ecommerceModule, employeeNode?.moduleFeatures?.[ecommerceModule.id])]
        : undefined;
  const payrollModule = configuredModules.find(module => module.id === 'paie');
  const selectedPayrollFeatureIds =
    payrollModule && workspaceAdmin
      ? companySelectedFeatureIds(payrollModule)
      : accessRole && payrollModule
        ? [...getSelectedFeatureIds(accessRole, payrollModule, employeeNode?.moduleFeatures?.[payrollModule.id])]
        : undefined;
  const transportModule = configuredModules.find(module => module.id === 'transport');
  const selectedTransportFeatureIds =
    transportModule && workspaceAdmin
      ? companySelectedFeatureIds(transportModule)
      : accessRole && transportModule
        ? [...getSelectedFeatureIds(accessRole, transportModule, employeeNode?.moduleFeatures?.[transportModule.id])]
          .filter(featureId => {
            const ceiling = companyFeatureCeiling(transportModule);
            return (!ceiling || ceiling.has(featureId))
              && roleHasFeaturePermission(accessRole, employeeNode, transportModule.id, featureId, 'voir');
          })
        : undefined;
  const transportFeaturePermissions = transportModule
    ? Object.fromEntries(
      getModuleFeatureOptions(transportModule).map(feature => [
        feature.id,
        {
          canCreate: workspaceAdmin || roleHasFeaturePermission(accessRole, employeeNode, transportModule.id, feature.id, 'créer'),
          canModify: workspaceAdmin || roleHasFeaturePermission(accessRole, employeeNode, transportModule.id, feature.id, 'modifier'),
        },
      ]),
    )
    : undefined;
  const sectorManager = Boolean(
    employeeNode
    && accessRole
    && accessRoleMatchesScope
    && roleHasResponsibility(accessRole, 'unit_manager'),
  );
  const generalManagement = canViewCompanyReports(accessRole, companyAdmin, accessRoleMatchesScope) || technicalAdmin;
  const canManageAccess = workspaceAdmin;
  const canViewReports = generalManagement;
  const canHandleApprovals = canHandleCompanyApprovals(accessRole, companyAdmin, accessRoleMatchesScope) || technicalAdmin;
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
    workspaceAdmin
      ? undefined
      : accessRole && stockModule
      ? getSelectedFeatureIds(accessRole, stockModule, employeeNode?.moduleFeatures?.[stockModule.id])
      : undefined;
  const selectedCommerceFeatureIds =
    workspaceAdmin
      ? undefined
      : accessRole && commerceModule
      ? getSelectedFeatureIds(accessRole, commerceModule, employeeNode?.moduleFeatures?.[commerceModule.id])
      : undefined;
  const selectedSalesFeatureIds =
    workspaceAdmin
      ? undefined
      : accessRole && salesModule
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
    (employee || sectorTestCompanyId || workspaceAdmin) && allowed.length >= 1
      ? buildSidebarFeatureGroups({
          allowed,
          configuredModules,
          employeeRole: accessRole,
          employeeNode,
          companyAdmin: workspaceAdmin,
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
    selectedPayrollFeatureIds,
    selectedTransportFeatureIds,
    transportFeaturePermissions,
    stockPermissions,
    commerceTabIds,
    sidebarFeatureGroups,
    verticalModuleNavigation: Boolean(
      (employee || sectorTestCompanyId || companyAdmin)
      && allowed.length >= 1
      && sidebarFeatureGroups.length,
    ),
    sectorManager,
      canManagePeople: workspaceAdmin || sectorManager,
    technicalAdmin,
    generalManagement,
    canManageAccess,
    canViewReports,
    canHandleApprovals,
  };
}