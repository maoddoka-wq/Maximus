import type { ComponentType } from 'react';
import type { ModuleId, StoreData } from '@/lib/store';
import type { Employee } from '@/lib/store';
import type { PresencePermission } from '@/lib/employee-permissions';

type Screen = ComponentType<any>;
type Mutate = (fn: (data: StoreData) => void, message?: string) => void;
type Navigate = (path: string) => void;

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
  screens,
}: {
  location: string;
  data: StoreData;
  mutate: Mutate;
  notify: (message: string) => void;
  onNavigate: Navigate;
  onBack: (fallback: string) => void;
  onModuleAccess: (companyId: string, moduleId: ModuleId, enabled: boolean) => Promise<void>;
  screens: AdminRouteScreens;
}) {
  const routePath = location.split('?')[0];
  if (routePath === '/maximus/dashboard') {
    return <screens.dashboard data={data} onNavigate={onNavigate} />;
  }
  if (routePath === '/maximus/controle') {
    return <screens.control data={data} mutate={mutate} isAdmin actorName="MAXIMUS" />;
  }
  if (routePath === '/maximus/entreprises/organisation') {
    return <screens.organization data={data} mutate={mutate} onNavigate={onNavigate} />;
  }
  const companyDetailMatch = routePath.match(/^\/maximus\/entreprises\/([^/]+)$/);
  if (companyDetailMatch) {
    const companyId = decodeURIComponent(companyDetailMatch[1]);
    const company = data.companies.find(item => item.id === companyId);
    return company ? (
       <screens.companyDetail company={company} data={data} mutate={mutate} onModuleAccess={onModuleAccess} onBack={() => onBack('/maximus/entreprises')} />
    ) : (
      <screens.empty title="Entreprise introuvable" text="L’espace demandé est introuvable." action={() => onBack('/maximus/entreprises')} />
    );
  }
  if (routePath === '/maximus/entreprises') {
    return <screens.companies data={data} mutate={mutate} onNavigate={onNavigate} detail={false} />;
  }
  if (routePath === '/maximus/demandes') {
    return <screens.requests data={data} mutate={mutate} onNavigate={onNavigate} />;
  }
  if (routePath === '/maximus/modules') {
    return <screens.modules data={data} mutate={mutate} notify={notify} />;
  }
  if (routePath === '/maximus/secteurs') {
    return <screens.sectors data={data} mutate={mutate} />;
  }
  if (routePath === '/maximus/abonnements') {
    return <screens.subscriptions data={data} />;
  }
  if (routePath === '/maximus/notifications') {
    return <screens.notifications data={data} mutate={mutate} context={{ isAdmin: true }} />;
  }
  if (routePath === '/maximus/journal') {
    return <screens.journal data={data} />;
  }
  return <screens.empty title="Cette vue n’existe pas encore" text="Revenez au cockpit pour poursuivre." action={() => onNavigate('/maximus/dashboard')} />;
}

export type KoraRouteScreens = {
  dashboard: Screen;
  control: Screen;
  notifications: Screen;
  organization: Screen;
  empty: Screen;
  stocks: Screen;
  finance: Screen;
  commerce: Screen;
  operational: Screen;
  humanResources: Screen;
  presence: Screen;
  reports: Screen;
};

