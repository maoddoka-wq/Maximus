import { commerceTabDefinitions, commerceTabPermissionKeys } from './commerce-permissions';
import { getModuleFeatureOptions } from './module-features';
import { permissionFeatureKey } from './permission-keys';
import { normalizePermissionLadder } from './permission-ladder';
import {
  getConfiguredModules,
  type Company,
  type Module,
  type ModuleFeaturePack,
  type ModuleId,
  type OrgNode,
  type Role,
  type StoreData,
} from './store';

function featurePermissionKeys(module: Module, featureId: string) {
  if (module.id === 'commerce') return commerceTabPermissionKeys(featureId as never);
  if (module.id === 'stocks') return [`stocks:${featureId}`];
  if (module.id === 'presences') return [`presence.${featureId}`];
  return [permissionFeatureKey(module.id, featureId)];
}

function featureIdsForModule(module: Module) {
  if (module.id === 'commerce') {
    return commerceTabDefinitions.map(feature => feature.id);
  }
  if (module.id === 'stocks') {
    return ['dashboard', 'products', 'entries', 'exits', 'requests', 'inventory', 'reports', 'references', 'users', 'settings'];
  }
  return getModuleFeatureOptions(module).map(feature => feature.id);
}

function defaultFeaturePermissions(pack: ModuleFeaturePack, featureId: string) {
  return [...new Set(['voir', ...(pack.featurePermissions?.[featureId] ?? [])])];
}

function buildPackRolePermissions(
  company: Company,
  module: Module,
  pack: ModuleFeaturePack,
  selectedFeatureIds: string[],
  previousPermissions: Record<string, string[]> = {},
) {
  const hasRequestedFeatureLimit = Object.prototype.hasOwnProperty.call(
    company.requestedModuleFeatures ?? {},
    module.id,
  );
  const requestedModulePermissions = company.requestedModulePermissions?.[module.id];
  const hasRequestedPermissionLimit = Object.prototype.hasOwnProperty.call(
    company.requestedModulePermissions ?? {},
    module.id,
  );
  const companyFeatureIds = hasRequestedFeatureLimit
    ? new Set(company.requestedModuleFeatures?.[module.id] ?? [])
    : hasRequestedPermissionLimit
      ? new Set(
          Object.keys(requestedModulePermissions ?? {})
            .map(featureId => featureId.startsWith(`${module.id}:menu:`)
              ? featureId.slice(`${module.id}:menu:`.length)
              : featureId),
        )
      : null;
  const packFeatureIds = new Set(pack.featureIds);
  const validFeatureIds = new Set(featureIdsForModule(module));
  const selected = new Set(
    selectedFeatureIds.filter(featureId =>
      packFeatureIds.has(featureId)
      && validFeatureIds.has(featureId)
      && (!companyFeatureIds || companyFeatureIds.has(featureId)),
    ),
  );
  const permissions: Record<string, string[]> = {};

  [...selected].forEach(featureId => {
    const keys = featurePermissionKeys(module, featureId);
    const packMaximum = defaultFeaturePermissions(pack, featureId);
    const requestedActions =
      requestedModulePermissions?.[featureId]
      ?? requestedModulePermissions?.[`${module.id}:menu:${featureId}`];
    const companyMaximum = requestedActions !== undefined
      ? requestedActions
      : hasRequestedFeatureLimit || hasRequestedPermissionLimit
        ? ['voir']
        : packMaximum;
    const previous = keys.flatMap(key => previousPermissions[key] ?? []);
    const preferred = previous.length > 0
      ? previous
      : requestedActions !== undefined
        ? requestedActions
        : packMaximum;
    const next = normalizePermissionLadder(
      [...new Set(preferred)].filter(permission => companyMaximum.includes(permission)),
    );

    if (next.length > 0) permissions[keys[0]] = next;
  });

  return permissions;
}

function automaticRoleId(nodeId: string, moduleId: ModuleId, packId: string) {
  return `pack-role-${nodeId}-${moduleId}-${packId}`;
}

function samePackRole(role: Role, node: OrgNode, moduleId: ModuleId, packId: string) {
  return role.companyId === node.companyId
    && role.sectorId === node.id
    && role.packId === packId
    && role.packModuleId === moduleId;
}

function hasRoleAssignment(data: StoreData, company: Company | undefined, roleId: string) {
  return data.employees.some(employee => employee.roleId === roleId) || company?.managerRoleId === roleId;
}

export function synchronizeUnitPackRoles(
  data: StoreData,
  company: Company,
  node: OrgNode,
  options: { cleanupDeselectedRoles?: boolean } = {},
) {
  const modules = getConfiguredModules(data);
  const desiredRoleKeys = new Set<string>();
  const canonicalRoleIds = new Map<string, string>();
  const selectedPackIds = node.modulePackIds ?? {};

  Object.entries(selectedPackIds).forEach(([moduleId, packIds]) => {
    const module = modules.find(candidate => candidate.id === moduleId);
    if (!module) return;
    [...new Set(packIds ?? [])].forEach(packId => {
      const pack = module.featurePacks?.find(candidate => candidate.id === packId);
      if (!pack) return;

      const roleKey = `${module.id}:${pack.id}`;
      desiredRoleKeys.add(roleKey);
      const matchingRoles = data.roles.filter(role => samePackRole(role, node, module.id, pack.id));
      const expectedRoleId = automaticRoleId(node.id, module.id, pack.id);
      const existingRole = matchingRoles.find(role => role.id === expectedRoleId) ?? matchingRoles[0];
      const roleIndex = existingRole ? data.roles.findIndex(role => role.id === existingRole.id) : -1;
      const selectedFeatureIds = node.moduleFeatures?.[module.id] ?? pack.featureIds;
      const nextRole: Role = {
        id: existingRole?.id ?? expectedRoleId,
        companyId: node.companyId,
        sectorId: node.id,
        name: pack.name,
        description: existingRole?.description || pack.description || `Rôle prérempli depuis le pack « ${pack.name} ».`,
        modulePermissions: buildPackRolePermissions(company, module, pack, selectedFeatureIds, existingRole?.modulePermissions),
        packId: pack.id,
        packModuleId: module.id,
      };

      if (roleIndex === -1) data.roles.push(nextRole);
      else data.roles[roleIndex] = nextRole;
      canonicalRoleIds.set(roleKey, nextRole.id);
    });
  });

  if (options.cleanupDeselectedRoles === false) return;

  data.roles = data.roles.filter(role => {
    if (role.companyId !== node.companyId || role.sectorId !== node.id || !role.packId || !role.packModuleId) return true;
    const roleKey = `${role.packModuleId}:${role.packId}`;
    if (desiredRoleKeys.has(roleKey) && canonicalRoleIds.get(roleKey) === role.id) return true;
    if (hasRoleAssignment(data, company, role.id)) {
      delete role.packId;
      delete role.packModuleId;
      return true;
    }
    return false;
  });
}

/**
 * Repairs only roles for packs that are still selected. This is safe to run
 * before employee-role selection without deleting or demoting stale roles.
 */
export function synchronizeSelectedPackRolesForCompany(
  data: StoreData,
  company: Company,
  nodeIds: string[],
) {
  const selectedNodeIds = new Set(nodeIds);
  data.orgNodes
    .filter(node => node.companyId === company.id && selectedNodeIds.has(node.id))
    .forEach(node => {
      const hasSelectedPacks = Object.values(node.modulePackIds ?? {})
        .some(packIds => Array.isArray(packIds) && packIds.length > 0);
      if (!hasSelectedPacks) return;
      synchronizeUnitPackRoles(data, company, node, { cleanupDeselectedRoles: false });
    });
}