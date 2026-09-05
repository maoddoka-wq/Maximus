import {
  getConfiguredModules,
  modules,
  type Company,
  type ModuleId,
  type OrgNode,
  type Role,
  type StoreData,
} from './store';
import { getEffectiveModuleFeatureIds, getModuleFeatureOptions } from './module-features';

export type BlueprintRole = {
  name: string;
  description: string;
  modulePermissions: Record<string, string[]>;
};

export type BlueprintUnit = {
  name: string;
  code: string;
  type: OrgNode['type'];
  parentName?: string;
  moduleIds: ModuleId[];
  modulePackIds: Partial<Record<ModuleId, string[]>>;
  moduleFeatures: Partial<Record<ModuleId, string[]>>;
  roles: BlueprintRole[];
};

export type CompanyBlueprint = {
  companyName: string;
  managerName: string;
  adminEmail: string;
  country: string;
  sector: string;
  objective: string;
  units: BlueprintUnit[];
  advanced: {
    auditEnabled: boolean;
    managerScope: 'sector-only';
    approvalRequired: boolean;
    primaryColor: string;
    accentColor: string;
  };
  source: 'local-rule-engine';
};

export type BlueprintValidation = {
  errors: string[];
  warnings: string[];
};

const keywordMap: Record<string, string[]> = {
  commerce: ['commerce', 'commercial', 'vente', 'ventes', 'boutique', 'distribution'],
  stocks: ['stock', 'stocks', 'entrepôt', 'entrepot', 'magasin', 'inventaire'],
  achats: ['achat', 'achats', 'approvisionnement', 'approvisionnement'],
  fournisseurs: ['fournisseur', 'fournisseurs', 'partenaire'],
  logistique: ['logistique', 'livraison', 'transport'],
  finance: ['finance', 'trésorerie', 'tresorerie', 'paiement'],
  comptabilite: ['comptabilité', 'comptabilite', 'comptable'],
  rh: ['rh', 'ressources humaines', 'recrutement', 'employés', 'employes'],
  presences: ['présence', 'presence', 'pointage', 'absences', 'horaire'],
  paie: ['paie', 'salaires', 'bulletins'],
  crm: ['crm', 'clients', 'prospection', 'opportunités', 'opportunites'],
  documents: ['document', 'documents', 'archivage'],
  rapports: ['rapport', 'rapports', 'indicateur', 'pilotage'],
  ventes: ['devis', 'commande', 'facture', 'facturation'],
};

const unitRules = [
  { name: 'Opérations & stock', code: 'OPS', type: 'sector' as const, words: ['stock', 'entrepôt', 'entrepot', 'opération', 'operation', 'logistique', 'achat'] },
  { name: 'Commerce', code: 'COM', type: 'sector' as const, words: ['commerce', 'vente', 'client', 'crm', 'boutique'] },
  { name: 'Administration & finance', code: 'ADM', type: 'department' as const, words: ['finance', 'comptabilité', 'comptabilite', 'rh', 'paie', 'administration'] },
  { name: 'Services', code: 'SRV', type: 'sector' as const, words: ['service', 'conseil', 'projet'] },
];

function lower(value: string) {
  return value.trim().toLocaleLowerCase('fr');
}

function containsAny(value: string, words: string[]) {
  const normalized = lower(value);
  return words.some(word => normalized.includes(word));
}

function moduleMatchesPrompt(moduleId: ModuleId, moduleName: string, prompt: string) {
  return containsAny(prompt, [moduleId, moduleName, ...(keywordMap[moduleId] ?? [])]);
}

function defaultModuleIds(data: StoreData, sector: string, prompt: string): ModuleId[] {
  const configured = getConfiguredModules(data);
  const preset = data.sectorPresets.find(item => lower(item.name) === lower(sector))
    ?? data.sectorPresets.find(item => lower(prompt).includes(lower(item.name)));
  const mentioned = configured
    .filter(module => moduleMatchesPrompt(module.id, module.name, prompt))
    .map(module => module.id);
  const source = mentioned.length > 0 ? mentioned : (preset?.moduleIds ?? ['commerce', 'stocks']);
  return [...new Set(source)].filter(moduleId => configured.some(module => module.id === moduleId));
}

function defaultPackIds(
  data: StoreData,
  moduleId: ModuleId,
  sector: string,
  prompt: string,
): string[] {
  const module = getConfiguredModules(data).find(item => item.id === moduleId);
  if (!module?.featurePacks?.length) return [];
  const preset = data.sectorPresets.find(item => lower(item.name) === lower(sector));
  const presetPackIds = preset?.modulePackIds?.[moduleId] ?? [];
  const validPresetPackIds = presetPackIds.filter(packId => module.featurePacks?.some(pack => pack.id === packId));
  if (validPresetPackIds.length > 0) return validPresetPackIds;
  const requested = module.featurePacks.find(pack =>
    containsAny(prompt, [pack.id, pack.name, 'responsable', 'gestionnaire', 'gestion']),
  );
  return requested ? [requested.id] : [module.featurePacks[0].id];
}

