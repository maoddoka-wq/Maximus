import type { Module, ModuleFeaturePack } from '@/lib/store';
import { getModuleFeatureOptions } from '@/lib/module-features';

export type FeaturePermissionMap = Partial<Record<string, string[]>>;

export type ModulePackDraft = {
  name: string;
  description: string;
  featureIds: string[];
  featurePermissions: FeaturePermissionMap;
};

export const emptyModulePackDraft = (): ModulePackDraft => ({
  name: '',
  description: '',
  featureIds: [],
  featurePermissions: {},
});

export const featurePermissionOptions: { value: string; label: string; permissions: string[] }[] = [
  { value: 'none', label: 'Non incluse', permissions: [] },
  { value: 'view', label: 'Voir seulement', permissions: ['voir'] },
  { value: 'create', label: 'Voir et créer', permissions: ['voir', 'créer'] },
  { value: 'edit', label: 'Voir, créer et modifier', permissions: ['voir', 'créer', 'modifier'] },
];

export const permissionLevelFor = (permissions?: string[]) => {
  if (!permissions?.length) return 'none';
  if (permissions.includes('modifier')) return 'edit';
  if (permissions.includes('créer')) return 'create';
  return 'view';
};

export const permissionsForLevel = (level: string): string[] =>
  [...(featurePermissionOptions.find(option => option.value === level)?.permissions ?? [])];

export const defaultFeaturePermissions = (featureIds: Iterable<string>, existing?: FeaturePermissionMap): FeaturePermissionMap =>
  Object.fromEntries([...featureIds].map(featureId => [featureId, existing?.[featureId]?.length ? [...existing[featureId]!] : ['voir']]));

export const updatePackPermission = (draft: ModulePackDraft, featureId: string, level: string): ModulePackDraft => {
  const permissions = permissionsForLevel(level);
  const featurePermissions = { ...draft.featurePermissions };

  if (permissions.length) featurePermissions[featureId] = permissions;
  else delete featurePermissions[featureId];

  return { ...draft, featureIds: Object.keys(featurePermissions), featurePermissions };
};

export const buildModulePack = (module: Module, draft: ModulePackDraft, id: string): ModuleFeaturePack | null => {
  const featureIds = getModuleFeatureOptions(module)
    .map(feature => feature.id)
    .filter(featureId => draft.featurePermissions[featureId]?.length);

  if (!draft.name.trim() || featureIds.length === 0) return null;

  return {
    id,
    name: draft.name.trim(),
    description: draft.description.trim(),
    featureIds,
    featurePermissions: Object.fromEntries(featureIds.map(featureId => [featureId, [...draft.featurePermissions[featureId]!]])),
  };
};