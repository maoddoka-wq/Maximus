import type { Company, Employee, ModuleId, OrgNode, Role } from './store';
import {
  commerceTabDefinitions,
  commerceTabPermissionKeys,
  hasCommerceTabPermission,
  hasDetailedCommercePermissions,
  type CommerceTabId,
} from './commerce-permissions';
import { featureSlug, permissionFeatureKey } from './permission-keys';
import { getModuleFeatureOptions, normalizeModuleFeatureIds } from './module-features';
import { stockSubmodules, type Module } from './store';

export type ModulePermission = 'voir' | 'créer' | 'modifier';
export type PresencePermission = 'view' | 'create' | 'edit' | 'delete' | 'correct' | 'validate' | 'manage' | 'export' | 'reports';
const presenceOperationalPermissions = new Set<PresencePermission>([
  'view',
  'create',
  'edit',
  'delete',
  'correct',
  'validate',
  'manage',
  'export',
  'reports',
]);

function permissionModuleId(key: string): ModuleId | null {
  if (key.startsWith('presence.')) return 'presences';
  const [moduleId] = key.split(':');
  return moduleId as ModuleId;
}

function permissionFeatureId(moduleId: ModuleId, key: string) {
  if (moduleId === 'presences') return key.replace(/^presence\./, '');
  const menuMarker = `${moduleId}:menu:`;
  if (key.startsWith(menuMarker)) return key.slice(menuMarker.length);
  return key.startsWith(`${moduleId}:`) ? key.slice(moduleId.length + 1) : key;
}

/**
 * Company selections are the maximum entitlement. Units and roles can narrow
 * those permissions, but cannot grant an unrequested module, feature, or action.
 * Companies without the newer detailed request data keep the legacy behavior.
 */
export function restrictRoleToCompany(role: Role | null | undefined, company: Company | null | undefined): Role | null {
  if (!role || !company) return role ?? null;
  const requestedFeatures = company.requestedModuleFeatures;
  const requestedPermissions = company.requestedModulePermissions;
  if (!requestedFeatures && !requestedPermissions) return role;

  const enabledModules = new Set(company.allowedModules.length ? company.allowedModules : company.requestedModules);
  const hasFeatureLimit = (moduleId: ModuleId) => Object.prototype.hasOwnProperty.call(requestedFeatures ?? {}, moduleId);
  const featureIds = (moduleId: ModuleId) => new Set(requestedFeatures?.[moduleId] ?? []);
  const featurePermissions = (moduleId: ModuleId, featureId: string) =>
    requestedPermissions?.[moduleId]?.[featureId]
    ?? requestedPermissions?.[moduleId]?.[featureId.replace(`${moduleId}:menu:`, '')]
    ?? ['voir'];

  const boundedEntries: [string, string[]][] = [];
  Object.entries(role.modulePermissions).forEach(([key, permissions]) => {
    const moduleId = permissionModuleId(key);
    if (!moduleId || (enabledModules.size > 0 && !enabledModules.has(moduleId))) return;
    if (!hasFeatureLimit(moduleId)) {
      boundedEntries.push([key, permissions]);
      return;
    }
    if (key === moduleId) {
      const hasPermissionLimit = Object.prototype.hasOwnProperty.call(requestedPermissions ?? {}, moduleId);
      const allowedModulePermissions = hasPermissionLimit
        ? new Set(Object.values(requestedPermissions?.[moduleId] ?? {}).flat())
        : new Set(['voir']);
      const filtered = permissions.filter(permission => allowedModulePermissions.has(permission));
      if (filtered.length && featureIds(moduleId).size > 0) boundedEntries.push([key, filtered]);
      return;
    }
    const featureId = permissionFeatureId(moduleId, key);
    if (!featureIds(moduleId).has(featureId)) return;
    const allowed = new Set(featurePermissions(moduleId, featureId));
    const filtered = permissions.filter(permission => allowed.has(permission));
    if (filtered.length) boundedEntries.push([key, filtered]);
  });
  const modulePermissions = Object.fromEntries(boundedEntries);

  return { ...role, modulePermissions };
}

export function getEmployeeAncestry(nodes: OrgNode[], employeeNode: OrgNode | null) {
  const ancestry = new Set<string>();
  let currentNode: OrgNode | undefined = employeeNode ?? undefined;

  while (currentNode) {
    ancestry.add(currentNode.id);
    currentNode = currentNode.parentId
      ? nodes.find(node => node.id === currentNode?.parentId)
      : undefined;
  }

  return ancestry;
}