function featuresForModule(
  data: StoreData,
  moduleId: ModuleId,
  packIds: string[],
  prompt: string,
): string[] {
  const module = getConfiguredModules(data).find(item => item.id === moduleId);
  if (!module) return [];
  const options = getModuleFeatureOptions(module);
  const mentioned = options
    .filter(option => containsAny(prompt, [option.id, option.label]))
    .map(option => option.id);
  const packFeatures = (module.featurePacks ?? [])
    .filter(pack => packIds.includes(pack.id))
    .flatMap(pack => pack.featureIds);
  return [
    ...getEffectiveModuleFeatureIds(module, mentioned.length > 0 ? mentioned : packFeatures.length > 0 ? packFeatures : undefined),
  ];
}

function permissionsForUnit(
  data: StoreData,
  moduleIds: ModuleId[],
  packIds: Partial<Record<ModuleId, string[]>>,
  features: Partial<Record<ModuleId, string[]>>,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const configured = getConfiguredModules(data);
  moduleIds.forEach(moduleId => {
    const module = configured.find(item => item.id === moduleId);
    if (!module) return;
    result[moduleId] = ['voir'];
    const selectedPackIds = packIds[moduleId] ?? [];
    const packs = (module.featurePacks ?? []).filter(pack => selectedPackIds.includes(pack.id));
    const selectedFeatures = features[moduleId] ?? [];
    selectedFeatures.forEach(featureId => {
      const permissionKey = moduleId === 'stocks'
        ? `stocks:${featureId}`
        : moduleId === 'presences'
          ? `presence.${featureId}`
          : moduleId === 'commerce'
            ? `commerce:menu:${featureId}`
            : `${moduleId}:menu:${featureId}`;
      const packPermission = packs
        .map(pack => pack.featurePermissions?.[featureId] ?? [])
        .flat();
      result[permissionKey] = [...new Set(['voir', ...packPermission])];
    });
  });
  return result;
}

function unitsFromPrompt(prompt: string, moduleIds: ModuleId[]): Array<{ name: string; code: string; type: OrgNode['type'] }> {
  const explicit = prompt.match(/(?:unités?|secteurs?|services?)\s*:\s*([^.!?]+)/i)?.[1]
    ?.split(/,|\/| et /i)
    .map(value => value.trim())
    .filter(Boolean);
  if (explicit?.length) {
    return explicit.slice(0, 6).map((name, index) => ({
      name: name.replace(/\s+/g, ' '),
      code: name.replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase() || `U${index + 1}`,
      type: 'sector',
    }));
  }
  const matching = unitRules.filter(rule =>
    rule.words.some(word => moduleIds.some(moduleId => (keywordMap[moduleId] ?? []).includes(word)) || containsAny(prompt, [word])),
  );
  const selected = matching.length ? matching : [unitRules[0]];
  return selected.slice(0, 4).map(({ name, code, type }) => ({ name, code, type }));
}

function modulesForUnit(unitName: string, allModuleIds: ModuleId[], index: number) {
  if (index === 0 || containsAny(unitName, ['direction', 'administration', 'service'])) return allModuleIds;
  const targeted = allModuleIds.filter(moduleId => containsAny(unitName, [moduleId, ...(keywordMap[moduleId] ?? [])]));
  return targeted.length ? targeted : allModuleIds.slice(0, Math.min(2, allModuleIds.length));
}

export function buildCompanyBlueprint(
  data: StoreData,
  input: {
    companyName: string;
    managerName: string;
    adminEmail: string;
    country: string;
    sector: string;
    prompt: string;
  },
): CompanyBlueprint {
  const moduleIds = defaultModuleIds(data, input.sector, input.prompt);
  const units = unitsFromPrompt(input.prompt, moduleIds).map((unit, index) => {
    const unitModuleIds = modulesForUnit(unit.name, moduleIds, index);
    const modulePackIds = Object.fromEntries(
      unitModuleIds.map(moduleId => [moduleId, defaultPackIds(data, moduleId, input.sector, input.prompt)]),
    ) as Partial<Record<ModuleId, string[]>>;
    const moduleFeatures = Object.fromEntries(
      unitModuleIds.map(moduleId => [moduleId, featuresForModule(data, moduleId, modulePackIds[moduleId] ?? [], input.prompt)]),
    ) as Partial<Record<ModuleId, string[]>>;
    const modulePermissions = permissionsForUnit(data, unitModuleIds, modulePackIds, moduleFeatures);
    return {
      ...unit,
      roles: [
        {
          name: `Responsable · ${unit.name}`,
          description: 'Rôle proposé automatiquement depuis les modules, packs et fonctionnalités sélectionnés.',
          modulePermissions,
        },
      ],
      moduleIds: unitModuleIds,
      modulePackIds,
      moduleFeatures,
    };
  });

  return {
    companyName: input.companyName.trim(),
    managerName: input.managerName.trim(),
    adminEmail: input.adminEmail.trim().toLowerCase(),
    country: input.country.trim() || 'Sénégal',
    sector: input.sector.trim() || 'Services',
    objective: input.prompt.trim() || 'Configuration initiale proposée depuis le catalogue MAXIMUS.',
    units,
    advanced: {
      auditEnabled: true,
      managerScope: 'sector-only',
      approvalRequired: containsAny(input.prompt, ['validation', 'approbation', 'approbation']),
      primaryColor: '#123B5D',
      accentColor: '#D6A94A',
    },
    source: 'local-rule-engine',
  };
}

