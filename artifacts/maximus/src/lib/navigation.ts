import {
  BookOpen,
  Building2,
  CreditCard,
  FileBarChart,
  FileClock,
  FolderKanban,
  Gauge,
  GitBranch,
  LayoutGrid,
  ListChecks,
  ShieldAlert,
  Settings,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ModuleId } from './store';
import { moduleRegistry } from './module-registry';
import { companyWorkspaceFeatureForPath } from './company-workspace-features';

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

function queryParamsFromPath(path: string): URLSearchParams {
  const queryIndex = path.indexOf('?');
  if (queryIndex === -1) return new URLSearchParams();
  return new URLSearchParams(path.slice(queryIndex + 1).split('#', 1)[0]);
}

export function getMostSpecificNavigationHref(path: string, hrefs: readonly string[]): string | null {
  const currentRoute = normalizeRoutePath(path);
  const currentQuery = queryParamsFromPath(path);
  return hrefs
    .map(href => ({
      href,
      route: normalizeRoutePath(href),
      query: queryParamsFromPath(href),
    }))
    .filter(({ route, query }) => {
      const routeMatches = currentRoute === route || currentRoute.startsWith(`${route}/`);
      const queryMatches = [...query].every(([key, value]) => currentQuery.getAll(key).includes(value));
      return routeMatches && queryMatches;
    })
    .sort((a, b) =>
      b.route.length - a.route.length || [...b.query].length - [...a.query].length,
    )[0]?.href ?? null;
}

export const adminNav: NavigationItem[] = [
  { href: '/maximus/dashboard', label: 'Vue d’ensemble', icon: Gauge },
  { href: '/maximus/assistant', label: 'MAXI', icon: Sparkles },
  { href: '/maximus/controle', label: 'Contrôle & coordination', icon: ListChecks },
  { href: '/maximus/surveillance', label: 'Détecteur de problèmes', icon: ShieldAlert },
  { href: '/maximus/entreprises', label: 'Entreprises', icon: Building2 },
  { href: '/maximus/entreprises/organisation', label: 'Organisation & accès', icon: GitBranch },
  { href: '/maximus/demandes', label: 'Demandes', icon: FileClock },
  { href: '/maximus/modules', label: 'Modules', icon: LayoutGrid },
  { href: '/maximus/secteurs', label: 'Secteurs d’activité', icon: Building2 },
  { href: '/maximus/abonnements', label: 'Abonnements', icon: CreditCard },
  { href: '/maximus/journal', label: 'Journal d’activité', icon: FileBarChart },
  { href: '/maximus/parametres/portefeuille', label: 'Réglages MAXIMUS', icon: Settings },
];

export const adminNavGroups: SidebarFeatureGroup[] = [
  {
    label: 'Accueil',
    items: adminNav.filter(item => item.href === '/maximus/dashboard' || item.href === '/maximus/assistant'),
  },
  {
    label: 'Pilotage',
    items: adminNav.filter(item => item.href === '/maximus/controle' || item.href === '/maximus/surveillance'),
  },
  {
    label: 'Entreprises',
    items: adminNav.filter(item =>
      ['/maximus/entreprises', '/maximus/entreprises/organisation', '/maximus/demandes'].includes(item.href),
    ),
  },
  {
    label: 'Catalogue',
    items: adminNav.filter(item => item.href === '/maximus/modules' || item.href === '/maximus/secteurs'),
  },
  {
    label: 'Suivi',
    items: adminNav.filter(item => item.href === '/maximus/abonnements' || item.href === '/maximus/journal'),
  },
  {
    label: 'Configuration',
    items: adminNav.filter(item => item.href === '/maximus/parametres/portefeuille'),
  },
];

const companyCoreNav: NavigationItem[] = [
  { href: '/entreprise/dashboard', label: 'Vue d’ensemble', icon: Gauge, module: null },
  { href: '/entreprise/controle', label: 'Contrôle & coordination', icon: ListChecks, module: null },
  { href: '/entreprise/organisation', label: 'Organisation & accès', icon: GitBranch, module: null, peopleAdminOnly: true },
  { href: '/entreprise/guide-configuration', label: 'Guide de configuration', icon: BookOpen, module: null, peopleAdminOnly: true },
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

export { companyWorkspaceFeatureForPath };