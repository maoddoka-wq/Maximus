export type PermissionLadderAction = 'voir' | 'créer' | 'modifier';

export function normalizePermissionLadder(
  permissions: readonly string[] | undefined,
): PermissionLadderAction[] {
  const selected = new Set(permissions ?? []);
  if (!selected.has('voir')) return [];

  const normalized: PermissionLadderAction[] = ['voir'];
  if (selected.has('créer')) normalized.push('créer');
  if (selected.has('créer') && selected.has('modifier')) normalized.push('modifier');

  return normalized;
}

export function togglePermissionLadder(
  permissions: readonly string[] | undefined,
  action: PermissionLadderAction,
): PermissionLadderAction[] {
  const current = normalizePermissionLadder(permissions);
  const enabled = current.includes(action);

  if (action === 'voir') return enabled ? [] : ['voir'];
  if (action === 'créer') {
    if (enabled) return current.filter(item => item === 'voir');
    return ['voir', 'créer'];
  }

  if (enabled) return current.filter(item => item !== 'modifier');
  return ['voir', 'créer', 'modifier'];
}