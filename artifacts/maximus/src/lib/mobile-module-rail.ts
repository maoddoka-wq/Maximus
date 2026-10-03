import { getMostSpecificNavigationHref, normalizeRoutePath, type SidebarFeatureGroup } from '@/lib/navigation';

export type MobileModuleRail = {
  items: { id: string; label: string }[];
  activeId: string;
};

/**
 * Builds a phone navigation rail for one company module from the already
 * permission-filtered sidebar groups. Nothing is added: items are exactly the
 * sidebar entries whose route is the module route.
 */
export function resolveMobileModuleRail(
  location: string,
  groups: readonly SidebarFeatureGroup[],
  modulePath: string,
  defaultFeature = 'dashboard',
): MobileModuleRail | null {
  if (normalizeRoutePath(location) !== modulePath) return null;
  const items = groups
    .flatMap(group => group.items)
    .filter(item => normalizeRoutePath(item.href) === modulePath)
    .map(item => ({ id: item.href, label: item.label }));
  if (items.length < 2) return null;
  const hrefs = items.map(item => item.id);
  const activeId =
    getMostSpecificNavigationHref(location, hrefs)
    ?? hrefs.find(href => href.endsWith(`feature=${defaultFeature}`))
    ?? hrefs[0];
  return { items, activeId };
}
