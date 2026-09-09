import { commerceTabPermissionKeys } from './commerce-permissions';
import { getEffectiveModuleFeatureIds, getModuleFeatureOptions } from './module-features';
import { permissionFeatureKey } from './permission-keys';
import {
  getConfiguredModules,
  type Company,
  type Module,
  type ModuleId,
  type OrgNode,
  type Role,
  type StoreData,
} from './store';
import { synchronizeUnitPackRoles } from './module-role-sync';
import { buildSubscriptionForCompany } from './subscription-model';

type RootSeed = Pick<OrgNode, 'name' | 'code' | 'type'>;

export type CompanyAccessProvisioningOptions = {
  root?: Partial<RootSeed>;
  moduleIds?: ModuleId[];
  modulePackIds?: Partial<Record<ModuleId, string[]>>;
};

function copyPackIds(
  modules: Module[],
  modulePackIds: Partial<Record<ModuleId, string[]>>,
) {
  return Object.fromEntries(
    modules
      .map(module => [
        module.id,
        [...(modulePackIds[module.id] ?? [])].filter(packId => module.featurePacks?.some(pack => pack.id === packId)),
      ] as const)
      .filter(([, packIds]) => packIds.length),
  ) as Partial<Record<ModuleId, string[]>>;
}

function effectiveFeatures(
  module: Module,
  requestedFeatures: Partial<Record<ModuleId, string[]>> | undefined,
  selectedPackIds: string[],
) {
  if (requestedFeatures && Object.prototype.hasOwnProperty.call(requestedFeatures, module.id)) {
    return [...getEffectiveModuleFeatureIds(module, requestedFeatures[module.id])];
  }

  const packFeatureIds = (module.featurePacks ?? [])
    .filter(pack => selectedPackIds.includes(pack.id))
    .flatMap(pack => pack.featureIds);
  return [...getEffectiveModuleFeatureIds(module, packFeatureIds.length ? packFeatureIds : undefined)];
}

function permissionKeys(module: Module, featureId: string) {
  if (module.id === 'commerce') return commerceTabPermissionKeys(featureId as never);
  if (module.id === 'stocks') return [`stocks:${featureId}`];
  if (module.id === 'presences') return [`presence.${featureId}`];
  return [permissionFeatureKey(module.id, featureId)];
}

function buildFallbackRole(
  company: Company,
  node: OrgNode,
  modules: Module[],
  selectedPackIds: Partial<Record<ModuleId, string[]>>,
) {
  const packlessModules = modules.filter(module => !(selectedPackIds[module.id] ?? []).length);
  const modulePermissions: Record<string, string[]> = {};

  packlessModules.forEach(module => {
    const featureIds = effectiveFeatures(module, company.requestedModuleFeatures, []);
    const requestedPermissions = company.requestedModulePermissions?.[module.id] ?? {};
    featureIds.forEach(featureId => {
      const permissions = requestedPermissions[featureId]?.length ? requestedPermissions[featureId] : ['voir'];
      permissionKeys(module, featureId).forEach(key => {
        modulePermissions[key] = [...new Set(permissions)];
      });
    });
    if (featureIds.length) modulePermissions[module.id] = ['voir'];
  });

  if (Object.keys(modulePermissions).length === 0) return null;
  return {
    id: `initial-role-${node.id}`,
    companyId: company.id,
    sectorId: node.id,
    name: 'Accès initial',
    description: 'Rôle créé à partir des fonctionnalités choisies lors de l’activation.',
    modulePermissions,
  } satisfies Role;
}

/**
 * Materializes the selections made during signup or administrative creation.
 * The result is deliberately local and idempotent: running it again updates
 * the same root and pack roles instead of creating duplicates.
 */
export function provisionCompanyAccess(
  data: StoreData,
  company: Company,
  options: CompanyAccessProvisioningOptions = {},
) {
  const configuredModules = getConfiguredModules(data).filter(module => {
    const status = data.moduleStatuses?.[module.id] ?? module.status;
    return status === 'ACTIF' || status === 'BETA';
  });
  const requestedModuleIds = [
    ...new Set(options.moduleIds ?? (company.allowedModules.length ? company.allowedModules : company.requestedModules)),
  ];
  const moduleIds = requestedModuleIds.filter(moduleId => configuredModules.some(module => module.id === moduleId));
  const sourcePackIds = options.modulePackIds ?? company.requestedModulePackIds ?? {};
  const selectedPackIds = copyPackIds(
    configuredModules.filter(module => moduleIds.includes(module.id)),
    sourcePackIds,
  );

  company.requestedModules = [...moduleIds];
  company.allowedModules = [...moduleIds];
  company.requestedModulePackIds = selectedPackIds;

  const requestedFeatures = Object.fromEntries(
    moduleIds.map(moduleId => {
      const module = configuredModules.find(candidate => candidate.id === moduleId);
      return module ? [moduleId, effectiveFeatures(module, company.requestedModuleFeatures, selectedPackIds[moduleId] ?? [])] : [moduleId, []];
    }),
  ) as Partial<Record<ModuleId, string[]>>;
  company.requestedModuleFeatures = requestedFeatures;
  if (!data.subscriptions.some(subscription => subscription.companyId === company.id)) {
    data.subscriptions.push(buildSubscriptionForCompany({
      companyId: company.id,
      createdAt: company.createdAt,
      moduleIds,
    }));
  }

  const rootSeed = options.root ?? {};
  let root = data.orgNodes.find(node => node.companyId === company.id && !node.parentId);
  if (!root) {
    root = {
      id: `company-root-${company.id}`,
      companyId: company.id,
      name: rootSeed.name ?? company.name,
      code: rootSeed.code ?? 'ROOT',
      type: rootSeed.type ?? 'direction',
      parentId: null,
    };
    data.orgNodes.push(root);
  } else {
    root.name = rootSeed.name ?? root.name;
    root.code = rootSeed.code ?? root.code;
    root.type = rootSeed.type ?? root.type;
  }

  root.moduleIds = [...moduleIds];
  root.modulePackIds = selectedPackIds;
  root.moduleFeatures = requestedFeatures;
  synchronizeUnitPackRoles(data, company, root);

  const selectedPackRoleIds = new Set(
    data.roles
      .filter(role => role.companyId === company.id && role.sectorId === root?.id && role.packId && role.packModuleId)
      .map(role => role.packId),
  );
  const fallbackRole = buildFallbackRole(
    company,
    root,
    configuredModules.filter(module => moduleIds.includes(module.id)),
    Object.fromEntries(
      Object.entries(selectedPackIds).map(([moduleId, packIds]) => [
        moduleId,
        (packIds ?? []).filter(packId => selectedPackRoleIds.has(packId)),
      ]),
    ) as Partial<Record<ModuleId, string[]>>,
  );
  const fallbackIndex = data.roles.findIndex(role => role.id === `initial-role-${root?.id}`);
  if (fallbackRole && fallbackIndex === -1) data.roles.push(fallbackRole);
  if (!fallbackRole && fallbackIndex !== -1 && !data.employees.some(employee => employee.roleId === data.roles[fallbackIndex]?.id)) {
    data.roles.splice(fallbackIndex, 1);
  }

  return root;
}