import { commerceTabDefinitions, commerceTabPermissionKeys } from './commerce-permissions';
import { getModuleFeatureOptions } from './module-features';
import { permissionFeatureKey } from './permission-keys';
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

function isFeaturePermissionKey(module: Module, key: string) {
  if (module.id === 'commerce') return key.startsWith('commerce:menu:');
  if (module.id === 'stocks') return key.startsWith('stocks:');
  if (module.id === 'presences') return key.startsWith('presence.');
  return key.startsWith(`${module.id}:menu:`);
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
  const selected = new Set(selectedFeatureIds);
  const permissions = Object.fromEntries(
    Object.entries(previousPermissions).filter(([key]) => !isFeaturePermissionKey(module, key) && key !== module.id),
  );

  if (selected.size === 0) return permissions;

  [...selected]
    .filter(featureId => featureIdsForModule(module).includes(featureId))
    .forEach(featureId => {
      const keys = featurePermissionKeys(module, featureId);
      const previous = keys.flatMap(key => previousPermissions[key] ?? []);
      const next = previous.length > 0
        ? [...new Set(['voir', ...previous])]
        : company.requestedModulePermissions?.[module.id]?.[featureId]?.length
          ? [...new Set(company.requestedModulePermissions[module.id]![featureId]!)]
          : defaultFeaturePermissions(pack, featureId);
      keys.forEach(key => { delete permissions[key]; });
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

export function synchronizeUnitPackRoles(data: StoreData, company: Company, node: OrgNode) {
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