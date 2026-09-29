import { getEffectiveModuleFeatureIds, normalizeModuleFeatureIds } from './module-features';
import type { Module } from './store';

export function getFeatureIdsForSelectedPacks(
  module: Module,
  packIds: readonly string[],
) {
  const featureIds = (module.featurePacks ?? [])
    .filter(pack => packIds.includes(pack.id))
    .flatMap(pack => pack.featureIds);

  return normalizeModuleFeatureIds(module, featureIds);
}

export function getFeaturesAfterPackChange(
  module: Module,
  nextPackIds: readonly string[],
  currentFeatureIds: readonly string[] | undefined,
  hasExplicitFeatureSelection: boolean,
) {
  if (hasExplicitFeatureSelection) {
    return normalizeModuleFeatureIds(module, currentFeatureIds ?? []);
  }
  if (nextPackIds.length > 0) return getFeatureIdsForSelectedPacks(module, nextPackIds);
  return undefined;
}

export function toggleOrganizationFeatureSelection(
  module: Module,
  selectedFeatureIds: readonly string[],
  featureId: string,
) {
  const options = getEffectiveModuleFeatureIds(module);
  if (!options.has(featureId)) {
    return normalizeModuleFeatureIds(module, selectedFeatureIds);
  }

  const selected = new Set(normalizeModuleFeatureIds(module, selectedFeatureIds));
  if (selected.has(featureId)) selected.delete(featureId);
  else selected.add(featureId);

  return [...getEffectiveModuleFeatureIds(module, [...selected])];
}
