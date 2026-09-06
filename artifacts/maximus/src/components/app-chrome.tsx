import { useState, type CSSProperties } from 'react';
import {
  ArrowLeft,
  Bell,
  CircleHelp,
  LogIn,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
} from 'lucide-react';
import { Link } from 'wouter';
import type { ModuleId, StoreData } from '@/lib/store';
import {
  adminNav,
  koraNav,
  type Icon,
  type Session,
  type SidebarFeature,
  type SidebarFeatureGroup,
} from '@/lib/navigation';

type SidebarProps = {
  session: Session;
  location: string;
  allowed: ModuleId[];
  sidebarFeatureGroups?: SidebarFeatureGroup[];
  canManagePeople: boolean;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  employee: StoreData['employees'][number] | null;
  companyName?: string;
  companyPhoto?: string;
  adminLogo?: string;
  mobileOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeNavStyle?: CSSProperties;
};

export function Sidebar({
  session,
  location,
  allowed,
  sidebarFeatureGroups,
  canManagePeople,
  onNavigate,
  onLogout,
  employee,
  companyName,
  companyPhoto,
  adminLogo,
  mobileOpen,
  onClose,
  collapsed,
  onToggleCollapse,
  activeNavStyle,
}: SidebarProps) {
  const isAdmin = session === 'admin';
  const companyAdmin = session === 'kora' || session.startsWith('company:');
  const nav = isAdmin
    ? adminNav
    : koraNav.filter(
        item =>
          (!item.peopleAdminOnly || companyAdmin || canManagePeople) &&
          (item.module === null || allowed.includes(item.module as ModuleId)),
      );
  const companyCoreItems = nav.filter(item => item.module === null);
  const companyModuleItems = nav.filter(item => item.module !== null);
  const verticalModuleMenu = Boolean(
    employee && !isAdmin && allowed.length >= 1 && sidebarFeatureGroups?.length,
  );
  const compact = collapsed && !mobileOpen;
  const active = (href: string) =>
    location === href || location.startsWith(`${href}?`);
  const link = (item: SidebarFeature) => {
    const isActive = active(item.href);
    const className = `nav-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${compact ? 'justify-center' : ''} ${isActive ? 'active' : 'text-[hsl(var(--sidebar-foreground)/.7)]'}`;
    const content = (
      <>
        <item.icon size={17} strokeWidth={isActive ? 2.5 : 1.8} />
        {!compact && item.label}
      </>
    );
    const testId = `link-nav-${item.href.split('/').pop()?.split('?')[0]}`;

    return (
      <Link
        data-testid={testId}
        title={compact ? item.label : undefined}
        onClick={event => {
          event.preventDefault();
          onNavigate(item.href);
          onClose();
        }}
        key={item.href}
        href={item.href}
        className={className}
        style={isActive ? activeNavStyle : undefined}
      >
        {content}
      </Link>
    );
  };
  const initials = employee
    ? `${employee.firstName[0]}${employee.lastName[0]}`
    : companyName
        ?.split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word[0])
        .join('')
        .toUpperCase() || 'KD';
  const standardNav = nav.map(item => link(item));
  const singleModuleItems = nav.filter(
    item => 'module' in item && item.module === null,
  );
  const employeeAdministrationItems = singleModuleItems.filter(item => item.label !== 'Vue d’ensemble');

  return (
    <>
      <button
        aria-label="Fermer le menu"
        data-testid="button-close-mobile-menu"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-[hsl(var(--foreground)/.35)] backdrop-blur-sm md:hidden ${mobileOpen ? 'block' : 'hidden'}`}
      />
      <aside
        data-collapsed={compact ? 'true' : 'false'}
        className={`sidebar shrink-0 flex-col overscroll-contain overflow-y-auto transition-[width] duration-200 md:relative md:flex md:h-[100dvh] ${compact ? 'md:w-20' : 'md:w-64'} ${mobileOpen ? 'fixed inset-y-0 left-0 z-50 flex w-72 shadow-2xl' : 'hidden'}`}
      >
        <div
          className={`flex items-center ${compact ? 'gap-1 px-2' : 'justify-between px-4'} py-6`}
        >
          {isAdmin ? (
            <div
              className={`flex min-w-0 items-center ${compact ? 'gap-1' : 'gap-3'}`}
            >
              <span
                className={`flex shrink-0 items-center justify-center overflow-hidden bg-[hsl(var(--accent)/.18)] font-bold text-[hsl(var(--accent))] ${compact ? 'h-8 w-8 rounded-lg text-[10px]' : 'h-12 w-12 rounded-xl text-sm'}`}
              >
                {adminLogo ? (
                  <img src={adminLogo} alt="Logo de l’administration MAXIMUS" className="h-full w-full object-cover" />
                ) : (
                  'MX'
                )}
              </span>
              {!compact && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">MAXIMUS</p>
                  <p className="mt-0.5 text-[10px] text-[hsl(var(--sidebar-foreground)/.55)]">
                    Centre de contrôle
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div
              className={`flex min-w-0 items-center ${compact ? 'gap-1' : 'gap-3'}`}
            >
              <span
                className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[hsl(var(--accent)/.18)] font-bold text-[hsl(var(--accent))] ${compact ? 'h-8 w-8 rounded-lg text-[10px]' : 'h-12 w-12 rounded-xl text-sm'}`}
              >
                {companyPhoto ? (
                  <img
                    src={companyPhoto}
                    alt={`Logo de ${companyName ?? 'l’entreprise'}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </span>
              {!compact && (
                <div className="min-w-0">
                  <p
                    title={companyName ?? 'Entreprise'}
                    className="break-words text-sm font-bold leading-tight"
                  >
                    {companyName ?? 'Entreprise'}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[hsl(var(--sidebar-foreground)/.55)]">
                    {employee ? employee.role : 'Espace entreprise'}
                  </p>
                </div>
              )}
            </div>
          )}
          <button
            aria-label={compact ? 'Déployer le menu' : 'Rétracter le menu'}
            title={compact ? 'Déployer le menu' : 'Rétracter le menu'}
            data-testid="button-toggle-sidebar"
            onClick={onToggleCollapse}
            className={`hidden rounded-lg text-[hsl(var(--sidebar-foreground)/.7)] hover:bg-[hsl(var(--sidebar-accent))] md:block ${compact ? 'p-1' : 'p-2'}`}
          >
            {compact ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={18} />}
          </button>
          <button
            aria-label="Fermer le menu"
            data-testid="button-close-mobile-menu-inner"
            onClick={onClose}
            className="rounded-lg p-2 text-[hsl(var(--sidebar-foreground)/.7)] hover:bg-[hsl(var(--muted))] md:hidden"
          >
            <X size={18} />
          </button>
        </div>
        <nav
          className={`${isAdmin ? 'flex-none' : 'min-h-0 flex-1'} space-y-1 overflow-hidden px-3`}
        >
          {verticalModuleMenu ? (
            <>
              {employeeAdministrationItems.length > 0 && (
                <>
                  {!compact && (
                    <div className="mb-2 flex items-center border-l-2 border-[hsl(var(--accent))] bg-[hsl(var(--sidebar-accent)/.4)] px-3 py-2">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--sidebar-foreground)/.7)]">
                        Administration
                      </span>
                    </div>
                  )}
                  <div className="space-y-1">
                    {employeeAdministrationItems.map(item => link(item))}
                  </div>
                </>
              )}
              {sidebarFeatureGroups?.map((group, groupIndex) => (
                <section
                  key={group.label}
                  aria-label={group.label}
                  className={`${!compact && (groupIndex > 0 || employeeAdministrationItems.length > 0) ? 'mt-4 border-t border-[hsl(var(--sidebar-border))] pt-3' : ''}`}
                >
                  {!compact && (
                    <div
                      data-testid={`module-section-${group.label}`}
                      className="mb-2 flex items-center border-l-2 border-[hsl(var(--accent))] bg-[hsl(var(--sidebar-accent)/.4)] px-3 py-2"
                    >
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--sidebar-foreground)/.7)]">
                        {group.label}
                      </span>
                    </div>
                  )}
                  <div className="space-y-1">{group.items.map(item => link(item))}</div>
                </section>
              ))}
            </>
          ) : isAdmin ? (
            <div className="space-y-1">{standardNav}</div>
          ) : (
            <>
              {!compact && (
                <div className="mb-2 flex items-center border-l-2 border-[hsl(var(--accent))] bg-[hsl(var(--sidebar-accent)/.4)] px-3 py-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--sidebar-foreground)/.7)]">
                    Administration
                  </span>
                </div>
              )}
              <div className="space-y-1">{companyCoreItems.map(item => link(item))}</div>
              {companyModuleItems.length > 0 && (
                <section className={compact ? '' : 'mt-4 border-t border-[hsl(var(--sidebar-border))] pt-3'}>
                  {!compact && (
                    <div className="mb-2 flex items-center border-l-2 border-[hsl(var(--accent))] bg-[hsl(var(--sidebar-accent)/.4)] px-3 py-2">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--sidebar-foreground)/.7)]">
                        Modules
                      </span>
                    </div>
                  )}
                  <div className="space-y-1">{companyModuleItems.map(item => link(item))}</div>
                </section>
              )}
            </>
          )}
        </nav>
        <div
          className={`border-t border-[hsl(var(--sidebar-border))] pt-4 ${compact ? 'm-3' : 'm-4'}`}
        >
          <button
            data-testid="button-logout"
            title={compact ? 'Se déconnecter' : undefined}
            onClick={onLogout}
            className={`nav-item flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[hsl(var(--sidebar-foreground)/.64)] ${compact ? 'justify-center' : ''}`}
          >
            <LogIn size={17} className="rotate-180" />
            {!compact && 'Se déconnecter'}
          </button>
          {!isAdmin && (
            <div className={`mt-4 flex ${compact ? 'justify-center' : 'justify-start'}`}>
              {compact ? (
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-[hsl(var(--accent)/.18)] text-[10px] font-black text-[hsl(var(--accent))]">
                  {adminLogo ? <img src={adminLogo} alt="" className="h-full w-full object-cover" /> : 'M'}
                </span>
              ) : (
                <span className="text-sm font-black tracking-[-.06em] text-[hsl(var(--sidebar-foreground))]">
                  MAXIMUS<span className="text-[hsl(var(--accent))]">.</span>
                </span>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

type TopbarProps = {
  title: string;
  isAdmin: boolean;
  onNavigate: (path: string) => void;
  onToggleMenu: () => void;
  notificationPath: string;
  unreadCount: number;
  onHelp: () => void;
};

export function Topbar({
  title,
  isAdmin,
  onNavigate,
  onToggleMenu,
  notificationPath,
  unreadCount,
  onHelp,
}: TopbarProps) {
  const [search, setSearch] = useState('');

  return (
    <header className="topbar flex min-h-[78px] items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/.88)] px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          data-testid="button-mobile-menu"
          aria-label="Ouvrir le menu"
          onClick={onToggleMenu}
          className="topbar-icon rounded-lg p-2 md:hidden"
        >
          <Menu size={19} />
        </button>
        <div className="min-w-0 max-w-[calc(100vw-150px)]">
          <p className="hidden items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))] sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" aria-hidden="true" />
            Espace de travail
          </p>
          <div className="mt-0.5 flex min-w-0 items-center gap-2.5 sm:mt-1">
            <span className="hidden h-7 w-1 shrink-0 rounded-full bg-[hsl(var(--primary))] sm:block" aria-hidden="true" />
            <div
              data-testid="text-topbar-title"
              className="truncate text-base font-black leading-tight tracking-[-.035em] sm:text-xl"
            >
              {title}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {isAdmin && (
          <div className="relative hidden lg:block">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
            />
            <input
              data-testid="input-global-search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && search.trim()) {
                  sessionStorage.setItem('maximus-company-search', search.trim());
                  onNavigate('/maximus/entreprises');
                }
              }}
              placeholder="Rechercher une entreprise..."
              className="topbar-search w-64 rounded-lg border border-transparent bg-[hsl(var(--muted))] py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[hsl(var(--primary))]"
            />
          </div>
        )}
        <button
          data-testid="button-help"
          onClick={onHelp}
          className="topbar-icon rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
        >
          <CircleHelp size={18} />
        </button>
        <button
          data-testid="button-header-notifications"
          aria-label={
            unreadCount
              ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
              : 'Notifications'
          }
          onClick={() => onNavigate(notificationPath)}
          className="topbar-icon relative rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-[hsl(var(--destructive))] px-1 text-center text-[9px] font-bold leading-4 text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

type PageHeaderProps = {
  kicker: string;
  title: string;
  description: string;
  location: string;
  onBack: () => void;
};

export function PageHeader({
  kicker,
  title,
  description,
  location,
  onBack,
}: PageHeaderProps) {
  return (
    <div className="page-header mb-6 flex flex-col justify-between gap-3 border-b border-[hsl(var(--border))] pb-5 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <p className="mono mb-1.5 text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">
          {kicker}
        </p>
        <h1
          data-testid="text-page-title"
          className="max-w-4xl text-2xl font-bold tracking-[-.04em] sm:text-3xl"
        >
          {title}
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          {description}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {location !== '/maximus/dashboard' && location !== '/kora/dashboard' && (
          <button
            type="button"
            data-testid="button-page-back"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--primary)/.45)] hover:text-[hsl(var(--primary))]"
          >
            <ArrowLeft size={14} />
            Retour
          </button>
        )}
        {location !== '/maximus/dashboard' && location !== '/kora/dashboard' && (
          <div className="mono hidden text-[9px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))] sm:block">
            Mis à jour à l’instant
          </div>
        )}
      </div>
    </div>
  );
}