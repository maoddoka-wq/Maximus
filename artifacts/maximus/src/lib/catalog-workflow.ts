import type {
  ModuleOverrides,
  ModuleStatusMap,
  Module,
  ModuleId,
  SectorPreset,
  StoreData,
} from './store';
import { getConfiguredModules, modules } from './store';
import { getModuleFeatureOptions, normalizeModuleFeatureIds } from './module-features';

export interface CatalogDraft {
  moduleOverrides: ModuleOverrides;
  moduleStatuses: ModuleStatusMap;
  removedModules: ModuleId[];
  customModules: StoreData['customModules'];
  sectorPresets: SectorPreset[];
  updatedAt: string;
}

export interface CatalogSnapshot {
  moduleOverrides: ModuleOverrides;
  moduleStatuses: ModuleStatusMap;
  removedModules: ModuleId[];
  customModules: StoreData['customModules'];
  sectorPresets: SectorPreset[];
}

export interface CatalogImpact {
  changedModules: number;
  changedSectors: number;
  affectedCompanies: number;
  affectedUnits: number;
}

export interface CatalogValidation {
  errors: string[];
  warnings: string[];
}

const clone = <T>(value: T): T => structuredClone(value);

function normalizeCatalogModule(module: Module): Module {
  const validFeatureIds = new Set(getModuleFeatureOptions(module).map(feature => feature.id));
  const featurePacks = (module.featurePacks ?? [])
    .map(pack => {
      const featureIds = [...new Set(
        normalizeModuleFeatureIds(module, pack.featureIds)
          .filter(featureId => validFeatureIds.has(featureId)),
      )];
      const featurePermissions = Object.fromEntries(
        Object.entries(pack.featurePermissions ?? {})
          .filter(([featureId]) => featureIds.includes(featureId)),
      );
      return { ...pack, featureIds, featurePermissions };
    })
    .filter(pack => pack.featureIds.length > 0);
  const featureDependencies = Object.fromEntries(
    Object.entries(module.featureDependencies ?? {})
      .filter(([featureId, dependencies]) =>
        validFeatureIds.has(featureId)
        && (dependencies ?? []).every(dependency => validFeatureIds.has(dependency)),
      ),
  );

  return { ...module, featurePacks, featureDependencies };
}

function normalizeCatalogModules(modulesToNormalize: Module[]): Module[] {
  return modulesToNormalize.map(normalizeCatalogModule);
}

function normalizedModuleOverrides(
  overrides: ModuleOverrides,
  configuredModules: Module[],
): ModuleOverrides {
  const modulesById = new Map(configuredModules.map(module => [module.id, module]));
  return Object.fromEntries(
    Object.entries(overrides).map(([moduleId, override]) => {
      const module = modulesById.get(moduleId as ModuleId);
      if (!module) return [moduleId, override];
      return [moduleId, {
        ...override,
        featurePacks: module.featurePacks,
        featureDependencies: module.featureDependencies,
      }];
    }),
  ) as ModuleOverrides;
}

export function getCatalogSnapshot(data: StoreData): CatalogSnapshot {
  const draft = data.catalogDraft;
  return {
    moduleOverrides: clone(draft?.moduleOverrides ?? data.moduleOverrides ?? {}),
    moduleStatuses: clone(draft?.moduleStatuses ?? data.moduleStatuses ?? {}),
    removedModules: clone(draft?.removedModules ?? data.removedModules ?? []),
    customModules: clone(draft?.customModules ?? data.customModules ?? []),
    sectorPresets: clone(draft?.sectorPresets ?? data.sectorPresets ?? []),
  };
}

export function ensureCatalogDraft(data: StoreData): CatalogDraft {
  if (!data.catalogDraft) {
    const published = getCatalogSnapshot(data);
    data.catalogDraft = {
      ...published,
      customModules: clone(published.customModules ?? []),
      updatedAt: new Date().toISOString(),
    };
  }
  return data.catalogDraft;
}

export function updateCatalogDraft(data: StoreData, update: (draft: CatalogDraft) => void) {
  const draft = ensureCatalogDraft(data);
  update(draft);
  draft.updatedAt = new Date().toISOString();
}

export function discardCatalogDraft(data: StoreData) {
  delete data.catalogDraft;
}