export function KoraRouter({
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
  hasPermission,
  hasPresencePermission,
  stockPermissions,
  commerceTabIds,
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
  hasPermission: (moduleId: ModuleId, permission: 'voir' | 'créer' | 'modifier') => boolean;
  hasPresencePermission: (permission: PresencePermission) => boolean;
  stockPermissions?: Record<string, string[]>;
  commerceTabIds?: string[];
  singleModuleNavigation?: boolean;
  screens: KoraRouteScreens;
}) {
  const routePath = location.split('?')[0];
  const routeModules: Partial<Record<string, ModuleId>> = {
    '/kora/commerce': 'commerce',
    '/kora/ventes': 'ventes',
    '/kora/achats': 'achats',
    '/kora/stocks': 'stocks',
    '/kora/finance': 'finance',
    '/kora/comptabilite': 'comptabilite',
    '/kora/rh': 'rh',
    '/kora/presences': 'presences',
    '/kora/paie': 'paie',
    '/kora/crm': 'crm',
    '/kora/fournisseurs': 'fournisseurs',
    '/kora/logistique': 'logistique',
    '/kora/documents': 'documents',
    '/kora/rapports': 'rapports',
  };
  const requiredModule = routeModules[routePath];
  if (requiredModule && !allowed.includes(requiredModule)) {
    return <screens.empty title="Accès non autorisé" text="Votre rôle ne possède pas la permission Consulter pour ce module." action={() => onBack('/kora/dashboard')} />;
  }
  if (routePath === '/kora/dashboard') {
    return <screens.dashboard data={data} onNavigate={onNavigate} allowed={allowed} />;
  }
  if (routePath === '/kora/controle') {
    return <screens.control data={data} mutate={mutate} companyId={companyId} employeeId={employee?.id} scopeNodeId={scopeNodeId} actorName={employee ? `${employee.firstName} ${employee.lastName}` : data.companies.find(company => company.id === companyId)?.manager ?? 'Administrateur'} isAdmin={false} companyAdmin={companyAdmin} sectorManager={sectorManager} />;
  }
  if (routePath === '/kora/notifications') {
    return <screens.notifications data={data} mutate={mutate} context={{ isAdmin: false, companyId }} />;
  }
  if (routePath === '/kora/profil') {
    const company = data.companies.find(item => item.id === companyId);
    return companyAdmin && company ? (
      <screens.organization company={company} data={data} mutate={mutate} initialTab="profile" />
    ) : (
      <screens.empty title="Accès réservé à l’administrateur" text="Le profil de l’entreprise est géré par son administrateur." action={() => onBack('/kora/dashboard')} />
    );
  }
  if (routePath === '/kora/organisation' || routePath === '/kora/autorisations' || routePath === '/kora/employes' || routePath === '/kora/roles') {
    const company = data.companies.find(item => item.id === companyId);
    const initialTab = routePath === '/kora/autorisations' || routePath === '/kora/roles' ? 'roles' : routePath === '/kora/employes' ? 'employees' : 'structure';
    return company && (companyAdmin || sectorManager) ? (
      <screens.organization company={company} data={data} mutate={mutate} initialTab={initialTab} sectorManager={sectorManager && !companyAdmin} scopeNodeId={sectorManager && !companyAdmin ? scopeNodeId : undefined} />
    ) : (
      <screens.empty title="Accès réservé" text="L’Organisation est accessible à l’administrateur de l’entreprise et aux managers de secteur." action={() => onBack('/kora/dashboard')} />
    );
  }
  if (routePath === '/kora/stocks') {
    return <screens.stocks companyId={companyId} companyUsers={data.employees.filter(item => item.companyId === companyId)} companyServices={data.orgNodes.filter(node => node.companyId === companyId && node.type === 'service')} canCreate={hasPermission('stocks', 'créer')} canModify={hasPermission('stocks', 'modifier')} stockPermissions={stockPermissions} singleModuleNavigation={singleModuleNavigation} />;
  }
  if (routePath === '/kora/finance') {
    return <screens.finance data={data} mutate={mutate} />;
  }
  if (routePath === '/kora/commerce' || routePath === '/kora/ventes') {
    return <screens.commerce companyId={companyId} data={data} mutate={mutate} canCreate={hasPermission('commerce', 'créer') || hasPermission('ventes', 'créer')} canModify={hasPermission('commerce', 'modifier') || hasPermission('ventes', 'modifier')} allowedTabs={commerceTabIds} singleModuleNavigation={singleModuleNavigation} initialTab={routePath === '/kora/ventes' ? 'sales' : 'dashboard'} onNavigate={onNavigate} />;
  }
  const operationalModule = routeModules[routePath];
  if (operationalModule && ['achats', 'comptabilite', 'paie', 'crm', 'fournisseurs', 'logistique', 'documents'].includes(operationalModule)) {
    return <screens.operational moduleId={operationalModule} data={data} mutate={mutate} canCreate={hasPermission(operationalModule, 'créer')} canModify={hasPermission(operationalModule, 'modifier')} />;
  }
  if (routePath === '/kora/rh') {
    return <screens.humanResources data={data} mutate={mutate} companyAdmin={companyAdmin} employee={employee} companyId={companyId} />;
  }
  if (routePath === '/kora/presences') {
    return <screens.presence companyId={companyId} employees={presenceEmployees} nodes={data.orgNodes.filter(node => node.companyId === companyId)} currentEmployee={employee} canView={hasPresencePermission('view')} canCreate={hasPresencePermission('create')} canEdit={hasPresencePermission('edit')} canCorrect={hasPresencePermission('correct')} canValidate={hasPresencePermission('validate')} canManage={hasPresencePermission('manage')} canExport={hasPresencePermission('export')} canDelete={hasPresencePermission('delete')} singleModuleNavigation={singleModuleNavigation} />;
  }
  if (routePath === '/kora/rapports') {
    return <screens.reports data={data} />;
  }
  return <screens.empty title="Module non autorisé" text={`Cette vue n’est pas disponible pour KORA (${allowed.length} modules autorisés).`} action={() => onBack('/kora/dashboard')} />;
}