export function employeeRoleMatchesUnit(
  role: Role | null | undefined,
  employee: Employee | null,
  employeeAncestry: Set<string>,
) {
  return Boolean(
    role?.sectorId
    && employeeAncestry.has(role.sectorId)
    && role.companyId === employee?.companyId,
  );
}

export function unitAllowsModule(employeeNode: OrgNode | null | undefined, moduleId: ModuleId) {
  return !employeeNode
    || employeeNode.moduleIds === undefined
    || employeeNode.moduleIds.includes(moduleId);
}

export function roleHasPermission(
  role: Role | null | undefined,
  employeeNode: OrgNode | null | undefined,
  moduleId: ModuleId,
  permission: ModulePermission,
) {
  if (!role || !unitAllowsModule(employeeNode, moduleId)) return false;

  if (role.modulePermissions[moduleId]?.includes(permission)) {
    return true;
  }

  const detailedPrefix = moduleId === 'presences' ? 'presence.' : `${moduleId}:`;
  return Object.entries(role.modulePermissions)
    .filter(([key]) => key.startsWith(detailedPrefix))
    .some(([, permissions]) => permissions.includes(permission));
}

export function roleHasFeaturePermission(
  role: Role | null | undefined,
  employeeNode: OrgNode | null | undefined,
  moduleId: ModuleId,
  featureId: string,
  permission: ModulePermission,
) {
  if (!role || !unitAllowsModule(employeeNode, moduleId)) return false;
  const featurePrefix = moduleId === 'presences' ? 'presence.' : `${moduleId}:menu:`;
  const hasDetailedPermissions = Object.keys(role.modulePermissions)
    .some(key => key.startsWith(featurePrefix)
      && (moduleId !== 'presences'
        || !presenceOperationalPermissions.has(key.slice(featurePrefix.length) as PresencePermission)));
  if (!hasDetailedPermissions) {
    if (moduleId === 'presences') {
      return false;
    }
    return role.modulePermissions[moduleId]?.includes(permission) ?? false;
  }

  const featureKey = moduleId === 'presences'
    ? `presence.${featureSlug(featureId)}`
    : permissionFeatureKey(moduleId, featureId);
  return role.modulePermissions[featureKey]?.includes(permission) ?? false;
}

/**
 * Returns the complete action set for one feature. A detailed permission entry
 * always wins over the module-level entry; the latter is only a legacy
 * fallback for roles that predate feature permissions.
 */
export function getFeaturePermissions(
  role: Role | null | undefined,
  employeeNode: OrgNode | null | undefined,
  moduleId: ModuleId,
  featureId: string,
) {
  if (!role || !unitAllowsModule(employeeNode, moduleId)) return [];

  const keys = moduleId === 'commerce'
    ? commerceTabPermissionKeys(featureId as CommerceTabId)
    : moduleId === 'stocks'
      ? [`stocks:${featureId}`]
      : moduleId === 'presences'
        ? [`presence.${featureSlug(featureId)}`]
        : [permissionFeatureKey(moduleId, featureId)];
  const detailedKey = keys.find(key => Object.prototype.hasOwnProperty.call(role.modulePermissions, key));
  if (detailedKey) {
    return [...new Set(role.modulePermissions[detailedKey] ?? [])];
  }
  if (moduleId === 'presences') return [];
  return [...(role.modulePermissions[moduleId] ?? [])];
}

export function employeeHasPresencePermission(
  role: Role | null | undefined,
  employeeNode: OrgNode | null | undefined,
  permission: PresencePermission,
  hasPermission: (moduleId: ModuleId, action: ModulePermission) => boolean,
) {
  if (!role || !unitAllowsModule(employeeNode, 'presences')) return false;

  const explicitPermission = role.modulePermissions[`presence.${permission}`];
  const operationalPermissions: PresencePermission[] = ['view', 'create', 'edit', 'delete', 'correct', 'validate', 'manage', 'export', 'reports'];
  const hasExplicitPermissions = operationalPermissions.some(key => Object.prototype.hasOwnProperty.call(role.modulePermissions, `presence.${key}`));

  if (hasExplicitPermissions) {
    return Boolean(explicitPermission?.length);
  }

  if (permission === 'view') return hasPermission('presences', 'voir');
  if (permission === 'create') return hasPermission('presences', 'créer');
  return hasPermission('presences', 'modifier');
}

