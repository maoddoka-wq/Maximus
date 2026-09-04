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

export function resolveFeatureDependencies(
  dependencies: Partial<Record<string, string[]>>,
  featureId: string,
) {
  const resolved: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (currentId: string) => {
    if (visited.has(currentId) || visiting.has(currentId)) return;
    visiting.add(currentId);
    for (const dependencyId of dependencies[currentId] ?? []) {
      if (visiting.has(dependencyId)) continue;
      visit(dependencyId);
      if (!resolved.includes(dependencyId)) resolved.push(dependencyId);
    }
    visiting.delete(currentId);
    visited.add(currentId);
  };

  visit(featureId);
  return resolved;
}