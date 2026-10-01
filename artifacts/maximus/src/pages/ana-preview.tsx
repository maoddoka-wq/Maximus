import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Package2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useLocation, useSearch } from 'wouter';
import { Badge } from '@workspace/maximus-design-system/components/ui/badge';
import { Button } from '@workspace/maximus-design-system/components/ui/button';
import { Card } from '@workspace/maximus-design-system/components/ui/card';
import {
  AdminDashboard,
  AppRuntimeProviders,
  RoleAwareCompanyDashboard,
} from '@/App';
import { Sidebar } from '@/components/app-chrome';
import { CompanyRouter, type CompanyRouteScreens } from '@/routes/app-routes';
import { buildAppAccessContext } from '@/lib/app-access';
import type { CompanyWorkspaceFeatureId } from '@/lib/company-workspace-features';
import { buildWorkspaceHomeHref } from '@/lib/ana-preview-path';
import {
  loadAnaPreview,
  type AnaPreviewPayload,
  type AnaPreviewProfile,
} from '@/lib/ana-preview-api';
import type { PresenceItem } from '@/lib/presence-api';
import type { StockBootstrap } from '@/lib/stock-api';
import {
  emptyStoreData,
  modules,
  type Company,
  type ModuleAvailability,
  type ModuleId,
  type StoreData,
} from '@/lib/store';
import type { Session } from '@/lib/navigation';
import { CompanyOrganizationAdmin } from '@/pages/company-organization';
import PresenceModulePage from '@/pages/presence-module';
import StockModulePage from '@/pages/stock-module';

type PreviewMutate = (update: (data: StoreData) => void, message?: string) => void;

const PreviewModuleContext = createContext<{
  stockData: StockBootstrap;
  presenceItems: PresenceItem[];
  mutate: PreviewMutate;
} | null>(null);

function usePreviewModuleContext() {
  const value = useContext(PreviewModuleContext);
  if (!value) throw new Error('Le contexte de prévisualisation ANA est indisponible.');
  return value;
}

function moduleLabel(moduleId: string): string {
  return modules.find((module) => module.id === moduleId)?.name ?? moduleId;
}

function hydrateStoreData(payload: AnaPreviewPayload): StoreData {
  const defaults = emptyStoreData();
  const partial = payload.storeData ?? {};
  return {
    ...defaults,
    ...partial,
    companies: partial.companies?.length ? partial.companies : [payload.company],
  };
}

function resolveProfileAccess(
  payload: AnaPreviewPayload,
  storeData: StoreData,
  profile: AnaPreviewProfile,
) {
  const company = storeData.companies.find((item) => item.id === payload.company.id) ?? payload.company;
  const employee = profile.employeeId
    ? storeData.employees.find((item) => item.id === profile.employeeId) ?? null
    : null;
  const session: Session = profile.kind === 'platform-admin'
    ? 'admin'
    : profile.kind === 'company-admin'
      ? `company:${company.id}`
      : `employee:${employee?.id ?? profile.employeeId ?? profile.id}`;
  const access = buildAppAccessContext({
    data: storeData,
    session,
    employee,
    activeCompanyId: company.id,
    activeCompany: company,
    sectorTestCompanyId: null,
    serverModuleStatuses: null,
    serverModuleAccess: null,
    serverModuleAccessReady: true,
  });

  return { company, employee, session, access };
}

function ProfileButton({
  profile,
  moduleIds,
  onChoose,
}: {
  profile: AnaPreviewProfile;
  moduleIds: ModuleId[];
  onChoose: (profileId: string) => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      data-testid={`preview-profile-${profile.id}`}
      onClick={() => onChoose(profile.id)}
      className="min-h-14 w-full justify-start whitespace-normal rounded-lg px-3 py-2.5 text-left"
    >
      <div className="flex w-full items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          {profile.kind === 'platform-admin'
            ? <ShieldCheck size={19} aria-hidden="true" />
            : profile.kind === 'company-admin'
              ? <Building2 size={19} aria-hidden="true" />
              : <Users size={19} aria-hidden="true" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-foreground">{profile.name}</span>
          <span className="mt-1 block text-xs font-medium text-muted-foreground">{profile.roleTitle}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{profile.group}</span>
          <span className="mt-3 flex flex-wrap gap-1.5">
            {profile.kind === 'platform-admin' ? (
              <Badge variant="secondary" className="text-[10px]">Centre MAXIMUS</Badge>
            ) : moduleIds.length ? moduleIds.map((moduleId) => (
              <Badge key={moduleId} variant="secondary" className="text-[10px]">
                {moduleLabel(moduleId)}
              </Badge>
            )) : (
              <Badge variant="outline" className="text-[10px]">Aucun module autorisé</Badge>
            )}
          </span>
        </span>
      </div>
    </Button>
  );
}

