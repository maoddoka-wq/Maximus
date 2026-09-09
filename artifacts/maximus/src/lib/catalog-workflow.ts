import type {
  ModuleOverrides,
  ModuleStatusMap,
  ModuleId,
  SectorPreset,
  StoreData,
} from './store';
import { getConfiguredModules, modules } from './store';

export interface CatalogDraft {
  moduleOverrides: ModuleOverrides;
  moduleStatuses: ModuleStatusMap;
  removedModules: ModuleId[];
  sectorPresets: SectorPreset[];
  updatedAt: string;
}

export interface CatalogSnapshot {
  moduleOverrides: ModuleOverrides;
  moduleStatuses: ModuleStatusMap;
  removedModules: ModuleId[];
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

export function getCatalogSnapshot(data: StoreData): CatalogSnapshot {
  const draft = data.catalogDraft;
  return {
    moduleOverrides: clone(draft?.moduleOverrides ?? data.moduleOverrides ?? {}),
    moduleStatuses: clone(draft?.moduleStatuses ?? data.moduleStatuses ?? {}),
    removedModules: clone(draft?.removedModules ?? data.removedModules ?? []),
    sectorPresets: clone(draft?.sectorPresets ?? data.sectorPresets ?? []),
  };
}

export function getPublishedCatalogSnapshot(data: StoreData): CatalogSnapshot {
  return {
    moduleOverrides: clone(data.moduleOverrides ?? {}),
    moduleStatuses: clone(data.moduleStatuses ?? {}),
    removedModules: clone(data.removedModules ?? []),
    sectorPresets: clone(data.sectorPresets ?? []),
  };
}

export function ensureCatalogDraft(data: StoreData): CatalogDraft {
  if (!data.catalogDraft) {
    const published = getCatalogSnapshot(data);
    data.catalogDraft = {
      ...published,
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
  const moduleIds = new Set(modules.map(module => module.id));
  const availableModuleIds = new Set(modules.filter(module => !snapshot.removedModules.includes(module.id)).map(module => module.id));
  const configuredModules = getConfiguredModules({
    moduleOverrides: snapshot.moduleOverrides,
    removedModules: [],
  });

  snapshot.sectorPresets.forEach(sector => {
    if (!sector.name.trim()) errors.push('Un secteur ne possède pas de nom.');
    if (sector.moduleIds.length === 0) errors.push(`Le secteur « ${sector.name || sector.id} » ne contient aucun module.`);
    sector.moduleIds.forEach(moduleId => {
      if (!moduleIds.has(moduleId)) errors.push(`Le secteur « ${sector.name} » référence un module inconnu.`);
      if (!availableModuleIds.has(moduleId)) errors.push(`Le secteur « ${sector.name} » utilise un module inactif.`);
      const module = configuredModules.find(candidate => candidate.id === moduleId);
      if (!module) return;
      const availablePackIds = new Set((module.featurePacks ?? []).map(pack => pack.id));
      const selectedPackIds = sector.modulePackIds?.[moduleId] ?? [];
      selectedPackIds.forEach(packId => {
        if (!availablePackIds.has(packId)) errors.push(`Le secteur « ${sector.name} » référence un pack absent.`);
      });
      if (selectedPackIds.length === 0) warnings.push(`Le secteur « ${sector.name} » n’a pas de pack sélectionné pour ${module.name ?? moduleId}.`);
    });
  });

  Object.entries(snapshot.moduleOverrides).forEach(([moduleId, override]) => {
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
    sectorPresets: data.sectorPresets ?? [],
  };
  const changedModules = modules.filter(module =>
    JSON.stringify({
      override: draft.moduleOverrides[module.id] ?? null,
      status: draft.moduleStatuses[module.id] ?? module.status,
      removed: draft.removedModules.includes(module.id),
    }) !== JSON.stringify({
      override: published.moduleOverrides[module.id] ?? null,
      status: published.moduleStatuses[module.id] ?? module.status,
      removed: published.removedModules.includes(module.id),
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
  data.moduleOverrides = draft.moduleOverrides;
  data.moduleStatuses = draft.moduleStatuses;
  data.removedModules = draft.removedModules;
  data.sectorPresets = draft.sectorPresets;
  const removedModules = new Set(draft.removedModules);
  data.companies.forEach(company => {
    company.allowedModules = company.allowedModules.filter(moduleId => !removedModules.has(moduleId));
    company.refusedModules = company.requestedModules.filter(moduleId => !company.allowedModules.includes(moduleId));
  });
  data.orgNodes = data.orgNodes.map(node => ({
    ...node,
    moduleIds: node.moduleIds?.filter(moduleId => !removedModules.has(moduleId)),
    modulePackIds: Object.fromEntries(
      Object.entries(node.modulePackIds ?? {}).filter(([moduleId]) => !removedModules.has(moduleId as ModuleId)),
    ),
    moduleFeatures: Object.fromEntries(
      Object.entries(node.moduleFeatures ?? {}).filter(([moduleId]) => !removedModules.has(moduleId as ModuleId)),
    ),
  }));
  data.catalogVersion = (data.catalogVersion ?? 0) + 1;
  delete data.catalogDraft;
}