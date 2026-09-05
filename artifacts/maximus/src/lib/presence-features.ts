import { featureSlug } from './permission-keys';

export const presenceFeatureDefinitions = [
  { tab: 'dashboard', label: 'Tableau de bord' },
  { tab: 'clock', label: 'Pointage' },
  { tab: 'presence', label: 'Présences' },
  { tab: 'absence', label: 'Absences' },
  { tab: 'late', label: 'Retards' },
  { tab: 'schedules', label: 'Horaires' },
  { tab: 'planning', label: 'Planning' },
  { tab: 'breaks', label: 'Pauses' },
  { tab: 'worked', label: 'Heures travaillées' },
  { tab: 'overtime', label: 'Heures supplémentaires' },
  { tab: 'missions', label: 'Missions' },
  { tab: 'leave', label: 'Congés' },
  { tab: 'holidays', label: 'Jours fériés' },
  { tab: 'history', label: 'Historique' },
  { tab: 'reports', label: 'Rapports' },
  { tab: 'settings', label: 'Paramètres' },
] as const;

const id = (label: string) => featureSlug(label);

export const presenceFeatureDependencies: Partial<Record<string, string[]>> = {
  [id('Présences')]: [id('Pointage')],
  [id('Retards')]: [id('Pointage')],
  [id('Pauses')]: [id('Pointage')],
  [id('Heures travaillées')]: [id('Pointage')],
  [id('Heures supplémentaires')]: [id('Heures travaillées')],
  [id('Rapports')]: [id('Présences'), id('Heures travaillées')],
};