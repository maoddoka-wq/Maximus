import type { ComponentType, ReactElement } from 'react';
import type { ModuleAvailability, ModuleId, SectorPreset, StoreData } from '@/lib/store';
import type { Employee } from '@/lib/store';
import type { PresencePermission } from '@/lib/employee-permissions';
import { moduleDescriptorById, moduleIdForPath } from '@/lib/module-registry';

/**
 * The screen registry contains components with different prop contracts.
 * Keeping the registry opaque prevents `any` from leaking into the router;
 * `renderScreen` is the single boundary where a route supplies its contract.
 */
type Screen = ComponentType<never>;
type Mutate = (fn: (data: StoreData) => void, message?: string) => void;
type Navigate = (path: string) => void;

function renderScreen<Props extends object>(screen: Screen, props: Props): ReactElement | null {
  const ScreenComponent = screen as ComponentType<Props>;
  return <ScreenComponent {...props} />;
}

export type AdminRouteScreens = {
  dashboard: Screen;
  control: Screen;
  organization: Screen;
  companyDetail: Screen;
  companies: Screen;
  requests: Screen;
  modules: Screen;
  sectors: Screen;
  subscriptions: Screen;
  notifications: Screen;
  journal: Screen;
  empty: Screen;
};

export function AdminRouter({
  location,
  data,
  mutate,
  notify,
  onNavigate,
  onBack,
  onModuleAccess,
  onTestSector,
  screens,
}: {
  location: string;
  data: StoreData;
  mutate: Mutate;
  notify: (message: string) => void;
  onNavigate: Navigate;
  onBack: (fallback: string) => void;
  onModuleAccess: (companyId: string, moduleId: ModuleId, status: ModuleAvailability) => Promise<void>;
  onTestSector: (preset: SectorPreset) => void;
  screens: AdminRouteScreens;
}) {
  const rawRoutePath = location.split('?')[0];
  const routePath = rawRoutePath.replace(/^\/kora(?=\/|$)/, '/entreprise');
  if (routePath === '/maximus/dashboard') {
    return renderScreen(screens.dashboard, { data, onNavigate });
  }
  if (routePath === '/maximus/controle') {
    return renderScreen(screens.control, { data, mutate, isAdmin: true, actorName: 'MAXIMUS' });
  }
  if (routePath === '/maximus/entreprises/organisation') {
    return renderScreen(screens.organization, { data, mutate, onNavigate });
  }
  const companyDetailMatch = routePath.match(/^\/maximus\/entreprises\/([^/]+)$/);
  if (companyDetailMatch) {
    const companyId = decodeURIComponent(companyDetailMatch[1]);
    const company = data.companies.find(item => item.id === companyId);
    return company ? (
      renderScreen(screens.companyDetail, {
        company,
        data,
        mutate,
        onModuleAccess,
        onBack: () => onBack('/maximus/entreprises'),
      })
    ) : (
      renderScreen(screens.empty, {
        title: 'Entreprise introuvable',
        text: 'L’espace demandé est introuvable.',
        action: () => onBack('/maximus/entreprises'),
      })
    );
  }
  if (routePath === '/maximus/entreprises') {
    return renderScreen(screens.companies, { data, mutate, onNavigate, detail: false });
  }
  if (routePath === '/maximus/demandes') {
    return renderScreen(screens.requests, { data, mutate, notify, onNavigate });
  }
  if (routePath === '/maximus/modules') {
    return renderScreen(screens.modules, { data, mutate, notify });
  }
  if (routePath === '/maximus/secteurs') {
    return renderScreen(screens.sectors, { data, mutate, onTestSector });
  }
  if (routePath === '/maximus/abonnements') {
    return renderScreen(screens.subscriptions, { data, onNavigate });
  }
  if (routePath === '/maximus/notifications') {
    return renderScreen(screens.notifications, { data, mutate, context: { isAdmin: true } });
  }
  if (routePath === '/maximus/journal') {
    return renderScreen(screens.journal, { data });
  }
  return renderScreen(screens.empty, {
    title: 'Cette vue n’existe pas encore',
    text: 'Revenez au cockpit pour poursuivre.',
    action: () => onNavigate('/maximus/dashboard'),
  });
}

