export const payrollFeatureDefinitions = [
  { id: 'tableau-de-bord', label: 'Tableau de bord' },
  { id: 'bénéficiaires', label: 'Bénéficiaires' },
  { id: 'préparer-une-paie', label: 'Préparer une paie' },
  { id: 'validation', label: 'Validation' },
  { id: 'virements', label: 'Virements' },
  { id: 'solde-de-paie', label: 'Solde de paie' },
  { id: 'historique', label: 'Historique' },
] as const;

export type PayrollFeatureId = (typeof payrollFeatureDefinitions)[number]['id'];

const payrollFeatureAliases: Record<string, PayrollFeatureId> = {
  dashboard: 'tableau-de-bord',
  'tableau-de-bord': 'tableau-de-bord',
  beneficiaires: 'bénéficiaires',
  bénéficiaires: 'bénéficiaires',
  preparation: 'préparer-une-paie',
  'préparer-une-paie': 'préparer-une-paie',
  validation: 'validation',
  virements: 'virements',
  'solde-paie': 'solde-de-paie',
  'solde-de-paie': 'solde-de-paie',
  historique: 'historique',
};

export function normalizePayrollFeatureId(featureId: string): PayrollFeatureId | null {
  return payrollFeatureAliases[featureId] ?? null;
}

export function normalizePayrollFeatureIds(featureIds: Iterable<string>): PayrollFeatureId[] {
  return [...new Set(
    [...featureIds]
      .map(normalizePayrollFeatureId)
      .filter((featureId): featureId is PayrollFeatureId => Boolean(featureId)),
  )];
}

export function normalizePayrollPermissionKey(key: string): string {
  const prefix = 'paie:menu:';
  if (!key.startsWith(prefix)) return normalizePayrollFeatureId(key) ?? key;
  const featureId = normalizePayrollFeatureId(key.slice(prefix.length));
  return featureId ? `${prefix}${featureId}` : key;
}

export function normalizePayrollPermissionMap(
  permissions: Record<string, string[]> | Partial<Record<string, string[]>> | undefined,
): Record<string, string[]> {
  if (!permissions) return {};
  return Object.entries(permissions).reduce<Record<string, string[]>>((normalized, [key, values]) => {
    const normalizedKey = normalizePayrollPermissionKey(key);
    normalized[normalizedKey] = [...new Set([...(normalized[normalizedKey] ?? []), ...(values ?? [])])];
    return normalized;
  }, {});
}