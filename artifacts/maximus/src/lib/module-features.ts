import { commerceTabDefinitions, commerceTabDependencies, type CommerceTabId } from './commerce-permissions';
import { featureSlug, resolveFeatureDependencies } from './permission-keys';
import { stockSubmoduleDependencies, stockSubmodules, type Module } from './store';

export interface ModuleFeatureOption {
  id: string;
  label: string;
}

export function getModuleFeatureOptions(module: Module): ModuleFeatureOption[] {
  if (module.id === 'commerce') {
    return commerceTabDefinitions.map(tab => ({ id: tab.id, label: tab.label }));
  }
  if (module.id === 'stocks') {
    return stockSubmodules.map(submodule => ({ id: submodule.id, label: submodule.name }));
  }
  return module.features.map(feature => ({ id: featureSlug(feature), label: feature }));
}

export function getModuleFeatureDependencies(module: Module, featureId: string) {
  if (module.id === 'commerce') {
    return resolveFeatureDependencies(commerceTabDependencies, featureId as CommerceTabId);
  }
  if (module.id === 'stocks') {
    return resolveFeatureDependencies(stockSubmoduleDependencies, featureId);
  }
  return resolveFeatureDependencies(module.featureDependencies ?? {}, featureId);
}

export function getEffectiveModuleFeatureIds(module: Module, allowedFeatureIds?: string[]) {
  const allFeatureIds = getModuleFeatureOptions(module).map(feature => feature.id);
  if (!allowedFeatureIds) return new Set(allFeatureIds);

  const effectiveIds = new Set(allowedFeatureIds.filter(featureId => allFeatureIds.includes(featureId)));
  [...effectiveIds].forEach(featureId => {
    getModuleFeatureDependencies(module, featureId).forEach(dependencyId => effectiveIds.add(dependencyId));
  });
  return effectiveIds;
}