import type { Employee, OrgNode, Role } from './store';

export function getOrganizationSubtreeIds(
  nodes: Pick<OrgNode, 'id' | 'parentId'>[],
  rootId: string,
) {
  const ids = new Set([rootId]);
  const pending = [rootId];

  while (pending.length > 0) {
    const parentId = pending.pop();
    if (!parentId) continue;

    nodes.forEach(node => {
      if (node.parentId !== parentId || ids.has(node.id)) return;
      ids.add(node.id);
      pending.push(node.id);
    });
  }

  return ids;
}

export function unitHasAssignmentsInSubtree(
  data: {
    employees: Pick<Employee, 'companyId' | 'sectorId'>[];
    roles: Pick<Role, 'companyId' | 'sectorId'>[];
  },
  companyId: string,
  nodeIds: ReadonlySet<string>,
) {
  return data.employees.some(
    employee =>
      employee.companyId === companyId &&
      Boolean(employee.sectorId && nodeIds.has(employee.sectorId)),
  ) || data.roles.some(
    role =>
      role.companyId === companyId &&
      Boolean(role.sectorId && nodeIds.has(role.sectorId)),
  );
}