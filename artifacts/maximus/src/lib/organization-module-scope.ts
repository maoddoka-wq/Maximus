import type { ModuleId, OrgNode } from './store';

function findParent(nodes: OrgNode[], node: OrgNode) {
  if (!node.parentId) return undefined;
  return nodes.find(candidate =>
    candidate.id === node.parentId
    && candidate.companyId === node.companyId,
  );
}

function getAncestorChain(nodes: OrgNode[], node: OrgNode) {
  const chain: OrgNode[] = [];
  const visited = new Set<string>();
  let current: OrgNode | undefined = node;

  while (current && !visited.has(current.id)) {
    chain.push(current);
    visited.add(current.id);
    current = findParent(nodes, current);
  }

  return chain;
}

/** Returns the intersection of explicitly configured modules in the unit's ancestry. */
export function getEffectiveUnitModuleIds(
  nodes: OrgNode[],
  node: OrgNode | null | undefined,
): Set<ModuleId> | undefined {
  if (!node) return undefined;

  let effective: Set<ModuleId> | undefined;
  getAncestorChain(nodes, node).forEach(ancestor => {
    if (!Array.isArray(ancestor.moduleIds)) return;
    const configured = new Set(ancestor.moduleIds);
    effective = effective
      ? new Set([...effective].filter(moduleId => configured.has(moduleId)))
      : configured;
  });

  return effective;
}

/** Limits a unit's choices to company modules selected by every ancestor. */
export function getSelectableUnitModuleIds(
  nodes: OrgNode[],
  parentId: string,
  companyModuleIds: readonly ModuleId[],
): Set<ModuleId> {
  const selectable = new Set(companyModuleIds);
  if (!parentId) return selectable;

  const parent = nodes.find(node => node.id === parentId);
  if (!parent) return new Set();

  const inherited = getEffectiveUnitModuleIds(nodes, parent);
  if (!inherited) return selectable;

  return new Set([...selectable].filter(moduleId => inherited.has(moduleId)));
}