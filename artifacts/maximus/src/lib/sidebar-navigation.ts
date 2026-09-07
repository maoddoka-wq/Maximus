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
import { getModuleFeatureOptions } from './module-features';
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
  companyAdmin?: boolean;
  selectedFeatureIdsByModule?: Partial<Record<ModuleId, string[]>>;
  commerceTabIds?: string[];
  stockPermissions?: Record<string, string[]>;
};

export function buildSidebarFeatureGroups({
  allowed,
  configuredModules,
  employeeRole,
  employeeNode,
  companyAdmin = false,
  selectedFeatureIdsByModule,
  commerceTabIds,
  stockPermissions,
}: SidebarNavigationInput): SidebarFeatureGroup[] {
  return allowed.flatMap(moduleId => {
    const module = configuredModules.find(item => item.id === moduleId);
    if (!module) return [];
    const selectedFeatureIds = companyAdmin && !employeeRole
      ? new Set(
          selectedFeatureIdsByModule?.[module.id]
            ?? module.features.map(feature => featureSlug(feature)),
        )
      : getSelectedFeatureIds(
          employeeRole,
          module,
          employeeNode?.moduleFeatures?.[module.id],
        );

    const items = moduleId === 'commerce'
      ? (commerceTabIds
        ? commerceTabDefinitions.filter(tab => commerceTabIds.includes(tab.id))
        : companyAdmin
          ? commerceTabDefinitions
          : [])
        .map(tab => ({
          href: `/entreprise/commerce?tab=${tab.id}`,
          label: tab.label,
          icon: commerceTabIcons[tab.id],
        }))
      : moduleId === 'stocks'
        ? (stockPermissions
          ? stockSubmodules.filter(submodule => stockPermissions[submodule.id]?.includes('voir'))
          : companyAdmin
            ? stockSubmodules
            : [])
          .map(submodule => ({
            href: `/entreprise/stocks?tab=${submodule.id}`,
            label: submodule.name,
            icon: stockFeatureIcons[submodule.id] ?? Warehouse,
          }))
        : moduleId === 'ecommerce'
          ? getModuleFeatureOptions(module)
              .filter(feature => selectedFeatureIds.has(feature.id))
              .map(feature => ({
                href: `/entreprise/ecommerce?tab=${feature.id}`,
                label: feature.label,
                icon: ecommerceFeatureIcons[feature.id] ?? ShoppingBag,
              }))
        : moduleId === 'presences'
          ? module.features
            .map(feature => ({
              feature,
              definition: presenceFeatureDefinitions.find(item => item.label === feature),
            }))
            .filter(({ feature, definition }) => Boolean(definition && selectedFeatureIds.has(featureSlug(feature))))
            .map(({ feature, definition }) => ({
              href: `/entreprise/presences?tab=${definition?.tab ?? 'dashboard'}`,
              label: feature,
              icon: CalendarDays,
            }))
          : module.features
            .filter(feature => selectedFeatureIds.has(featureSlug(feature)))
            .map(feature => featureSlug(feature))
            .map(featureId => ({
            href: `/entreprise/${moduleId}?feature=${featureId}`,
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