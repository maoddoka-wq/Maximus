import {
  CalendarDays,
  Clock3,
  FileBarChart,
  History,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type PresenceTabId =
  | 'dashboard'
  | 'clock'
  | 'presence'
  | 'absence'
  | 'schedules'
  | 'leave'
  | 'history'
  | 'reports';

export type PresenceTab = {
  id: PresenceTabId;
  label: string;
  icon: LucideIcon;
};

export const presenceTabs: PresenceTab[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: CalendarDays },
  { id: 'clock', label: 'Pointage', icon: Clock3 },
  { id: 'presence', label: 'Présences', icon: UserCheck },
  { id: 'absence', label: 'Absences', icon: Users },
  { id: 'schedules', label: 'Horaires', icon: Clock3 },
  { id: 'leave', label: 'Congés', icon: CalendarDays },
  { id: 'history', label: 'Historique', icon: History },
  { id: 'reports', label: 'Rapports', icon: FileBarChart },
];

export type PresenceRow = {
  id: string;
  name: string;
  sector: string;
  arrival: string;
  exit: string;
  pauseMinutes: number;
  workedMinutes: number;
  lateMinutes: number;
  status: string;
  issue?: string;
  statusTone: 'neutral' | 'warning' | 'danger';
};

export const presenceRows: PresenceRow[] = [
  {
    id: 'employee-awa',
    name: 'Awa Diop',
    sector: 'Commercial',
    arrival: '08:02',
    exit: '17:06',
    pauseMinutes: 60,
    workedMinutes: 484,
    lateMinutes: 0,
    status: 'Présente',
    statusTone: 'neutral',
  },
  {
    id: 'employee-mamadou',
    name: 'Mamadou Ndiaye',
    sector: 'Atelier',
    arrival: '08:22',
    exit: '—',
    pauseMinutes: 0,
    workedMinutes: 0,
    lateMinutes: 22,
    status: 'Retard',
    issue: 'Arrivée après tolérance',
    statusTone: 'warning',
  },
  {
    id: 'employee-fatou',
    name: 'Fatou Sarr',
    sector: 'Logistique',
    arrival: '08:05',
    exit: '—',
    pauseMinutes: 30,
    workedMinutes: 281,
    lateMinutes: 0,
    status: 'Présente',
    issue: 'Sortie oubliée',
    statusTone: 'warning',
  },
  {
    id: 'employee-ibrahima',
    name: 'Ibrahima Fall',
    sector: 'Atelier',
    arrival: '—',
    exit: '—',
    pauseMinutes: 0,
    workedMinutes: 0,
    lateMinutes: 0,
    status: 'Non pointé',
    issue: 'Journée non pointée',
    statusTone: 'danger',
  },
];

export type PresenceMetric = {
  label: string;
  value: string;
  detail: string;
  emphasis?: 'primary' | 'destructive';
};

export const presenceMetrics: PresenceMetric[] = [
  { label: 'Employés actifs', value: '18', detail: 'dans le périmètre' },
  {
    label: 'Présents aujourd’hui',
    value: '14',
    detail: '78 % de présence',
    emphasis: 'primary',
  },
  {
    label: 'Absents',
    value: '2',
    detail: 'non pointés inclus',
    emphasis: 'destructive',
  },
  {
    label: 'Retardataires',
    value: '3',
    detail: 'après tolérance',
    emphasis: 'primary',
  },
  { label: 'En pause', value: '1', detail: 'pause en cours' },
  { label: 'En congé', value: '2', detail: 'validés' },
  { label: 'En mission', value: '3', detail: 'actifs' },
  { label: 'Heures travaillées', value: '78 h 42', detail: 'sur la journée' },
  {
    label: 'Heures supplémentaires',
    value: '4 h 15',
    detail: 'calculées',
  },
  {
    label: 'Taux de présence',
    value: '78 %',
    detail: 'période : jour',
    emphasis: 'primary',
  },
];

export const demoDate = '2026-09-29';

export function downloadPresenceCsv(rows: PresenceRow[], date: string) {
  const csvRows = [
    ['Employé', 'Secteur', 'Arrivée', 'Sortie', 'Pause (min)', 'Temps travaillé (min)', 'Retard (min)', 'Statut'],
    ...rows.map((row) => [
      row.name,
      row.sector,
      row.arrival,
      row.exit,
      String(row.pauseMinutes),
      String(row.workedMinutes),
      String(row.lateMinutes),
      row.status,
    ]),
  ];
  const csv = csvRows
    .map((row) =>
      row.map((value) => `"${value.replaceAll('"', '""')}"`).join(','),
    )
    .join('\n');
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `presences-${date}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}