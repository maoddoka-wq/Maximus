import type { ModuleId } from './store';

export function featureSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9à-ÿ]+/gi, '-')
    .replace(/^-|-$/g, '');
}

export function permissionFeatureKey(moduleId: ModuleId, feature: string) {
  return `${moduleId}:menu:${featureSlug(feature)}`;
}