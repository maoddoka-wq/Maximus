export type CompanyWorkspaceFeatureId = 'controle' | 'organisation' | 'guide-configuration';

export type CompanyWorkspaceFeatureDefinition = {
  id: CompanyWorkspaceFeatureId;
  label: string;
  description: string;
  path: string;
};

export const companyWorkspaceFeatureDefinitions: CompanyWorkspaceFeatureDefinition[] = [
  {
    id: 'controle',
    label: 'Contrôle & coordination',
    description: 'Tâches, décisions, événements et suivi des opérations.',
    path: '/entreprise/controle',
  },
  {
    id: 'organisation',
    label: 'Organisation & accès',
    description: 'Structure, rôles, permissions, comptes et managers.',
    path: '/entreprise/organisation',
  },
  {
    id: 'guide-configuration',
    label: 'Guide de configuration',
    description: 'Parcours de configuration et contrôles anti-oubli.',
    path: '/entreprise/guide-configuration',
  },
];

export function companyWorkspaceFeatureForPath(path: string): CompanyWorkspaceFeatureId | null {
  const pathOnly = path.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
  return companyWorkspaceFeatureDefinitions.find(feature => feature.path === pathOnly)?.id ?? null;
}

export function normalizeCompanyWorkspaceFeatureIds(value: unknown): CompanyWorkspaceFeatureId[] {
  if (!Array.isArray(value)) return [];
  const validIds = new Set(companyWorkspaceFeatureDefinitions.map(feature => feature.id));
  return [...new Set(
    value.filter((item): item is CompanyWorkspaceFeatureId => typeof item === 'string' && validIds.has(item as CompanyWorkspaceFeatureId)),
  )];
}