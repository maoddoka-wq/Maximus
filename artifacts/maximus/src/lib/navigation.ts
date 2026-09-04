import {
  Boxes,
  Building2,
  CreditCard,
  FileBarChart,
  FileClock,
  FolderKanban,
  Gauge,
  GitBranch,
  LayoutGrid,
  ListChecks,
  Package,
  ShoppingCart,
  Store,
  UserRoundCog,
  Users,
  WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ModuleId } from './store';

export type Icon = LucideIcon;
export type Session = 'admin' | 'kora' | `employee:${string}` | `company:${string}`;
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

export const koraNav: NavigationItem[] = [
  { href: '/kora/dashboard', label: 'Vue d’ensemble', icon: Gauge, module: null },
  { href: '/kora/controle', label: 'Contrôle & coordination', icon: ListChecks, module: null },
  { href: '/kora/organisation', label: 'Organisation', icon: GitBranch, module: null, peopleAdminOnly: true },
  { href: '/kora/commerce', label: 'Gestion commerciale', icon: ShoppingCart, module: 'commerce' },
  { href: '/kora/ventes', label: 'Ventes', icon: CreditCard, module: 'ventes' },
  { href: '/kora/achats', label: 'Achats', icon: Store, module: 'achats' },
  { href: '/kora/stocks', label: 'Gestion de stock', icon: Boxes, module: 'stocks' },
  { href: '/kora/finance', label: 'Finance', icon: WalletCards, module: 'finance' },
  { href: '/kora/comptabilite', label: 'Comptabilité', icon: FileBarChart, module: 'comptabilite' },
  { href: '/kora/rh', label: 'Ressources humaines', icon: UserRoundCog, module: 'rh' },
  { href: '/kora/presences', label: 'Présences', icon: FileClock, module: 'presences' },
  { href: '/kora/paie', label: 'Paie', icon: CreditCard, module: 'paie' },
  { href: '/kora/crm', label: 'CRM / Clients', icon: Users, module: 'crm' },
  { href: '/kora/fournisseurs', label: 'Fournisseurs', icon: Store, module: 'fournisseurs' },
  { href: '/kora/logistique', label: 'Logistique', icon: Package, module: 'logistique' },
  { href: '/kora/documents', label: 'Documents', icon: FolderKanban, module: 'documents' },
  { href: '/kora/rapports', label: 'Rapports', icon: FileBarChart, module: 'rapports' },
];