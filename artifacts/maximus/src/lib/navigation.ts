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

export function normalizeRoutePath(path: string): string {
  const pathOnly = path.split(/[?#]/, 1)[0] || '/';
  const withoutTrailingSlash = pathOnly.length > 1
    ? pathOnly.replace(/\/+$/, '')
    : pathOnly;
  return withoutTrailingSlash.replace(/^\/kora(?=\/|$)/, '/entreprise');
}

export function canonicalAppPath(path: string): string {
  const suffixIndex = path.search(/[?#]/);
  const pathPart = suffixIndex === -1 ? path : path.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? '' : path.slice(suffixIndex);
  return `${normalizeRoutePath(pathPart)}${suffix}`;
}

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

const companyCoreNav: NavigationItem[] = [
  { href: '/entreprise/dashboard', label: 'Vue d’ensemble', icon: Gauge, module: null },
  { href: '/entreprise/controle', label: 'Contrôle & coordination', icon: ListChecks, module: null },
  { href: '/entreprise/organisation', label: 'Organisation & accès', icon: GitBranch, module: null, peopleAdminOnly: true },
];

export const companyNav: NavigationItem[] = [
  ...companyCoreNav,
  ...moduleRegistry.map(module => ({
    href: module.path,
    label: module.name,
    icon: module.icon,
    module: module.id,
  })),
];