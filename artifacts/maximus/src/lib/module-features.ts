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
  return normalizeValuesAgainstOptions(values, options);
}

function normalizeValuesAgainstOptions(
  values: Iterable<string>,
  options: readonly ModuleFeatureOption[],
) {
  const byId = new Map(options.map(option => [option.id, option.id]));
  const byLabel = new Map(options.map(option => [featureSlug(option.label), option.id]));
  const unaccented = (value: string) => featureSlug(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const byAlias = new Map(options.flatMap(option => [
    [unaccented(option.id), option.id],
    [unaccented(option.label), option.id],
  ]));

  return [...new Set(
    [...values]
      .map(value => byId.get(value) ?? byLabel.get(featureSlug(value)) ?? byAlias.get(unaccented(value)))
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
  if (module.id === 'immobilier') {
    return [
      { id: 'dashboard', label: 'Tableau de bord' },
      { id: 'biens', label: 'Biens' },
      { id: 'annonces', label: 'Annonces' },
      { id: 'prospects', label: 'Prospects' },
      { id: 'visites', label: 'Visites' },
      { id: 'mandats', label: 'Mandats' },
      { id: 'agents', label: 'Agents' },
      { id: 'rapports', label: 'Rapports' },
      { id: 'parametres', label: 'Paramètres' },
      { id: 'vitrine-publique', label: 'Vitrine publique' },
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
    const normalizedPayrollIds = new Set(normalizePayrollFeatureIds(module.features));
    return payrollFeatureDefinitions
      .filter(feature => normalizedPayrollIds.has(feature.id) || module.features.some(value => featureSlug(value) === feature.id))
      .map(feature => ({ id: feature.id, label: feature.label }));
  }
  return (Array.isArray(module.features) ? module.features : []).map(feature => ({ id: featureSlug(feature), label: feature }));
}

export function normalizeModuleFeatureIds(module: Module, values: Iterable<string>) {
  const rawValues = [...values].map(value => {
    if (module.id === 'commerce') {
      const aliases: Record<string, string> = { 'devis-et-commandes': 'sales', 'chiffre-d-affaires': 'dashboard' };
      return aliases[featureSlug(value)] ?? value;
    }
    if (module.id !== 'paie') return value;
    return normalizePayrollFeatureIds([value])[0] ?? value;
  });
  return normalizeValuesAgainstOptions(
    rawValues,
    getModuleFeatureOptions(module),
  );
}

export function getEffectiveModuleFeatureIds(module: Module, allowedFeatureIds?: string[]) {
  const allFeatureIds = getModuleFeatureOptions(module).map(feature => feature.id);
  if (!Array.isArray(allowedFeatureIds)) return new Set(allFeatureIds);

  return new Set(normalizeModuleFeatureIds(module, allowedFeatureIds).filter(featureId => allFeatureIds.includes(featureId)));
}

export function normalizeFeatureIdsForSelectedPacks(
  module: Module,
  values: Iterable<string>,
  selectedPackIds: Iterable<string>,
) {
  const featureIds = [...getEffectiveModuleFeatureIds(module, [...values])];
  const packIds = [...selectedPackIds];
  if (packIds.length === 0) return featureIds;

  const selectedPackFeatures = new Set(
    (module.featurePacks ?? [])
      .filter(pack => packIds.includes(pack.id))
      .flatMap(pack => normalizeModuleFeatureIds(module, pack.featureIds)),
  );
  return featureIds.filter(featureId => selectedPackFeatures.has(featureId));
}

/** Never treat pack references as new features or silently hide broken packs. */
export function getModulePackError(module: Module, packIds: readonly string[]): string | null {
  for (const id of packIds) {
    const pack = module.featurePacks?.find(item => item.id === id);
    if (!pack) return `Le pack « ${id} » n’est plus publié. Retirez-le puis choisissez à nouveau.`;
    const missing = pack.featureIds.filter(value => normalizeModuleFeatureIds(module, [value]).length === 0);
    if (missing.length) return `Le pack « ${pack.name} » référence une fonctionnalité absente : ${missing.join(', ')}. Choisissez un autre pack ou des fonctionnalités individuelles.`;
  }
  return null;
}