export function validateCatalogDraft(data: StoreData): CatalogValidation {
  const snapshot = getCatalogSnapshot(data);
  const errors: string[] = [];
  const warnings: string[] = [];
  const configuredModules = normalizeCatalogModules(getConfiguredModules({
    moduleOverrides: snapshot.moduleOverrides,
    removedModules: [],
    customModules: snapshot.customModules,
  }));
  const moduleById = new Map(configuredModules.map(module => [module.id, module]));
  const moduleIds = new Set(configuredModules.map(module => module.id));
  const availableModuleIds = new Set(
    configuredModules
      .filter(module => !snapshot.removedModules.includes(module.id))
      .filter(module => (snapshot.moduleStatuses[module.id] ?? module.status) !== 'INACTIF')
      .map(module => module.id),
  );
  const validActions = new Set(['voir', 'créer', 'modifier']);

  const validateModuleReferences = (moduleId: ModuleId, moduleName: string) => {
    const module = moduleById.get(moduleId);
    if (!module) return;
    const featureIds = new Set(getModuleFeatureOptions(module).map(feature => feature.id));
    const packs = module.featurePacks ?? [];
    const packIds = new Set<string>();
    packs.forEach(pack => {
      if (packIds.has(pack.id)) errors.push(`Le module « ${moduleName} » contient des packs portant le même identifiant.`);
      packIds.add(pack.id);
      const packFeatures = new Set(pack.featureIds);
      pack.featureIds.forEach(featureId => {
        if (!featureIds.has(featureId)) errors.push(`Le pack « ${pack.name || pack.id} » référence une fonctionnalité absente.`);
      });
      Object.entries(pack.featurePermissions ?? {}).forEach(([featureId, permissions]) => {
        const normalizedPermissions = permissions ?? [];
        if (!packFeatures.has(featureId)) errors.push(`Le pack « ${pack.name || pack.id} » autorise une fonctionnalité non incluse.`);
        if (normalizedPermissions.some(permission => !validActions.has(permission))) {
          errors.push(`Le pack « ${pack.name || pack.id} » contient une action de permission inconnue.`);
        }
      });
    });
    Object.entries(module.featureDependencies ?? {}).forEach(([featureId, dependencies]) => {
      const normalizedDependencies = dependencies ?? [];
      if (!featureIds.has(featureId) || normalizedDependencies.some(dependency => !featureIds.has(dependency))) {
        errors.push(`Le module « ${moduleName} » contient une dépendance de fonctionnalité invalide.`);
      }
    });
  };

  const modulesToValidate = new Set<ModuleId>([
    ...Object.keys(snapshot.moduleOverrides) as ModuleId[],
    ...(snapshot.customModules ?? []).map(module => module.id),
  ]);
  modulesToValidate.forEach(moduleId => {
    const module = moduleById.get(moduleId);
    if (module) validateModuleReferences(module.id, module.name);
  });

  snapshot.sectorPresets.forEach(sector => {
    if (!sector.name.trim()) errors.push('Un secteur ne possède pas de nom.');
    if (sector.moduleIds.length === 0) errors.push(`Le secteur « ${sector.name || sector.id} » ne contient aucun module.`);
    sector.moduleIds.forEach(moduleId => {
      if (!moduleIds.has(moduleId)) errors.push(`Le secteur « ${sector.name} » référence un module inconnu.`);
      if (!availableModuleIds.has(moduleId)) errors.push(`Le secteur « ${sector.name} » utilise un module inactif.`);
      const module = moduleById.get(moduleId);
      if (!module) return;
      const availablePackIds = new Set((module.featurePacks ?? []).map(pack => pack.id));
      const selectedPackIds = sector.modulePackIds?.[moduleId] ?? [];
      if (new Set(selectedPackIds).size !== selectedPackIds.length) {
        errors.push(`Le secteur « ${sector.name} » sélectionne deux fois le même pack.`);
      }
      selectedPackIds.forEach(packId => {
        if (!availablePackIds.has(packId)) errors.push(`Le secteur « ${sector.name} » référence un pack absent.`);
      });
      const validFeatureIds = new Set(getModuleFeatureOptions(module).map(feature => feature.id));
      const selectedPackFeatures = new Set(
        selectedPackIds.flatMap(packId => module.featurePacks?.find(pack => pack.id === packId)?.featureIds ?? []),
      );
      (sector.moduleFeatures?.[moduleId] ?? []).forEach(featureId => {
        if (!validFeatureIds.has(featureId)) errors.push(`Le secteur « ${sector.name} » référence une fonctionnalité absente.`);
        if (selectedPackIds.length > 0 && !selectedPackFeatures.has(featureId)) {
          errors.push(`Le secteur « ${sector.name} » utilise une fonctionnalité hors des packs choisis.`);
        }
      });
      if (selectedPackIds.length === 0) warnings.push(`Le secteur « ${sector.name} » n’a pas de pack sélectionné pour ${module.name ?? moduleId}.`);
    });
  });

  Object.entries(snapshot.moduleOverrides).forEach(([moduleId, override]) => {
    if (!moduleIds.has(moduleId as ModuleId)) {
      errors.push(`Le brouillon référence un module inconnu « ${moduleId} ».`);
      return;
    }
    if (override?.description !== undefined && (typeof override.description !== 'string' || !override.description.trim())) {
      errors.push(`Le module « ${moduleId} » doit avoir une description compréhensible.`);
    }
    const featurePacks = Array.isArray(override?.featurePacks) ? override.featurePacks : [];
    const packNames = featurePacks
      .map(pack => typeof pack?.name === 'string' ? pack.name.trim().toLowerCase() : '')
      .filter(Boolean);
    if (new Set(packNames).size !== packNames.length) errors.push(`Le module « ${moduleId} » contient des packs portant le même nom.`);
    if (Array.isArray(override?.features) && override.features.length === 0) {
      errors.push(`Le module « ${moduleId} » ne contient aucune fonctionnalité.`);
    }
    featurePacks.forEach(pack => {
      const featureIds = Array.isArray(pack?.featureIds) ? pack.featureIds : [];
      const packName = typeof pack?.name === 'string' ? pack.name : pack?.id ?? moduleId;
      if (featureIds.length === 0) errors.push(`Le pack « ${packName} » ne contient aucune fonctionnalité.`);
      if (typeof pack?.description !== 'string' || !pack.description.trim()) {
        errors.push(`Le pack « ${packName} » doit avoir une description compréhensible.`);
      }
    });
  });

  if (snapshot.removedModules.length > 0) {
    const affectedCompanies = data.companies.filter(company =>
      company.allowedModules.some(moduleId => snapshot.removedModules.includes(moduleId)),
    ).length;
    if (affectedCompanies > 0) warnings.push(`${affectedCompanies} entreprise(s) perdront un accès à un module retiré.`);
  }

  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}

