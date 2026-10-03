/** @jsxRuntime automatic */
/** @jsxImportSource react */
import type { SidebarFeatureGroup } from '@/lib/navigation';
import { findActiveGroup } from '@/lib/company-navigation';
import { WorkspaceTabs } from '@/components/workspace-tabs';

/**
 * Shared horizontal rail for the "horizontal" navigation mode. It is generated
 * from the already permission-filtered sidebar groups of the App.
 */
export function CompanyFeatureRail({
  groups,
  location,
  onNavigate,
}: {
  groups: SidebarFeatureGroup[];
  location: string;
  onNavigate: (path: string) => void;
}) {
  const active = findActiveGroup(location, groups);
  if (!active || active.group.items.length === 0) return null;
  return (
    <div data-testid="company-feature-rail" data-module={active.group.label} className="mb-5">
      <WorkspaceTabs
        items={active.group.items.map(item => ({ id: item.href, label: item.label, icon: item.icon }))}
        activeId={active.activeHref}
        onChange={onNavigate}
        ariaLabel={`Fonctionnalités ${active.group.label}`}
        testIdPrefix="company-feature-rail-item"
      />
    </div>
  );
}
