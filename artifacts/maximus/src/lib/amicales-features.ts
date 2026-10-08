export const amicaleFeatureDefinitions = [
  { id: 'dashboard', label: 'Tableau de bord' },
  { id: 'membres', label: 'Membres' },
  { id: 'cotisations', label: 'Cotisations' },
  { id: 'depenses', label: 'Dépenses' },
  { id: 'activites', label: 'Activités' },
  { id: 'annonces', label: 'Annonces' },
  { id: 'bureau', label: 'Bureau' },
  { id: 'rapports', label: 'Rapports' },
] as const;

const viewOnly = (featureIds: readonly string[]) =>
  Object.fromEntries(featureIds.map(featureId => [featureId, ['voir']]));

const manage = (featureIds: readonly string[]) =>
  Object.fromEntries(featureIds.map(featureId => [featureId, ['voir', 'créer', 'modifier']]));

const allFeatures = amicaleFeatureDefinitions.map(feature => feature.id);

export function resolveAmicaleAllowedFeatureIds(access?: {
  featureIds?: readonly string[] | null;
  configuration?: Record<string, unknown> | null;
}): string[] {
  const validIds = new Set<string>(allFeatures);
  const normalizeIds = (values: readonly string[] | null | undefined) =>
    [...new Set((values ?? []).filter(value => validIds.has(value)))];
  const selectedFeatureIds = normalizeIds(access?.featureIds);
  const configuration = access?.configuration ?? {};

  if (configuration.featureScope === 'explicit' || selectedFeatureIds.length > 0) {
    return selectedFeatureIds;
  }

  const packIds = Array.isArray(configuration.packIds)
    ? configuration.packIds.filter((value): value is string => typeof value === 'string')
    : [];
  if (packIds.length > 0) {
    return normalizeIds(amicaleFeaturePacks
      .filter(pack => packIds.includes(pack.id))
      .flatMap(pack => pack.featureIds));
  }

  // An active module without an explicit feature scope exposes its full manifest.
  return [...allFeatures];
}

export const amicaleFeaturePacks = [
  {
    id: 'amicale-consultation',
    name: 'Consultation de l’amicale',
    description: 'Consulter les membres et les informations de la vie étudiante.',
    featureIds: ['dashboard', 'membres', 'activites', 'annonces'],
    featurePermissions: viewOnly(['dashboard', 'membres', 'activites', 'annonces']),
  },
  {
    id: 'amicale-membres',
    name: 'Gestion des membres',
    description: 'Gérer les adhérents et la composition du bureau.',
    featureIds: ['dashboard', 'membres', 'bureau'],
    featurePermissions: {
      dashboard: ['voir'],
      ...manage(['membres', 'bureau']),
    },
  },
  {
    id: 'amicale-finances',
    name: 'Trésorerie',
    description: 'Enregistrer les cotisations, les reçus et les dépenses à approuver.',
    featureIds: ['dashboard', 'cotisations', 'depenses', 'rapports'],
    featurePermissions: {
      dashboard: ['voir'],
      ...manage(['cotisations', 'depenses']),
      rapports: ['voir'],
    },
  },
  {
    id: 'amicale-activites',
    name: 'Vie étudiante',
    description: 'Organiser les activités et publier les annonces de l’amicale.',
    featureIds: ['dashboard', 'activites', 'annonces'],
    featurePermissions: {
      dashboard: ['voir'],
      ...manage(['activites', 'annonces']),
    },
  },
  {
    id: 'amicales-employe',
    name: 'Membre de l’amicale',
    description: 'Consulter les activités et les annonces accessibles aux membres.',
    featureIds: ['dashboard', 'activites', 'annonces'],
    featurePermissions: viewOnly(['dashboard', 'activites', 'annonces']),
  },
  {
    id: 'amicales-manager',
    name: 'Responsable d’amicale',
    description: 'Gérer les membres, les finances, les activités et la gouvernance.',
    featureIds: [...allFeatures],
    featurePermissions: {
      dashboard: ['voir'],
      ...manage(['membres', 'cotisations', 'depenses', 'activites', 'annonces', 'bureau']),
      rapports: ['voir'],
    },
  },
];
