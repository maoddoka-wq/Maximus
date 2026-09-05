import { featureSlug } from './permission-keys';

export const presenceFeatureDefinitions = [
  { tab: 'dashboard', label: 'Tableau de bord' },
  { tab: 'clock', label: 'Pointage' },
  { tab: 'presence', label: 'Présences' },
  { tab: 'absence', label: 'Absences' },
  { tab: 'schedules', label: 'Horaires' },
  { tab: 'leave', label: 'Congés' },
  { tab: 'history', label: 'Historique' },
  { tab: 'reports', label: 'Rapports' },
];

const id = (label: string) => featureSlug(label);

export const presenceFeatureDependencies: Partial<Record<string, string[]>> = {
  [id('Présences')]: [id('Pointage')],
  [id('Rapports')]: [id('Pointage'), id('Présences')],
};

const permissionsFor = (featureIds: string[], permissions: string[]) =>
  Object.fromEntries(featureIds.map((featureId) => [featureId, [...permissions]]));

const featureId = (label: string) => id(label);

const consultationFeatures = [
  featureId('Tableau de bord'),
  featureId('Présences'),
  featureId('Absences'),
  featureId('Historique'),
];

const managementFeatures = [
  ...consultationFeatures,
  featureId('Pointage'),
  featureId('Horaires'),
  featureId('Congés'),
];

const supervisionFeatures = [...managementFeatures, featureId('Rapports')];

export const presenceFeaturePacks = [
  {
    id: 'presence-consultation',
    name: 'Consultation des présences',
    description: 'Consulter les indicateurs, présences, absences et historiques.',
    featureIds: consultationFeatures,
    featurePermissions: permissionsFor(consultationFeatures, ['voir']),
  },
  {
    id: 'presence-gestion',
    name: 'Gestionnaire des présences',
    description: 'Saisir le pointage et gérer les absences, horaires et congés.',
    featureIds: managementFeatures,
    featurePermissions: {
      ...permissionsFor(consultationFeatures, ['voir']),
      [featureId('Pointage')]: ['voir', 'créer'],
      [featureId('Horaires')]: ['voir', 'créer', 'modifier'],
      [featureId('Congés')]: ['voir', 'créer'],
    },
  },
  {
    id: 'presence-supervision',
    name: 'Responsable des présences',
    description: 'Superviser l’activité, corriger les données et produire les rapports.',
    featureIds: supervisionFeatures,
    featurePermissions: {
      ...permissionsFor([featureId('Tableau de bord'), featureId('Présences'), featureId('Historique')], [
        'voir',
        'créer',
        'modifier',
      ]),
      [featureId('Pointage')]: ['voir', 'créer', 'modifier'],
      [featureId('Absences')]: ['voir', 'créer', 'modifier'],
      [featureId('Horaires')]: ['voir', 'créer', 'modifier'],
      [featureId('Congés')]: ['voir', 'créer', 'modifier'],
      [featureId('Rapports')]: ['voir', 'créer', 'modifier'],
    },
  },
];