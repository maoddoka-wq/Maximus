import { commerceTabDefinitions } from './commerce-permissions';
import { ecommerceFeatureDefinitions } from './ecommerce-features';
import { featureSlug } from './permission-keys';
import { stockSubmodules, type Module } from './store';

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
  return (Array.isArray(module.features) ? module.features : []).map(feature => ({ id: featureSlug(feature), label: feature }));
}

export function getEffectiveModuleFeatureIds(module: Module, allowedFeatureIds?: string[]) {
  const allFeatureIds = getModuleFeatureOptions(module).map(feature => feature.id);
  if (!Array.isArray(allowedFeatureIds)) return new Set(allFeatureIds);

  return new Set(allowedFeatureIds.filter(featureId => allFeatureIds.includes(featureId)));
}