export function getCatalogImpact(data: StoreData): CatalogImpact {
  if (!data.catalogDraft) return { changedModules: 0, changedSectors: 0, affectedCompanies: 0, affectedUnits: 0 };
  const draft = getCatalogSnapshot(data);
  const published = {
    moduleOverrides: data.moduleOverrides ?? {},
    moduleStatuses: data.moduleStatuses ?? {},
    removedModules: data.removedModules ?? [],
    customModules: data.customModules ?? [],
    sectorPresets: data.sectorPresets ?? [],
  };
  const changedModules = [...modules, ...(draft.customModules ?? [])].filter(module =>
    JSON.stringify({
      override: draft.moduleOverrides[module.id] ?? null,
      status: draft.moduleStatuses[module.id] ?? module.status,
      removed: draft.removedModules.includes(module.id),
      custom: draft.customModules?.find(item => item.id === module.id) ?? null,
    }) !== JSON.stringify({
      override: published.moduleOverrides[module.id] ?? null,
      status: published.moduleStatuses[module.id] ?? module.status,
      removed: published.removedModules.includes(module.id),
      custom: published.customModules?.find(item => item.id === module.id) ?? null,
    }),
  ).length;
  const changedSectors = draft.sectorPresets.filter(sector => {
    const previous = published.sectorPresets.find(item => item.id === sector.id);
    return JSON.stringify(previous ?? null) !== JSON.stringify(sector);
  }).length + published.sectorPresets.filter(sector => !draft.sectorPresets.some(item => item.id === sector.id)).length;
  const affectedCompanies = data.companies.filter(company => {
    const previousSector = published.sectorPresets.find(sector => sector.name === company.sector);
    const nextSector = draft.sectorPresets.find(sector => sector.name === company.sector);
    return JSON.stringify(previousSector ?? null) !== JSON.stringify(nextSector ?? null)
      || company.allowedModules.some(moduleId => draft.removedModules.includes(moduleId));
  }).length;
  const affectedUnits = data.orgNodes.filter(node =>
    node.moduleIds?.some(moduleId => draft.removedModules.includes(moduleId)),
  ).length;
  return { changedModules, changedSectors, affectedCompanies, affectedUnits };
}

