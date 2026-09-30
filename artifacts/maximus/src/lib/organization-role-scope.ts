import { commerceTabPermissionKeys, type CommerceTabId } from './commerce-permissions';
import { featureSlug, permissionFeatureKey } from './permission-keys';
import { getEffectiveUnitModuleIds } from './organization-module-scope';
import { getModuleFeatureOptions, normalizeModuleFeatureIds } from './module-features';
import type { Module, ModuleId, OrgNode, Role } from './store';

export function getPermissionModuleId(key: string, moduleDefinitions: Module[]) {
  return moduleDefinitions.find(module =>
    key === module.id
    || key.startsWith(`${module.id}:`)
    || (module.id === 'presences' && key.startsWith('presence.'))
    || (module.id === 'commerce' && getModuleFeatureOptions(module).some(feature =>
      commerceTabPermissionKeys(feature.id as CommerceTabId).includes(key),
    )),
  )?.id;
}

export function getUnitFeatureIds(node: OrgNode | undefined, module: Module): Set<string> | undefined {
  const selectedFeatureIds = node?.moduleFeatures?.[module.id];
  if (!Array.isArray(selectedFeatureIds)) return undefined;

  return new Set(normalizeModuleFeatureIds(module, selectedFeatureIds));
}

export function getRolePermissionFeatureId(key: string, module: Module) {
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

function unitHasExplicitFeatureScope(node: OrgNode | undefined, module: Module, nodes: OrgNode[]) {
  const visited = new Set<string>();
  let current = node;

  while (current) {
    if (visited.has(current.id)) return true;
    visited.add(current.id);
    if (Object.prototype.hasOwnProperty.call(current.moduleFeatures ?? {}, module.id)) return true;
    current = current.parentId
      ? nodes.find(candidate =>
          candidate.id === current?.parentId
          && candidate.companyId === current?.companyId,
        )
      : undefined;
  }

  return false;
}

/** Checks an explicit feature restriction at every unit in the ancestry. */
export function unitAllowsRolePermissionFeature(
  node: OrgNode | undefined,
  module: Module,
  featureId: string,
  nodes: OrgNode[],
) {
  const visited = new Set<string>();
  let current = node;

  while (current) {
    if (visited.has(current.id)) return false;
    visited.add(current.id);

    const moduleFeatures = current.moduleFeatures ?? {};
    if (Object.prototype.hasOwnProperty.call(moduleFeatures, module.id)) {
      const selectedFeatureIds = moduleFeatures[module.id];
      if (!Array.isArray(selectedFeatureIds)
        || !normalizeModuleFeatureIds(module, selectedFeatureIds).includes(featureId)) {
        return false;
      }
    }

    current = current.parentId
      ? nodes.find(candidate =>
          candidate.id === current?.parentId
          && candidate.companyId === current?.companyId,
        )
      : undefined;
  }

  return true;
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
      if (!module || !unitHasExplicitFeatureScope(node, module, nodes)) return true;

      const featureId = getRolePermissionFeatureId(key, module);
      return Boolean(
        featureId
        && unitAllowsRolePermissionFeature(node, module, featureId, nodes),
      );
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