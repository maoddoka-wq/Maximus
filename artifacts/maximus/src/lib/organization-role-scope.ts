import { commerceTabPermissionKeys, type CommerceTabId } from './commerce-permissions';
import { featureSlug, permissionFeatureKey } from './permission-keys';
import { getEffectiveUnitModuleIds } from './organization-module-scope';
import { getModuleFeatureOptions, normalizeModuleFeatureIds } from './module-features';
import type { Module, ModuleId, OrgNode, Role } from './store';

export function getPermissionModuleId(key: string, moduleDefinitions: Module[]) {
  return moduleDefinitions.find(module =>
    key === module.id
    || key.startsWith(`${module.id}:`)
    || (module.id === 'presences' && key.startsWith('presence.')),
  )?.id;
}

export function getUnitFeatureIds(node: OrgNode | undefined, module: Module): Set<string> | undefined {
  const selectedFeatureIds = node?.moduleFeatures?.[module.id];
  if (!Array.isArray(selectedFeatureIds)) return undefined;

  return new Set(normalizeModuleFeatureIds(module, selectedFeatureIds));
}

function getPermissionFeatureId(key: string, module: Module) {
  return getModuleFeatureOptions(module).find(feature => {
    if (module.id === 'commerce') {
      return commerceTabPermissionKeys(feature.id as CommerceTabId).includes(key);
    }
    if (module.id === 'presences') {
      return key === `presence.${featureSlug(feature.id)}`;
    }
    if (module.id === 'stocks') {
      return key === `stocks:${feature.id}`;
    }
    return key === permissionFeatureKey(module.id, feature.id);
  })?.id;
}

export function restrictRoleToUnitScope(
  role: Role,
  node: OrgNode | undefined,
  nodes: OrgNode[],
  moduleDefinitions: Module[],
) {
  const allowedModuleIds = getEffectiveUnitModuleIds(nodes, node);
  const moduleById = new Map(moduleDefinitions.map(module => [module.id, module]));
  const modulePermissions = Object.fromEntries(
    Object.entries(role.modulePermissions).filter(([key]) => {
      const moduleId = getPermissionModuleId(key, moduleDefinitions);
      if (!moduleId) return !allowedModuleIds;
      if (allowedModuleIds && !allowedModuleIds.has(moduleId)) return false;

      const module = moduleById.get(moduleId);
      const selectedFeatureIds = module && getUnitFeatureIds(node, module);
      if (!module || !selectedFeatureIds) return true;

      const featureId = getPermissionFeatureId(key, module);
      return Boolean(featureId && selectedFeatureIds.has(featureId));
    }),
  );

  return { ...role, modulePermissions };
}

export function getModuleIdForRolePermission(
  key: string,
  moduleDefinitions: Module[],
): ModuleId | undefined {
  return getPermissionModuleId(key, moduleDefinitions);
}