export function publishCatalogDraft(data: StoreData) {
  if (!data.catalogDraft) return;
  if (validateCatalogDraft(data).errors.length > 0) return;
  const draft = getCatalogSnapshot(data);
  data.moduleStatuses = draft.moduleStatuses;
  data.removedModules = draft.removedModules;
  data.customModules = draft.customModules ?? [];
  data.sectorPresets = draft.sectorPresets;
  const publishedModules = getConfiguredModules({
    moduleOverrides: draft.moduleOverrides,
    removedModules: [],
    customModules: draft.customModules ?? [],
  });
  const normalizedModules = normalizeCatalogModules(publishedModules);
  data.moduleOverrides = normalizedModuleOverrides(draft.moduleOverrides, normalizedModules);
  const activeModuleIds = new Set(
    normalizedModules
      .filter(module => !draft.removedModules.includes(module.id))
      .filter(module => (draft.moduleStatuses[module.id] ?? module.status) !== 'INACTIF')
      .map(module => module.id),
  );
  const moduleById = new Map(normalizedModules.map(module => [module.id, module]));
  const selectedFeaturesFor = (moduleId: ModuleId, packIds: string[] = [], featureIds: string[] = []) => {
    const module = moduleById.get(moduleId);
    if (!module) return { packIds: [], featureIds: [] };
    const validFeatures = new Set(getModuleFeatureOptions(module).map(feature => feature.id));
    const packs = (module.featurePacks ?? []).filter(pack => packIds.includes(pack.id));
    const allowedByPack = new Set(packs.flatMap(pack => pack.featureIds));
    const normalizedPackIds = packs.map(pack => pack.id);
    const normalizedFeatureIds = [...new Set(featureIds.filter(featureId => validFeatures.has(featureId)))];
    return {
      packIds: normalizedPackIds,
      featureIds: normalizedPackIds.length > 0
        ? (normalizedFeatureIds.length > 0 ? normalizedFeatureIds.filter(featureId => allowedByPack.has(featureId)) : [...allowedByPack])
        : normalizedFeatureIds,
    };
  };
  const cleanModuleMaps = (
    moduleIds: ModuleId[],
    packMap: Partial<Record<ModuleId, string[]>> | undefined,
    featureMap: Partial<Record<ModuleId, string[]>> | undefined,
    permissionMap: Partial<Record<ModuleId, Partial<Record<string, string[]>>>> | undefined,
  ) => {
    const nextPacks: Partial<Record<ModuleId, string[]>> = {};
    const nextFeatures: Partial<Record<ModuleId, string[]>> = {};
    const nextPermissions: Partial<Record<ModuleId, Partial<Record<string, string[]>>>> = {};
    moduleIds.forEach(moduleId => {
      const selection = selectedFeaturesFor(moduleId, packMap?.[moduleId] ?? [], featureMap?.[moduleId] ?? []);
      nextPacks[moduleId] = selection.packIds;
      nextFeatures[moduleId] = selection.featureIds;
      const allowedFeatures = new Set(selection.featureIds);
      const permissions = permissionMap?.[moduleId] ?? {};
      nextPermissions[moduleId] = Object.fromEntries(
        Object.entries(permissions)
          .filter(([featureId, values]) => allowedFeatures.has(featureId))
          .map(([featureId, values]) => [
            featureId,
            [...new Set((values ?? []).filter(value => ['voir', 'créer', 'modifier'].includes(value)))],
          ]),
      );
    });
    return { nextPacks, nextFeatures, nextPermissions };
  };
  const removedModules = new Set(draft.removedModules);
  data.companies.forEach(company => {
    const requestedModules = company.requestedModules.filter(moduleId => activeModuleIds.has(moduleId));
    const cleaned = cleanModuleMaps(
      requestedModules,
      company.requestedModulePackIds,
      company.requestedModuleFeatures,
      company.requestedModulePermissions,
    );
    company.requestedModules = requestedModules;
    company.requestedModulePackIds = cleaned.nextPacks;
    company.requestedModuleFeatures = cleaned.nextFeatures;
    company.requestedModulePermissions = cleaned.nextPermissions;
    company.allowedModules = company.allowedModules.filter(moduleId => activeModuleIds.has(moduleId));
    company.refusedModules = company.requestedModules.filter(moduleId => !company.allowedModules.includes(moduleId));
  });
  data.orgNodes = data.orgNodes.map(node => ({
    ...node,
    moduleIds: node.moduleIds?.filter(moduleId => activeModuleIds.has(moduleId)),
    modulePackIds: Object.fromEntries(
      Object.entries(node.modulePackIds ?? {})
        .filter(([moduleId]) => activeModuleIds.has(moduleId as ModuleId))
        .map(([moduleId, packIds]) => [moduleId, selectedFeaturesFor(moduleId as ModuleId, packIds, []).packIds]),
    ),
    moduleFeatures: Object.fromEntries(
      Object.entries(node.moduleFeatures ?? {})
        .filter(([moduleId]) => activeModuleIds.has(moduleId as ModuleId))
        .map(([moduleId, featureIds]) => [
          moduleId,
          selectedFeaturesFor(
            moduleId as ModuleId,
            node.modulePackIds?.[moduleId as ModuleId] ?? [],
            featureIds,
          ).featureIds,
        ]),
    ),
  }));
  data.roles.forEach(role => {
    if (!role.packModuleId) return;
    const module = moduleById.get(role.packModuleId);
    const pack = module?.featurePacks?.find(candidate => candidate.id === role.packId);
    if (!activeModuleIds.has(role.packModuleId) || !pack) {
      delete role.packId;
      delete role.packModuleId;
    }
  });
  data.catalogVersion = (data.catalogVersion ?? 0) + 1;
  delete data.catalogDraft;
}