export function validateCompanyBlueprint(data: StoreData, blueprint: CompanyBlueprint): BlueprintValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const configured = getConfiguredModules(data);
  const configuredIds = new Set(configured.map(module => module.id));

  if (!blueprint.companyName.trim()) errors.push('Le nom de l’entreprise est obligatoire.');
  if (!blueprint.managerName.trim()) errors.push('Le responsable de l’entreprise est obligatoire.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(blueprint.adminEmail)) errors.push('L’email administrateur est invalide.');
  if (blueprint.units.length === 0) errors.push('Le brouillon doit contenir au moins une unité.');

  blueprint.units.forEach(unit => {
    if (unit.moduleIds.length === 0) errors.push(`L’unité « ${unit.name} » ne possède aucun module.`);
    unit.moduleIds.forEach(moduleId => {
      if (!configuredIds.has(moduleId)) errors.push(`Le module « ${moduleId} » n’existe plus dans le catalogue.`);
      const module = configured.find(candidate => candidate.id === moduleId);
      const packIds = unit.modulePackIds[moduleId] ?? [];
      packIds.forEach(packId => {
        if (!module?.featurePacks?.some(pack => pack.id === packId)) {
          errors.push(`Le pack « ${packId} » est indisponible pour le module « ${moduleId} ».`);
        }
      });
      const effective = module ? getEffectiveModuleFeatureIds(module, unit.moduleFeatures[moduleId]) : new Set<string>();
      if (effective.size === 0) warnings.push(`Aucune fonctionnalité active n’a été retenue pour « ${module?.name ?? moduleId} » dans « ${unit.name} ».`);
    });
    if (unit.roles.length === 0) warnings.push(`Aucun rôle proposé pour l’unité « ${unit.name} ».`);
  });

  const uniqueModules = new Set(blueprint.units.flatMap(unit => unit.moduleIds));
  if (uniqueModules.size === 0) errors.push('Sélectionnez au moins un module.');
  if (!blueprint.advanced.auditEnabled) warnings.push('La traçabilité des décisions est désactivée.');
  if (blueprint.source !== 'local-rule-engine') warnings.push('La source du brouillon doit être vérifiable avant application.');
  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}

export function companyFromBlueprint(
  blueprint: CompanyBlueprint,
  companyId: string,
  createdAt: string,
): Company {
  const moduleIds = [...new Set(blueprint.units.flatMap(unit => unit.moduleIds))];
  const modulePackIds = Object.fromEntries(
    moduleIds.map(moduleId => [
      moduleId,
      [...new Set(blueprint.units.flatMap(unit => unit.modulePackIds[moduleId] ?? []))],
    ]),
  ) as Partial<Record<ModuleId, string[]>>;
  const moduleFeatures = Object.fromEntries(
    moduleIds.map(moduleId => [
      moduleId,
      [...new Set(blueprint.units.flatMap(unit => unit.moduleFeatures[moduleId] ?? []))],
    ]),
  ) as Partial<Record<ModuleId, string[]>>;
  const modulePermissions = Object.fromEntries(
    moduleIds.map(moduleId => [
      moduleId,
      Object.fromEntries(
        Object.entries(
          blueprint.units
            .flatMap(unit => unit.roles)
            .flatMap(role => Object.entries(role.modulePermissions))
            .filter(([key]) => key === moduleId || key.startsWith(`${moduleId}:`) || key.startsWith(`${moduleId}.`))
            .reduce<Record<string, string[]>>((acc, [key, permissions]) => ({
              ...acc,
              [key]: [...new Set([...(acc[key] ?? []), ...permissions])],
            }), {}),
        ),
      ),
    ]),
  ) as Company['requestedModulePermissions'];

  return {
    id: companyId,
    name: blueprint.companyName,
    manager: blueprint.managerName,
    email: blueprint.adminEmail,
    phone: '',
    country: blueprint.country,
    sector: blueprint.sector,
    status: 'ACTIF',
    requestedModules: moduleIds,
    requestedModulePackIds: modulePackIds,
    requestedModuleFeatures: moduleFeatures,
    requestedModulePermissions: modulePermissions,
    allowedModules: moduleIds,
    refusedModules: modules.map(module => module.id).filter(moduleId => !moduleIds.includes(moduleId)),
    createdAt,
    primaryColor: blueprint.advanced.primaryColor,
    accentColor: blueprint.advanced.accentColor,
  };
}