function ProfilePicker({
  payload,
  storeData,
  onChoose,
}: {
  payload: AnaPreviewPayload;
  storeData: StoreData;
  onChoose: (profileId: string) => void;
}) {
  const groups = [...new Set(payload.profiles.map((profile) => profile.group))];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 max-w-3xl">
        <Badge variant="secondary">Entreprise de démonstration · {payload.company.name}</Badge>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Choisissez un profil MAXIMUS
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
          Chaque profil ouvre les écrans MAXIMUS avec les rôles, unités, modules et données de cette entreprise.
          Aucun compte ni mot de passe n’est nécessaire.
        </p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Les autorisations sont calculées par le même moteur que l’espace de travail. Les modules ne chargent pas
          les API métier et leurs actions de modification sont désactivées.
        </p>
      </div>

      <div className="space-y-8">
        {groups.map((group) => {
          const profiles = payload.profiles.filter((profile) => profile.group === group);
          return (
            <section key={group} aria-label={group}>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">{group}</h2>
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">{profiles.length} profil{profiles.length === 1 ? '' : 's'}</span>
              </div>
              <div className="space-y-2">
                {profiles.map((profile) => {
                  const { access } = resolveProfileAccess(payload, storeData, profile);
                  return (
                    <ProfileButton
                      key={profile.id}
                      profile={profile}
                      moduleIds={access.allowed}
                      onChoose={onChoose}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Card className="flex items-start gap-3 border-border bg-card p-4">
          <Building2 size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">{payload.company.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{payload.company.sector} · {payload.company.country}</p>
          </div>
        </Card>
        <Card className="flex items-start gap-3 border-border bg-card p-4">
          <Users size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">{storeData.employees.length} employés</p>
            <p className="mt-1 text-xs text-muted-foreground">Comptes, rôles et unités issus du modèle d’organisation MAXIMUS.</p>
          </div>
        </Card>
        <Card className="flex items-start gap-3 border-border bg-card p-4">
          <Package2 size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">{payload.company.allowedModules.length} modules actifs</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {payload.company.allowedModules.map(moduleLabel).join(' · ')}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function PreviewEmptyScreen({
  title,
  text,
  action,
}: {
  title?: string;
  text?: string;
  action?: () => void;
}) {
  return (
    <Card className="border-border bg-card p-6">
      <h2 className="font-semibold text-foreground">{title ?? 'Écran indisponible'}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {text ?? 'Cette section ne fait pas partie du périmètre de la démonstration ANA.'}
      </p>
      {action && (
        <Button type="button" variant="outline" className="mt-4" onClick={action}>
          Revenir à la vue d’ensemble
        </Button>
      )}
    </Card>
  );
}

function PreviewUnavailableScreen() {
  return (
    <PreviewEmptyScreen text="Cette prévisualisation charge uniquement les modules Présences et Gestion de stock." />
  );
}

function PreviewOrganizationScreen({
  company,
  data,
  mutate,
  initialTab,
  sectorManager,
  scopeNodeId,
}: {
  company: Company;
  data: StoreData;
  mutate: PreviewMutate;
  initialTab?: 'structure' | 'roles' | 'employees' | 'profile' | 'publicSite';
  sectorManager?: boolean;
  scopeNodeId?: string;
}) {
  return (
    <div className="space-y-3">
      <p className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
        Les modifications de l’Organisation restent dans l’aperçu courant et sont réinitialisées au rechargement.
      </p>
      <CompanyOrganizationAdmin
        company={company}
        data={data}
        mutate={mutate}
        initialTab={initialTab}
        sectorManager={sectorManager}
        scopeNodeId={scopeNodeId}
      />
    </div>
  );
}

function PreviewStockScreen({
  companyId,
  companyUsers,
  companyServices,
  stockPermissions,
}: {
  companyId: string;
  companyUsers: StoreData['employees'];
  companyServices: StoreData['orgNodes'];
  stockPermissions?: Record<string, string[]>;
}) {
  const { stockData } = usePreviewModuleContext();
  return (
    <StockModulePage
      companyId={companyId}
      companyUsers={companyUsers}
      companyServices={companyServices}
      canCreate={false}
      canModify={false}
      stockPermissions={stockPermissions}
      singleModuleNavigation
      preview
      previewData={stockData}
    />
  );
}

function PreviewPresenceScreen({
  companyId,
  employees,
  nodes,
  currentEmployee,
  canView,
  visibleFeatureIds,
  featurePermissions,
  canExport,
  selfOnly,
}: {
  companyId: string;
  employees: StoreData['employees'];
  nodes: StoreData['orgNodes'];
  currentEmployee: StoreData['employees'][number] | null;
  canView: boolean;
  visibleFeatureIds?: string[];
  featurePermissions?: Partial<Record<string, string[]>>;
  canExport: boolean;
  selfOnly: boolean;
}) {
  const { presenceItems } = usePreviewModuleContext();
  return (
    <PresenceModulePage
      companyId={companyId}
      employees={employees}
      nodes={nodes}
      currentEmployee={currentEmployee}
      canCreate={false}
      canEdit={false}
      canCorrect={false}
      canValidate={false}
      canManage={false}
      canGenerateQr={false}
      canExport={canExport}
      canDelete={false}
      canView={canView}
      visibleFeatureIds={visibleFeatureIds}
      featurePermissions={featurePermissions}
      singleModuleNavigation
      preview
      previewItems={presenceItems}
      selfOnly={selfOnly}
    />
  );
}

const companyScreens = {
  dashboard: RoleAwareCompanyDashboard,
  control: PreviewUnavailableScreen,
  notifications: PreviewUnavailableScreen,
  setupGuide: PreviewUnavailableScreen,
  organization: PreviewOrganizationScreen,
  empty: PreviewEmptyScreen,
  stocks: PreviewStockScreen,
  ecommerce: PreviewUnavailableScreen,
  immobilier: PreviewUnavailableScreen,
  finance: PreviewUnavailableScreen,
  commerce: PreviewUnavailableScreen,
  operational: PreviewUnavailableScreen,
  transport: PreviewUnavailableScreen,
  payroll: PreviewUnavailableScreen,
  humanResources: PreviewUnavailableScreen,
  presence: PreviewPresenceScreen,
  reports: PreviewUnavailableScreen,
} as unknown as CompanyRouteScreens;

function pageTitle(location: string, profile: AnaPreviewProfile): string {
  if (profile.kind === 'platform-admin') return 'Vue d’ensemble MAXIMUS';
  const path = location.split(/[?#]/, 1)[0];
  if (path === '/entreprise/stocks') return moduleLabel('stocks');
  if (path === '/entreprise/presences') return 'Présences';
  if (path === '/entreprise/organisation') return 'Organisation & accès';
  return 'Vue d’ensemble';
}

function ProfileWorkspace({
  payload,
  storeData,
  profile,
  onReturnToProfiles,
  onStoreDataChange,
}: {
  payload: AnaPreviewPayload;
  storeData: StoreData;
  profile: AnaPreviewProfile;
  onReturnToProfiles: () => void;
  onStoreDataChange: PreviewMutate;
}) {
  const search = useSearch();
  const [route, setRoute] = useState(
    profile.kind === 'platform-admin' ? '/maximus/dashboard' : '/entreprise/dashboard',
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { company, employee, session, access } = resolveProfileAccess(payload, storeData, profile);
  const profileName = employee
    ? `${employee.firstName} ${employee.lastName}`.trim()
    : profile.name;
  const companyAdmin = profile.kind === 'company-admin';
  const hiddenWorkspaceFeatures: CompanyWorkspaceFeatureId[] = [
    ...new Set<CompanyWorkspaceFeatureId>([
      ...(company.hiddenWorkspaceFeatures ?? []),
      'controle',
      'guide-configuration',
    ]),
  ];
  const moduleStatuses: Record<string, ModuleAvailability> = Object.fromEntries(
    modules.map((module) => [
      module.id,
      storeData.moduleStatuses?.[module.id] ?? module.status,
    ]),
  );
  const routeSearch = search
    ? `${search.startsWith('?') ? '' : '?'}${search}`
    : '';
  const routeLocation = `${route}${routeSearch}`;
  const navigate = (path: string) => setRoute(path);
  const mutate: PreviewMutate = (update, message) => {
    void message;
    onStoreDataChange(update);
  };

  const content = profile.kind === 'platform-admin'
    ? route === '/maximus/dashboard'
      ? <AdminDashboard data={storeData} onNavigate={() => undefined} preview />
      : <PreviewUnavailableScreen />
    : (
      <CompanyRouter
        location={routeLocation}
        data={storeData}
        mutate={mutate}
        notify={() => undefined}
        onNavigate={navigate}
        onBack={navigate}
        allowed={access.allowed}
        canManagePeople={access.canManagePeople}
        companyAdmin={companyAdmin}
        sectorManager={access.sectorManager}
        scopeNodeId={access.employeeNode?.id}
        companyId={company.id}
        employee={employee}
        employees={storeData.employees}
        presenceEmployees={access.presenceEmployees}
        presenceFeatureIds={access.selectedPresenceFeatureIds}
        ecommerceFeatureIds={access.selectedEcommerceFeatureIds}
        payrollFeatureIds={access.selectedPayrollFeatureIds}
        payrollFeaturePermissions={access.payrollFeaturePermissions}
        moduleFeaturePermissions={access.moduleFeaturePermissions}
        transportFeatureIds={access.selectedTransportFeatureIds}
        transportFeaturePermissions={access.transportFeaturePermissions}
        ecommerceFeaturePermissions={access.ecommerceFeaturePermissions}
        hasPermission={access.hasPermission}
        hasPresencePermission={access.hasPresencePermission}
        stockPermissions={access.stockPermissions}
        commerceTabIds={access.commerceTabIds}
        commerceTabPermissions={access.commerceTabPermissions}
        moduleStatuses={moduleStatuses}
        serverModuleAccess={null}
        hiddenWorkspaceFeatures={hiddenWorkspaceFeatures}
        screens={companyScreens}
      />
    );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex min-h-[68px] items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {profile.kind !== 'platform-admin' && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Ouvrir la navigation"
              onClick={() => setMobileOpen(true)}
            >
              <ArrowLeft size={17} className="rotate-180" aria-hidden="true" />
            </Button>
          )}
          <a href={buildWorkspaceHomeHref(import.meta.env.BASE_URL)} className="text-base font-black tracking-[0.12em]">
            MAXIMUS
          </a>
          <span className="hidden h-6 border-l border-border sm:block" />
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-xs font-semibold">{profile.kind === 'platform-admin' ? 'Centre de contrôle' : company.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{profile.roleTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <ShieldCheck size={13} aria-hidden="true" />
            Aperçu local · lecture seule
          </Badge>
          <Button type="button" variant="outline" size="sm" onClick={onReturnToProfiles}>
            Changer de profil
          </Button>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-68px)]">
        {profile.kind !== 'platform-admin' && (
          <Sidebar
            session={session}
            location={routeLocation}
            allowed={access.allowed}
            sidebarFeatureGroups={access.sidebarFeatureGroups}
            canManagePeople={access.canManagePeople}
            onNavigate={navigate}
            onLogout={onReturnToProfiles}
            employee={employee}
            companyName={company.name}
            companyPhoto={company.profilePhoto}
            mobileOpen={mobileOpen}
            onClose={() => setMobileOpen(false)}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((value) => !value)}
            hiddenWorkspaceFeatures={hiddenWorkspaceFeatures}
          />
        )}

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1500px]">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {profileName} · {profile.roleTitle}
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight">{pageTitle(routeLocation, profile)}</h1>
              </div>
              {profile.kind !== 'platform-admin' && (
                <Badge variant="outline" className="gap-1.5">
                  {access.allowed.includes('presences') && <CalendarClock size={13} aria-hidden="true" />}
                  {access.allowed.includes('stocks') && <Package2 size={13} aria-hidden="true" />}
                  {access.allowed.map(moduleLabel).join(' · ') || 'Aucun module accessible'}
                </Badge>
              )}
            </div>
            <PreviewModuleContext.Provider
              value={{
                stockData: payload.stockData,
                presenceItems: payload.presenceData.items,
                mutate,
              }}
            >
              {content}
            </PreviewModuleContext.Provider>
            <p className="mt-5 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs leading-5 text-muted-foreground">
              Aucune API métier n’est appelée. Les données affichées proviennent du stockage de prévisualisation Replit;
              les actions de modification des modules sont désactivées.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

function AnaPreviewWorkspace() {
  const [browserLocation, setBrowserLocation] = useLocation();
  const search = useSearch();
  const [payload, setPayload] = useState<AnaPreviewPayload | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState(
    () => new URLSearchParams(window.location.search).get('profile') ?? '',
  );

  useEffect(() => {
    let current = true;
    void loadAnaPreview()
      .then((result) => {
        if (current) setPayload(result);
      })
      .catch((error: unknown) => {
        if (!current) return;
        setLoadError(error instanceof Error ? error.message : 'Les données de prévisualisation sont indisponibles.');
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, []);

  const query = search.startsWith('?') ? search.slice(1) : search;
  const profileFromUrl = new URLSearchParams(query).get('profile') ?? '';
  useEffect(() => {
    setSelectedProfileId(profileFromUrl);
  }, [profileFromUrl]);

  const storeData = useMemo(
    () => payload ? hydrateStoreData(payload) : null,
    [payload],
  );
  const selectedProfile = payload?.profiles.find((profile) => profile.id === selectedProfileId);

  const updateProfileQuery = (profileId: string) => {
    const params = new URLSearchParams(query);
    if (profileId) params.set('profile', profileId);
    else params.delete('profile');
    params.delete('tab');
    params.delete('section');
    setBrowserLocation(`${browserLocation}${params.size ? `?${params.toString()}` : ''}`);
  };

  const onChooseProfile = (profileId: string) => {
    updateProfileQuery(profileId);
    setSelectedProfileId(profileId);
  };

  const onReturnToProfiles = () => {
    updateProfileQuery('');
    setSelectedProfileId('');
  };

  const onStoreDataChange: PreviewMutate = (update) => {
    setPayload((current) => {
      if (!current) return current;
      const nextStoreData = structuredClone({
        ...emptyStoreData(),
        ...current.storeData,
        companies: current.storeData.companies?.length
          ? current.storeData.companies
          : [current.company],
      }) as StoreData;
      update(nextStoreData);
      const company = nextStoreData.companies.find((item) => item.id === current.company.id) ?? current.company;
      return { ...current, company, storeData: nextStoreData };
    });
  };

  const previewHomeHref = buildWorkspaceHomeHref(import.meta.env.BASE_URL);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <a href={previewHomeHref} className="text-base font-black tracking-[0.12em]">MAXIMUS</a>
            <span className="hidden h-6 border-l border-border sm:block" />
            <div className="hidden sm:block">
              <p className="text-xs font-semibold">Prévisualisation ANA</p>
              <p className="text-[11px] text-muted-foreground">Écrans et données métier MAXIMUS</p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1.5">
            <ShieldCheck size={13} aria-hidden="true" />
            Base Replit de prévisualisation
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        {loading && (
          <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-8 text-center" role="status">
            <div className="mx-auto mb-4 size-8 animate-pulse rounded-full bg-primary/15" />
            <p className="font-semibold">Chargement des données ANA…</p>
            <p className="mt-1 text-sm text-muted-foreground">Lecture du stockage local de prévisualisation.</p>
          </div>
        )}

        {!loading && loadError && (
          <Card className="mx-auto max-w-xl border-border bg-card p-6 text-center">
            <p className="font-semibold">L’aperçu ANA n’est pas disponible</p>
            <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
            <a href={previewHomeHref} className="mt-5 inline-block text-sm font-semibold text-primary hover:underline">
              Retour à MAXIMUS
            </a>
          </Card>
        )}

        {!loading && payload && storeData && !selectedProfile && (
          <ProfilePicker payload={payload} storeData={storeData} onChoose={onChooseProfile} />
        )}

        {!loading && payload && storeData && selectedProfile && (
          <ProfileWorkspace
            key={selectedProfile.id}
            payload={payload}
            storeData={storeData}
            profile={selectedProfile}
            onReturnToProfiles={onReturnToProfiles}
            onStoreDataChange={onStoreDataChange}
          />
        )}
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <span>Les rôles viennent du modèle MAXIMUS; les données sont isolées dans le stockage local de démonstration.</span>
          <span>Aucun mot de passe, compte réel ou accès Render n’est utilisé.</span>
        </div>
      </footer>
    </div>
  );
}

export default function AnaPreviewApp() {
  return (
    <AppRuntimeProviders>
      <AnaPreviewWorkspace />
    </AppRuntimeProviders>
  );
}