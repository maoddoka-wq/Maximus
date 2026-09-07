import {
  Boxes,
  CreditCard,
  FileBarChart,
  FileClock,
  FolderKanban,
  Package,
  ShoppingCart,
  ShoppingBag,
  Store,
  UserRoundCog,
  Users,
  WalletCards,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import type { ModuleId } from './module-ids';
import { modules } from './store';

export type ModuleRouteKind =
  | 'commerce'
  | 'ecommerce'
  | 'stocks'
  | 'finance'
  | 'humanResources'
  | 'presence'
  | 'reports'
  | 'operational';

export type ModuleDescriptor = {
  id: ModuleId;
  name: string;
  description: string;
  path: `/entreprise/${ModuleId}`;
  icon: LucideIcon;
  routeKind: ModuleRouteKind;
};

const moduleRouteConfig: Record<
  ModuleId,
  Pick<ModuleDescriptor, 'icon' | 'routeKind'>
> = {
  commerce: { icon: ShoppingCart, routeKind: 'commerce' },
  ecommerce: { icon: ShoppingBag, routeKind: 'ecommerce' },
  ventes: { icon: CreditCard, routeKind: 'commerce' },
  achats: { icon: Store, routeKind: 'operational' },
  stocks: { icon: Boxes, routeKind: 'stocks' },
  finance: { icon: WalletCards, routeKind: 'finance' },
  comptabilite: { icon: FileBarChart, routeKind: 'operational' },
  rh: { icon: UserRoundCog, routeKind: 'humanResources' },
  presences: { icon: FileClock, routeKind: 'presence' },
  paie: { icon: CreditCard, routeKind: 'operational' },
  crm: { icon: Users, routeKind: 'operational' },
  fournisseurs: { icon: Store, routeKind: 'operational' },
  logistique: { icon: Warehouse, routeKind: 'operational' },
  documents: { icon: FolderKanban, routeKind: 'operational' },
  rapports: { icon: FileBarChart, routeKind: 'reports' },
};

export const moduleRegistry: readonly ModuleDescriptor[] = modules.map(module => ({
  ...module,
  ...moduleRouteConfig[module.id],
  path: `/entreprise/${module.id}` as `/entreprise/${ModuleId}`,
}));

export const moduleDescriptorById = Object.fromEntries(
  moduleRegistry.map(module => [module.id, module]),
) as Record<ModuleId, ModuleDescriptor>;

export const moduleIconById = Object.fromEntries(
  moduleRegistry.map(module => [module.id, module.icon]),
) as Record<ModuleId, LucideIcon>;

export const modulePaths = new Set(moduleRegistry.map(module => module.path));

export const modulePageMeta = Object.fromEntries(
  moduleRegistry.map(module => [
    module.path,
    {
      kicker: 'Espace entreprise',
      title: module.name,
      description: module.description,
    },
  ]),
) as Record<string, { kicker: string; title: string; description: string }>;

export function moduleIdForPath(path: string): ModuleId | undefined {
  return moduleRegistry.find(module => module.path === path)?.id;
}