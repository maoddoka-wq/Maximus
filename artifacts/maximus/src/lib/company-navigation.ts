import type { Company } from './store';
import {
  getMostSpecificNavigationHref,
  type Icon,
  type SidebarFeature,
  type SidebarFeatureGroup,
} from './navigation';
import type { CompanyNavigationMode } from './company-navigation-api';

export type { CompanyNavigationMode };

export function normalizeNavigationMode(value: unknown): CompanyNavigationMode {
  return value === 'horizontal' ? 'horizontal' : 'menu';
}

export function companyNavigationMode(
  company: Pick<Company, 'moduleNavigationMode'> | null | undefined,
): CompanyNavigationMode {
  return normalizeNavigationMode(company?.moduleNavigationMode);
}

export function companyNavigationCustomAllowed(
  company: Pick<Company, 'navigationCustomAllowed'> | null | undefined,
): boolean {
  return company?.navigationCustomAllowed === true;
}

/** Only company administrators with an explicit MAXIMUS grant see the control. */
export function canShowNavigationControl(input: { companyAdmin: boolean; customAllowed: boolean }): boolean {
  return input.companyAdmin === true && input.customAllowed === true;
}

export type ModuleEntry = {
  label: string;
  href: string;
  icon: Icon;
  itemHrefs: string[];
};

function isDashboardLike(href: string): boolean {
  const query = href.split('?')[1] ?? '';
  return !query || /dashboard|tableau-de-bord/.test(query);
}

/** First permitted feature, preferring the module dashboard when it is part of the filtered items. */
export function moduleEntryHref(items: SidebarFeature[]): SidebarFeature | undefined {
  return items.find(item => isDashboardLike(item.href)) ?? items[0];
}

/** One link per permission-filtered group; groups without items are dropped. */
export function buildModuleEntries(groups: SidebarFeatureGroup[]): ModuleEntry[] {
  return groups.flatMap(group => {
    const entry = moduleEntryHref(group.items);
    if (!entry) return [];
    return [{
      label: group.label,
      href: entry.href,
      icon: entry.icon,
      itemHrefs: group.items.map(item => item.href),
    }];
  });
}

export function activeNavigationHref(location: string, groups: SidebarFeatureGroup[], extraHrefs: string[] = []): string | null {
  return getMostSpecificNavigationHref(location, [
    ...extraHrefs,
    ...groups.flatMap(group => group.items.map(item => item.href)),
  ]);
}

export function findActiveGroup(
  location: string,
  groups: SidebarFeatureGroup[],
): { group: SidebarFeatureGroup; activeHref: string } | null {
  const activeHref = activeNavigationHref(location, groups);
  if (!activeHref) return null;
  const group = groups.find(item => item.items.some(feature => feature.href === activeHref));
  return group ? { group, activeHref } : null;
}

export function isModuleEntryActive(entry: ModuleEntry, activeHref: string | null | undefined): boolean {
  return Boolean(activeHref && entry.itemHrefs.includes(activeHref));
}

/** A cached remote grant may only narrow, never widen, the current bootstrap grant. */
export function effectiveCustomAllowed(companyGrant: boolean, remoteGrant: boolean | null | undefined): boolean {
  return companyGrant === true && (remoteGrant === undefined || remoteGrant === null || remoteGrant === true);
}