export type CompanyRouteScreens = {
  dashboard: Screen;
  control: Screen;
  notifications: Screen;
  organization: Screen;
  empty: Screen;
  stocks: Screen;
  ecommerce: Screen;
  finance: Screen;
  commerce: Screen;
  operational: Screen;
  humanResources: Screen;
  presence: Screen;
  reports: Screen;
};

export function CompanyRouter({
  location,
  data,
  mutate,
  onNavigate,
  onBack,
  allowed,
  canManagePeople,
  companyAdmin,
  sectorManager,
  scopeNodeId,
  companyId,
  employee,
  presenceEmployees,
  presenceFeatureIds,
  ecommerceFeatureIds,
  hasPermission,
  hasPresencePermission,
  stockPermissions,
  commerceTabIds,
  moduleStatuses,
  singleModuleNavigation,
  screens,
}: {
  location: string;
  data: StoreData;
  mutate: Mutate;
  onNavigate: Navigate;
  onBack: (fallback: string) => void;
  allowed: ModuleId[];
  canManagePeople: boolean;
  companyAdmin: boolean;
  sectorManager: boolean;
  scopeNodeId?: string;
  companyId: string;
  employee: StoreData['employees'][number] | null;
  presenceEmployees: Employee[];
  presenceFeatureIds?: string[];
  ecommerceFeatureIds?: string[];
  hasPermission: (moduleId: ModuleId, permission: 'voir' | 'créer' | 'modifier') => boolean;
  hasPresencePermission: (permission: PresencePermission) => boolean;
  stockPermissions?: Record<string, string[]>;
  commerceTabIds?: string[];
  moduleStatuses: Record<string, ModuleAvailability>;
  singleModuleNavigation?: boolean;
  screens: CompanyRouteScreens;
}) {
  const routePath = location.split('?')[0];
  const requiredModule = moduleIdForPath(routePath);
  const maintenanceModule: ModuleId | 'controle' | undefined =
    routePath === '/entreprise/controle' ? 'controle' : requiredModule;
  if (maintenanceModule && moduleStatuses[maintenanceModule] === 'MAINTENANCE') {
    return renderScreen(screens.empty, {
      title: 'Module en maintenance',
      text: 'Ce module est temporairement indisponible pendant une opération de maintenance. Les autres modules restent accessibles.',
      action: () => onBack('/entreprise/dashboard'),
    });
  }
  if (requiredModule && !allowed.includes(requiredModule)) {
    return renderScreen(screens.empty, {
      title: 'Accès non autorisé',
      text: 'Votre rôle ne possède pas la permission Consulter pour ce module.',
      action: () => onBack('/entreprise/dashboard'),
    });
  }
  if (routePath === '/entreprise/dashboard') {
    return renderScreen(screens.dashboard, { data, onNavigate, allowed });
  }
  if (routePath === '/entreprise/controle') {
    return renderScreen(screens.control, {
      data,
      mutate,
      companyId,
      employeeId: employee?.id,
      scopeNodeId,
      actorName:
        employee
          ? `${employee.firstName} ${employee.lastName}`
          : data.companies.find(company => company.id === companyId)?.manager ?? 'Administrateur',
      isAdmin: false,
      companyAdmin,
      sectorManager,
    });
  }
  if (routePath === '/entreprise/notifications') {
    return renderScreen(screens.notifications, { data, mutate, context: { isAdmin: false, companyId } });
  }
  if (routePath === '/entreprise/profil') {
    const company = data.companies.find(item => item.id === companyId);
    return companyAdmin && company ? (
      renderScreen(screens.organization, { company, data, mutate, initialTab: 'profile' })
    ) : (
      renderScreen(screens.empty, {
        title: 'Accès réservé à l’administrateur',
        text: 'Le profil de l’entreprise est géré par son administrateur.',
        action: () => onBack('/entreprise/dashboard'),
      })
    );
  }
  if (routePath === '/entreprise/organisation' || routePath === '/entreprise/acces' || routePath === '/entreprise/autorisations' || routePath === '/entreprise/employes' || routePath === '/entreprise/roles') {
    const company = data.companies.find(item => item.id === companyId);
    const initialTab = routePath === '/entreprise/acces' || routePath === '/entreprise/autorisations' || routePath === '/entreprise/roles' ? 'roles' : routePath === '/entreprise/employes' ? 'employees' : 'structure';
    return company && (companyAdmin || sectorManager) ? (
      renderScreen(screens.organization, {
        company,
        data,
        mutate,
        initialTab,
        sectorManager: sectorManager && !companyAdmin,
        scopeNodeId: sectorManager && !companyAdmin ? scopeNodeId : undefined,
      })
    ) : (
      renderScreen(screens.empty, {
        title: 'Accès réservé',
        text: 'L’Organisation est accessible à l’administrateur de l’entreprise et aux managers de secteur.',
        action: () => onBack('/entreprise/dashboard'),
      })
    );
  }
  if (routePath === '/entreprise/stocks') {
    return renderScreen(screens.stocks, {
      companyId,
      companyUsers: data.employees.filter(item => item.companyId === companyId),
      companyServices: data.orgNodes.filter(node => node.companyId === companyId && node.type === 'service'),
      canCreate: hasPermission('stocks', 'créer'),
      canModify: hasPermission('stocks', 'modifier'),
      stockPermissions,
      singleModuleNavigation,
    });
  }
  if (routePath === '/entreprise/ecommerce') {
    return renderScreen(screens.ecommerce, {
      companyId,
      canCreate: hasPermission('ecommerce', 'créer'),
      canModify: hasPermission('ecommerce', 'modifier'),
      allowedFeatureIds: ecommerceFeatureIds,
      singleModuleNavigation,
    });
  }
  if (routePath === '/entreprise/finance') {
    return renderScreen(screens.finance, { data, mutate });
  }
  if (routePath === '/entreprise/commerce' || routePath === '/entreprise/ventes') {
    return renderScreen(screens.commerce, {
      companyId,
      data,
      mutate,
      canCreate: hasPermission('commerce', 'créer') || hasPermission('ventes', 'créer'),
      canModify: hasPermission('commerce', 'modifier') || hasPermission('ventes', 'modifier'),
      allowedTabs: commerceTabIds,
      singleModuleNavigation,
      initialTab: routePath === '/entreprise/ventes' ? 'sales' : 'dashboard',
      onNavigate,
    });
  }
  const operationalModule =
    requiredModule && moduleDescriptorById[requiredModule].routeKind === 'operational'
      ? requiredModule
      : undefined;
  if (operationalModule) {
    return renderScreen(screens.operational, {
      moduleId: operationalModule,
      data,
      mutate,
      canCreate: hasPermission(operationalModule, 'créer'),
      canModify: hasPermission(operationalModule, 'modifier'),
    });
  }
  if (routePath === '/entreprise/rh') {
    return renderScreen(screens.humanResources, { data, mutate, companyAdmin, employee, companyId });
  }
  if (routePath === '/entreprise/presences') {
    return renderScreen(screens.presence, {
      companyId,
      employees: presenceEmployees,
      nodes: data.orgNodes.filter(node => node.companyId === companyId),
      currentEmployee: employee,
      canView: hasPresencePermission('view'),
      canCreate: hasPresencePermission('create'),
      canEdit: hasPresencePermission('edit'),
      canCorrect: hasPresencePermission('correct'),
      canValidate: hasPresencePermission('validate'),
      canManage: hasPresencePermission('manage'),
      canExport: hasPresencePermission('export'),
      canDelete: hasPresencePermission('delete'),
      visibleFeatureIds: presenceFeatureIds,
      singleModuleNavigation,
    });
  }
  if (routePath === '/entreprise/rapports') {
    return renderScreen(screens.reports, { data });
  }
  return renderScreen(screens.empty, {
    title: 'Module non autorisé',
    text: `Cette vue n’est pas disponible pour cet espace (${allowed.length} modules autorisés).`,
    action: () => onBack('/entreprise/dashboard'),
  });
}