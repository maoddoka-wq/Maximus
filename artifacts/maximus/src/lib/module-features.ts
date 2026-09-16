import { commerceTabDefinitions } from './commerce-permissions';
import { ecommerceFeatureDefinitions } from './ecommerce-features';
import { featureSlug } from './permission-keys';
import { normalizePayrollFeatureIds, payrollFeatureDefinitions } from './payroll-features';
import { presenceFeatureDefinitions } from './presence-features';
import { stockSubmodules, type Module } from './store';

export interface ModuleFeatureOption {
  id: string;
  label: string;
}

type FeatureDefinition = {
  id: string;
  label: string;
};

function normalizeDefinedFeatureIds(
  values: Iterable<string>,
  definitions: readonly FeatureDefinition[],
) {
  const options = definitions.map(definition => ({
    id: definition.id,
    label: definition.label,
  }));
  const byId = new Map(options.map(option => [option.id, option]));
  const byLabel = new Map(options.map(option => [featureSlug(option.label), option]));

  return [...new Set(
    [...values]
      .map(value => {
        const direct = byId.get(value);
        if (direct) return direct.id;
        const normalized = byLabel.get(featureSlug(value));
        return normalized?.id;
      })
      .filter((featureId): featureId is string => Boolean(featureId)),
  )];
}

function optionsFromDefinitions(
  values: readonly string[],
  definitions: readonly FeatureDefinition[],
): ModuleFeatureOption[] {
  const ids = normalizeDefinedFeatureIds(values, definitions);
  const byId = new Map(definitions.map(definition => [definition.id, definition]));
  return ids
    .map(id => byId.get(id))
    .filter((feature): feature is FeatureDefinition => Boolean(feature))
    .map(feature => ({ id: feature.id, label: feature.label }));
}

export function getModuleFeatureOptions(module: Module): ModuleFeatureOption[] {
  if (module.id === 'commerce') {
    return commerceTabDefinitions.map(tab => ({ id: tab.id, label: tab.label }));
  }
  if (module.id === 'stocks') {
    return stockSubmodules.map(submodule => ({ id: submodule.id, label: submodule.name }));
  }
  if (module.id === 'ecommerce') {
    return ecommerceFeatureDefinitions.map(feature => ({ id: feature.id, label: feature.label }));
  }
  if (module.id === 'transport') {
    return [
      { id: 'overview', label: 'Vue d’ensemble' },
      { id: 'trips', label: 'Courses' },
      { id: 'drivers', label: 'Chauffeurs' },
      { id: 'vehicles', label: 'Véhicules' },
      { id: 'historique', label: 'Historique' },
      { id: 'parametres', label: 'Paramètres' },
    ];
  }
  if (module.id === 'presences') {
    return optionsFromDefinitions(
      module.features,
      presenceFeatureDefinitions.map(feature => ({
        id: featureSlug(feature.label),
        label: feature.label,
      })),
    );
  }
  if (module.id === 'paie') {
    return optionsFromDefinitions(module.features, payrollFeatureDefinitions);
  }
  return (Array.isArray(module.features) ? module.features : []).map(feature => ({ id: featureSlug(feature), label: feature }));
}

export function getEffectiveModuleFeatureIds(module: Module, allowedFeatureIds?: string[]) {
  const allFeatureIds = getModuleFeatureOptions(module).map(feature => feature.id);
  if (!Array.isArray(allowedFeatureIds)) return new Set(allFeatureIds);

  const normalized = module.id === 'paie'
    ? normalizePayrollFeatureIds(allowedFeatureIds)
    : module.id === 'presences'
      ? normalizeDefinedFeatureIds(
        allowedFeatureIds,
        presenceFeatureDefinitions.map(feature => ({
          id: featureSlug(feature.label),
          label: feature.label,
        })),
      )
      : allowedFeatureIds;

  return new Set(normalized.filter(featureId => allFeatureIds.includes(featureId)));
}