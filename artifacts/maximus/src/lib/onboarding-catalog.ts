import type { CustomerNeedDefinition, Module, ModuleId, StoreData } from './store';
import { getConfiguredModules } from './store';

/**
 * These are customer-facing questions, not technical modules.
 *
 * They intentionally live outside the React components. Adding a new module
 * only requires adding its customerNeed metadata to the module definition (or
 * its published override); the signup and onboarding screens remain generic.
 */
const plannedNeeds: Array<CustomerNeedDefinition & { moduleIds: ModuleId[] }> = [
  {
    id: 'team',
    label: 'Suivre mes employés',
    description: 'Centralisez les informations de votre équipe.',
    moduleIds: ['rh'],
    order: 30,
  },
  {
    id: 'finance',
    label: 'Gérer mes finances',
    description: 'Gardez une vue claire sur vos encaissements et vos résultats.',
    moduleIds: ['finance'],
    order: 40,
  },
];

export type CustomerNeed = CustomerNeedDefinition & {
  moduleIds: ModuleId[];
};

function normalizedNeed(module: Module): CustomerNeed | null {
  const need = module.customerNeed;
  if (!need?.id || !need.label || !need.description) return null;
  return { ...need, moduleIds: [module.id] };
}

export function getCustomerNeeds(
  data: Pick<StoreData, 'moduleOverrides' | 'removedModules'>,
): CustomerNeed[] {
  const configuredModules = getConfiguredModules(data);
  const moduleNeeds = configuredModules
    .map(normalizedNeed)
    .filter((need): need is CustomerNeed => Boolean(need));
  const knownModuleIds = new Set(configuredModules.map(module => module.id));
  const visiblePlannedNeeds = plannedNeeds.filter(need =>
    need.moduleIds.some(moduleId => !knownModuleIds.has(moduleId)),
  );

  return [...moduleNeeds, ...visiblePlannedNeeds]
    .sort((left, right) => (left.order ?? 1000) - (right.order ?? 1000) || left.label.localeCompare(right.label, 'fr'))
    .filter((need, index, all) => all.findIndex(candidate => candidate.id === need.id) === index);
}

export function activeModuleIds(
  data: Pick<StoreData, 'moduleOverrides' | 'moduleStatuses' | 'removedModules'>,
): Set<ModuleId> {
  const configuredModules = getConfiguredModules(data);
  return new Set(
    configuredModules
      .filter(module => {
        const status = data.moduleStatuses?.[module.id] ?? module.status;
        return status === 'ACTIF' || status === 'BETA';
      })
      .map(module => module.id),
  );
}

export function moduleIdsForNeed(
  need: CustomerNeed,
  enabledModuleIds: Set<ModuleId>,
): ModuleId[] {
  return need.moduleIds.filter(moduleId => enabledModuleIds.has(moduleId));
}

export function isNeedAvailable(
  need: CustomerNeed,
  enabledModuleIds: Set<ModuleId>,
): boolean {
  return need.moduleIds.length > 0 && need.moduleIds.every(moduleId => enabledModuleIds.has(moduleId));
}