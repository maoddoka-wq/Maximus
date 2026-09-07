import {
  Building2,
  CreditCard,
  FileBarChart,
  FileClock,
  FolderKanban,
  Gauge,
  GitBranch,
  LayoutGrid,
  ListChecks,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ModuleId } from './store';
import { moduleRegistry } from './module-registry';

export type Icon = LucideIcon;
export type Session = 'admin' | `employee:${string}` | `company:${string}`;
export type SidebarFeature = { href: string; label: string; icon: Icon };
export type SidebarFeatureGroup = { label: string; items: SidebarFeature[] };
export type NavigationItem = {
  href: string;
  label: string;
  icon: Icon;
  module?: ModuleId | null;
  peopleAdminOnly?: boolean;
};

export const adminNav: NavigationItem[] = [
  { href: '/maximus/dashboard', label: 'Vue d’ensemble', icon: Gauge },
  { href: '/maximus/controle', label: 'Contrôle & coordination', icon: ListChecks },
  { href: '/maximus/entreprises', label: 'Entreprises', icon: Building2 },
  { href: '/maximus/entreprises/organisation', label: 'Organisation & accès', icon: GitBranch },
  { href: '/maximus/demandes', label: 'Demandes', icon: FileClock },
  { href: '/maximus/modules', label: 'Modules', icon: LayoutGrid },
  { href: '/maximus/secteurs', label: 'Secteurs d’activité', icon: Building2 },
  { href: '/maximus/abonnements', label: 'Abonnements', icon: CreditCard },
  { href: '/maximus/journal', label: 'Journal d’activité', icon: FileBarChart },
];

const koraCoreNav: NavigationItem[] = [
  { href: '/kora/dashboard', label: 'Vue d’ensemble', icon: Gauge, module: null },
  { href: '/kora/controle', label: 'Contrôle & coordination', icon: ListChecks, module: null },
  { href: '/kora/organisation', label: 'Organisation', icon: GitBranch, module: null, peopleAdminOnly: true },
];

export const koraNav: NavigationItem[] = [
  ...koraCoreNav,
  ...moduleRegistry.map(module => ({
    href: module.path,
    label: module.name,
    icon: module.icon,
    module: module.id,
  })),
];