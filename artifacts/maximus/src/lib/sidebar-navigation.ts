import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FileBarChart,
  Gauge,
  History,
  LayoutGrid,
  Package,
  Settings,
  ShoppingCart,
  ShoppingBag,
  Store,
  Users,
  WalletCards,
  Warehouse,
} from 'lucide-react';
import {
  commerceTabDefinitions,
  type CommerceTabId,
} from './commerce-permissions';
import { getSelectedFeatureIds } from './employee-permissions';
import { featureSlug } from './permission-keys';
import { presenceFeatureDefinitions } from './presence-features';
import {
  stockSubmodules,
  type Module,
  type ModuleId,
  type OrgNode,
  type Role,
} from './store';
import type { Icon, SidebarFeatureGroup } from './navigation';

const commerceTabIcons: Record<CommerceTabId, Icon> = {
  dashboard: Gauge,
  sales: ShoppingCart,
  products: Package,
  clients: Users,
  suppliers: Store,
  purchases: Package,
  expenses: ArrowDownToLine,
  cash: WalletCards,
  credit: CreditCard,
  invoices: FileBarChart,
  returns: ArrowUpFromLine,
  reports: FileBarChart,
  activity: History,
  team: Users,
  settings: Settings,
};

const stockFeatureIcons: Record<string, Icon> = {
  dashboard: Gauge,
  products: Package,
  entries: ArrowDownToLine,
  exits: ArrowUpFromLine,
  requests: ClipboardCheck,
  inventory: ClipboardCheck,
  reports: FileBarChart,
  settings: Settings,
  references: Warehouse,
  users: Users,
};

const ecommerceFeatureIcons: Record<string, Icon> = {
  dashboard: Gauge,
  catalogue: Package,
  commandes: ShoppingCart,
  clients: Users,
  promotions: CreditCard,
  livraisons: Warehouse,
  parametres: Settings,
};

type SidebarNavigationInput = {
  allowed: ModuleId[];
  configuredModules: Module[];
  employeeRole: Role | null;
  employeeNode: OrgNode | null;
  commerceTabIds?: string[];
  stockPermissions?: Record<string, string[]>;
};

export function buildSidebarFeatureGroups({
  allowed,
  configuredModules,
  employeeRole,
  employeeNode,
  commerceTabIds,
  stockPermissions,
}: SidebarNavigationInput): SidebarFeatureGroup[] {
  return allowed.flatMap(moduleId => {
    const module = configuredModules.find(item => item.id === moduleId);
    if (!module) return [];
    const selectedFeatureIds = getSelectedFeatureIds(
      employeeRole,
      module,
      employeeNode?.moduleFeatures?.[module.id],
    );

    const items = moduleId === 'commerce'
      ? commerceTabDefinitions
        .filter(tab => commerceTabIds?.includes(tab.id))
        .map(tab => ({
          href: `/kora/commerce?tab=${tab.id}`,
          label: tab.label,
          icon: commerceTabIcons[tab.id],
        }))
      : moduleId === 'stocks'
        ? stockSubmodules
          .filter(submodule => stockPermissions?.[submodule.id]?.includes('voir'))
          .map(submodule => ({
            href: `/kora/stocks?tab=${submodule.id}`,
            label: submodule.name,
            icon: stockFeatureIcons[submodule.id] ?? Warehouse,
          }))
        : moduleId === 'ecommerce'
          ? module.features
            .map(feature => featureSlug(feature))
            .filter(featureId => selectedFeatureIds.has(featureId))
            .map(featureId => ({
              href: `/kora/ecommerce?tab=${featureId}`,
              label: module.features.find(feature => featureSlug(feature) === featureId) ?? featureId,
              icon: ecommerceFeatureIcons[featureId] ?? ShoppingBag,
            }))
        : moduleId === 'presences'
          ? module.features
            .map(feature => ({
              feature,
              definition: presenceFeatureDefinitions.find(item => item.label === feature),
            }))
            .filter(({ feature, definition }) => Boolean(definition && selectedFeatureIds.has(featureSlug(feature))))
            .map(({ feature, definition }) => ({
              href: `/kora/presences?tab=${definition?.tab ?? 'dashboard'}`,
              label: feature,
              icon: CalendarDays,
            }))
          : module.features
            .filter(feature => selectedFeatureIds.has(featureSlug(feature)))
            .map(feature => featureSlug(feature))
            .map(featureId => ({
              href: `/kora/${moduleId}?feature=${featureId}`,
              label: module.features.find(feature => featureSlug(feature) === featureId) ?? featureId,
              icon: moduleId === 'ventes'
                ? ShoppingCart
                : moduleId === 'finance'
                  ? WalletCards
                  : moduleId === 'rh'
                    ? Users
                    : LayoutGrid,
            }));

    return items.length ? [{ label: module.name, items }] : [];
  });
}