export function getStockPermissions(
  role: Role | null | undefined,
  roleFitsEmployee: boolean,
  selectedFeatureIds?: Iterable<string>,
) {
  if (!role || !roleFitsEmployee) return undefined;

  const selected = selectedFeatureIds ? new Set(selectedFeatureIds) : undefined;
  const detailed = stockSubmodules
    .map(submodule => [submodule.id, role.modulePermissions[`stocks:${submodule.id}`]] as const)
    .filter(([featureId, permissions]) => permissions && (!selected || selected.has(featureId)));
  const rootPermissions = role.modulePermissions.stocks;

  const permissions = Object.fromEntries(
    detailed.length > 0
      ? detailed
      : (selected
        ? [...selected]
          .filter(featureId => stockSubmodules.some(submodule => submodule.id === featureId))
          .map(featureId => [featureId, rootPermissions] as const)
        : stockSubmodules.map(submodule => [submodule.id, rootPermissions] as const)
      ).filter(([, permissions]) => permissions),
  ) as Record<string, string[]>;

  if (detailed.length === 0) return permissions;
  if (selected) {
    Object.keys(permissions).forEach(featureId => {
      permissions[featureId] = [...new Set(['voir', ...permissions[featureId]])];
    });
    return permissions;
  }

  stockSubmodules.forEach(submodule => {
    if (!(permissions[submodule.id] ?? []).length) return;
    permissions[submodule.id] = [...new Set(['voir', ...permissions[submodule.id]])];
  });

  return permissions;
}

export function getCommerceTabIds(
  role: Role | null | undefined,
  roleFitsEmployee: boolean,
  canViewModule: (moduleId: ModuleId) => boolean,
  selectedFeatureIds?: Iterable<string>,
) {
  if (!role || !roleFitsEmployee) return undefined;

  const allowedTabIds = new Set<CommerceTabId>();
  const selected = selectedFeatureIds ? new Set(selectedFeatureIds) : undefined;
  const permissions = role.modulePermissions;
  const canViewCommerce = canViewModule('commerce');
  const hasCommerceDetails = hasDetailedCommercePermissions(permissions);

  if (canViewCommerce) {
    commerceTabDefinitions.forEach(tab => {
      if ((!selected || selected.has(tab.id)) && (!hasCommerceDetails || hasCommerceTabPermission(permissions, tab.id))) {
        allowedTabIds.add(tab.id);
      }
    });
  }

  const canViewSales = canViewModule('ventes');
  const salesFeatureKeys = [
    'ventes:menu:devis',
    'ventes:menu:commandes',
    'ventes:menu:facturation',
  ];
  const hasSalesDetails = salesFeatureKeys.some(key => key in permissions);

  if (canViewSales) {
    if (!hasSalesDetails) {
      if (!selected || selected.has('sales')) allowedTabIds.add('sales');
      if (!selected || selected.has('invoices')) allowedTabIds.add('invoices');
    } else {
      if ((!selected || selected.has('sales')) && (permissions['ventes:menu:devis']?.includes('voir')
        || permissions['ventes:menu:commandes']?.includes('voir'))) {
        allowedTabIds.add('sales');
      }
      if ((!selected || selected.has('invoices')) && permissions['ventes:menu:facturation']?.includes('voir')) {
        allowedTabIds.add('invoices');
      }
    }
  }

  return [...allowedTabIds];
}

export function getSelectedFeatureIds(
  role: Role | null | undefined,
  module: Module,
  explicitFeatureIds?: Iterable<string>,
) {
  if (!role) return new Set<string>();

  const featureIds = getModuleFeatureOptions(module).map(feature => feature.id);
  const validFeatureIds = new Set(featureIds);
  const packFeatureIds = role.packId && role.packModuleId === module.id
    ? new Set(
      module.featurePacks
        ?.find(candidate => candidate.id === role.packId)
        ?.featureIds
        .filter(featureId => validFeatureIds.has(featureId)) ?? [],
    )
    : null;
  if (explicitFeatureIds) {
    const selected = normalizeModuleFeatureIds(module, explicitFeatureIds)
      .filter(featureId => validFeatureIds.has(featureId));
    return packFeatureIds
      ? new Set(selected.filter(featureId => packFeatureIds.has(featureId)))
      : new Set(selected);
  }
  if (packFeatureIds) {
    return packFeatureIds;
  }
  const permissionKeyFor = (featureId: string) =>
    module.id === 'presences' ? `presence.${featureId}` : permissionFeatureKey(module.id, featureId);
  const hasDetailedPermissions = featureIds.some(featureId => permissionKeyFor(featureId) in role.modulePermissions);

  if (module.id === 'presences' && !hasDetailedPermissions) {
    return new Set<string>();
  }
  if (!hasDetailedPermissions && role.modulePermissions[module.id]?.includes('voir')) {
    return new Set(featureIds);
  }

  return new Set(
    featureIds.filter(featureId => (role.modulePermissions[permissionKeyFor(featureId)] ?? []).includes('voir')),
  );
}