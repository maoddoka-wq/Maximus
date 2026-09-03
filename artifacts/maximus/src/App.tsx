import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Bell, Building2, Check, ChevronDown, ChevronRight, CircleHelp, CreditCard, Edit3, FileBarChart, FileClock, FolderKanban, Gauge, GitBranch, KeyRound, LayoutGrid, LogIn, Menu, Package, PanelLeftClose, PanelLeftOpen, Plus, RefreshCw, Search, Settings, ShieldCheck, ShoppingCart, SlidersHorizontal, Sparkles, Store, Trash2, TrendingUp, UserPlus, Users, WalletCards, X, Boxes, UserRoundCog } from 'lucide-react';
import { Link, useLocation, Router as WouterRouter } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/error-boundary';
import { loadData, modules, money, saveData, shortMoney, uid, type Company, type Employee, type ModuleAvailability, type ModuleId, type OrgNode, type Role, type Sale, type SectorPreset, type StoreData } from '@/lib/store';
import StockModulePage from '@/pages/stock-module';
import { OperationalModulePage } from '@/pages/operational-modules';
import { CompanyOrganizationAdmin } from '@/pages/company-organization';

const queryClient = new QueryClient();
type Icon = typeof Gauge;
type Session = 'admin' | 'kora' | `employee:${string}` | `company:${string}`;

const adminNav = [
  { href: '/maximus/dashboard', label: 'Vue d’ensemble', icon: Gauge },
  { href: '/maximus/entreprises', label: 'Entreprises', icon: Building2 },
  { href: '/maximus/entreprises/organisation', label: 'Organisation & accès', icon: GitBranch },
  { href: '/maximus/demandes', label: 'Demandes', icon: FileClock },
  { href: '/maximus/modules', label: 'Modules', icon: LayoutGrid },
  { href: '/maximus/secteurs', label: 'Secteurs d’activité', icon: Building2 },
  { href: '/maximus/abonnements', label: 'Abonnements', icon: CreditCard },
  { href: '/maximus/notifications', label: 'Notifications', icon: Bell },
  { href: '/maximus/journal', label: 'Journal d’activité', icon: FileBarChart },
];
const koraNav = [
  { href: '/kora/dashboard', label: 'Vue d’ensemble', icon: Gauge, module: null },
  { href: '/kora/organisation', label: 'Organisation', icon: GitBranch, module: null, adminOnly: true },
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

const pageMeta: Record<string, { kicker: string; title: string; description: string }> = {
  '/maximus/dashboard': { kicker: 'Cockpit MAXIMUS', title: 'Bonjour, équipe MAXIMUS.', description: 'Voici ce qui mérite votre attention aujourd’hui.' },
  '/maximus/entreprises': { kicker: 'Administration', title: 'Entreprises', description: 'Pilotez les espaces clients et leurs accès modules.' },
  '/maximus/entreprises/organisation': { kicker: 'Administration des entreprises', title: 'Organisation & accès', description: 'Structurez les secteurs, leurs modules, les rôles et les comptes employés.' },
  '/maximus/demandes': { kicker: 'Administration', title: 'Demandes en attente', description: 'Traitez les demandes d’ouverture reçues récemment.' },
  '/maximus/modules': { kicker: 'Configuration', title: 'Catalogue des modules', description: 'Les briques métier disponibles dans MAXIMUS.' },
  '/maximus/secteurs': { kicker: 'Configuration', title: 'Secteurs d’activité', description: 'Préparez les modules proposés lors de l’inscription d’une entreprise.' },
  '/maximus/abonnements': { kicker: 'Compte', title: 'Abonnements', description: 'Une lecture claire de vos espaces et de leur statut.' },
  '/maximus/notifications': { kicker: 'Centre de contrôle', title: 'Notifications', description: 'Les signaux utiles, sans bruit.' },
  '/maximus/journal': { kicker: 'Traçabilité', title: 'Journal d’activité', description: 'Chaque action importante, horodatée et attribuée.' },
  '/kora/dashboard': { kicker: 'KORA Distribution', title: 'Le rythme de KORA, en un regard.', description: 'Mardi 18 juin 2024 · Dakar, Sénégal' },
  '/kora/organisation': { kicker: 'Espace KORA', title: 'Organisation', description: 'Une structure souple qui suit la réalité de vos équipes.' },
  '/kora/profil': { kicker: 'Espace entreprise', title: 'Mon profil', description: 'Mettez à jour les informations et les accès de votre entreprise.' },
  '/kora/employes': { kicker: 'Espace KORA', title: 'Employés', description: 'Les personnes qui font avancer KORA chaque jour.' },
  '/kora/roles': { kicker: 'Espace KORA', title: 'Rôles', description: 'Des accès précis, pour travailler sereinement.' },
  '/kora/stocks': { kicker: 'Espace KORA', title: 'Gestion de stock', description: 'Pilotez vos articles, entrées, sorties et inventaires.' },
  '/kora/finance': { kicker: 'Espace KORA', title: 'Finance', description: 'Une lecture simple des encaissements et de la trésorerie.' },
  '/kora/commerce': { kicker: 'Espace KORA', title: 'Gestion commerciale', description: 'Clients, commandes et activité commerciale en temps réel.' },
  '/kora/ventes': { kicker: 'Espace KORA', title: 'Ventes', description: 'Devis, ventes et validation des opérations clients.' },
  '/kora/achats': { kicker: 'Espace KORA', title: 'Achats', description: 'Demandes, commandes fournisseurs et réceptions.' },
  '/kora/comptabilite': { kicker: 'Espace KORA', title: 'Comptabilité', description: 'Écritures, journaux et rapprochements comptables.' },
  '/kora/rh': { kicker: 'Espace KORA', title: 'Ressources humaines', description: 'Organisation, employés, rôles et permissions.' },
  '/kora/presences': { kicker: 'Espace KORA', title: 'Présences', description: 'Le suivi quotidien de vos équipes.' },
  '/kora/paie': { kicker: 'Espace KORA', title: 'Paie', description: 'Périodes, bulletins et validation des salaires.' },
  '/kora/crm': { kicker: 'Espace KORA', title: 'CRM / Clients', description: 'Fiches clients, opportunités et relances.' },
  '/kora/fournisseurs': { kicker: 'Espace KORA', title: 'Fournisseurs', description: 'Référentiel, évaluation et suivi des partenaires.' },
  '/kora/logistique': { kicker: 'Espace KORA', title: 'Logistique', description: 'Entrepôts, livraisons et acheminement.' },
  '/kora/documents': { kicker: 'Espace KORA', title: 'Documents', description: 'Classement, partage et suivi des versions.' },
  '/kora/rapports': { kicker: 'Espace KORA', title: 'Rapports', description: 'Des synthèses actionnables pour décider plus vite.' },
};

function AppContent() {
  const [data, setData] = useState<StoreData>(() => loadData());
  const [session, setSession] = useState<Session | null>(() => (localStorage.getItem('maximus-session') as Session | null));
  const [toast, setToast] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('maximus-sidebar-collapsed') === 'true');
  const [location, setLocation] = useLocation();
  useEffect(() => saveData(data), [data]);
  useEffect(() => { localStorage.setItem('maximus-sidebar-collapsed', String(sidebarCollapsed)); }, [sidebarCollapsed]);
  useEffect(() => { if (!toast) return undefined; const timer = window.setTimeout(() => setToast(''), 3000); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => { const syncData = () => setData(loadData()); window.addEventListener('storage', syncData); return () => window.removeEventListener('storage', syncData); }, []);

  const mutate = (fn: (draft: StoreData) => void, message?: string) => {
    setData(prev => { const next = structuredClone(prev) as StoreData; fn(next); return next; });
    if (message) setToast(message);
  };
  const notify = (message: string) => setToast(message);
  const login = (_space: 'admin' | 'kora', email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail === 'admin@maximus.demo' && password === 'Admin123!') {
      setSession('admin');
      localStorage.setItem('maximus-session', 'admin');
      setLocation('/maximus/dashboard');
      return;
    }
    const company = data.companies.find(item => item.email.toLowerCase() === normalizedEmail && item.status === 'ACTIF' && item.adminPassword === password);
    if (company) {
      const companySession: Session = `company:${company.id}`;
      setSession(companySession);
      localStorage.setItem('maximus-session', companySession);
      setLocation('/kora/dashboard');
      return;
    }
    const employee = data.employees.find(e => e.email.toLowerCase() === normalizedEmail && e.status === 'ACTIF' && (e.loginPassword ?? 'Kora123!') === password);
    if (employee) {
      const employeeSession: Session = `employee:${employee.id}`;
      setSession(employeeSession);
      localStorage.setItem('maximus-session', employeeSession);
      setLocation('/kora/dashboard');
    }
  };
  const logout = () => { setSession(null); localStorage.removeItem('maximus-session'); setLocation('/'); };
  const navigate = (path: string) => { setLocation(path); setMobileOpen(false); };

  if (location === '/inscription') return session === 'admin' ? <AdminCreateCompanyPage data={data} mutate={mutate} onComplete={() => { setToast('Entreprise créée et activée.'); setLocation('/maximus/entreprises'); }} onCancel={() => setLocation('/maximus/entreprises')} /> : <Signup data={data} onComplete={() => { setData(loadData()); setToast('Votre demande a bien été envoyée.'); setLocation('/'); }} />;
  const loginEmployees = [...data.employees, ...data.companies.filter(company => company.status === 'ACTIF' && company.adminPassword).map(company => ({ id: `company-admin:${company.id}`, firstName: company.manager.split(' ')[0] ?? company.name, lastName: company.manager.split(' ').slice(1).join(' ') || 'Administrateur', email: company.email, phone: company.phone, position: 'Administrateur', department: '', subDepartment: '', role: 'Administrateur entreprise', status: 'ACTIF' as const, loginPassword: company.adminPassword, companyId: company.id }))];
  if (location === '/' || !session) return <Login onLogin={login} employees={loginEmployees} />;
  const isAdmin = session === 'admin';
  const employeeId = session?.startsWith('employee:') ? session.slice('employee:'.length) : null;
  const employee = employeeId ? data.employees.find(e => e.id === employeeId) ?? null : null;
  const companyId = session === 'kora' ? 'kora' : session.startsWith('company:') ? session.slice('company:'.length) : employee?.companyId ?? 'kora';
  const currentCompany = data.companies.find(company => company.id === companyId);
  const employeeRole = employee ? data.roles.find(r => r.id === employee.roleId) ?? data.roles.find(r => r.name === employee.role) : null;
  const moduleStatus = (moduleId: ModuleId): ModuleAvailability => data.moduleStatuses?.[moduleId] ?? modules.find(module => module.id === moduleId)?.status ?? 'INACTIF';
  const isModuleActive = (moduleId: ModuleId) => moduleStatus(moduleId) !== 'INACTIF';
  const companyAllowed = (data.companies.find(c => c.id === companyId)?.allowedModules ?? []).filter(isModuleActive);
  const employeeNode = employee?.sectorId ? data.orgNodes.find(node => node.id === employee.sectorId && node.companyId === employee.companyId) : null;
  const employeeAncestry = new Set<string>();
  let ancestryNode = employeeNode;
  while (ancestryNode) {
    employeeAncestry.add(ancestryNode.id);
    ancestryNode = ancestryNode.parentId ? data.orgNodes.find(node => node.id === ancestryNode?.parentId) : undefined;
  }
  const roleFitsEmployee = Boolean(employeeRole?.sectorId && employeeAncestry.has(employeeRole.sectorId) && employeeRole.companyId === employee?.companyId);
  const unitModules = new Set(employeeNode?.moduleIds ?? []);
  const allowed = (session === 'kora' || session.startsWith('company:'))
    ? companyAllowed
    : employeeRole && roleFitsEmployee
      ? companyAllowed.filter(moduleId => unitModules.has(moduleId) && employeeRole.modulePermissions[moduleId]?.includes('voir'))
      : [];
  const hasPermission = (moduleId: ModuleId, permission: 'voir' | 'créer' | 'modifier') => session === 'kora' || session.startsWith('company:') || Boolean(roleFitsEmployee && unitModules.has(moduleId) && employeeRole?.modulePermissions[moduleId]?.includes(permission));
   const canManagePeople = session === 'kora' || session.startsWith('company:');
   const baseMeta = pageMeta[location] ?? (location.startsWith('/maximus/entreprises/') ? { kicker: 'Administration', title: 'Détail entreprise', description: 'Consultez et ajustez l’espace client sélectionné.' } : pageMeta[isAdmin ? '/maximus/dashboard' : '/kora/dashboard']);
   const currentMeta = !isAdmin && currentCompany
     ? location === '/kora/dashboard'
       ? { kicker: currentCompany.name, title: `Le rythme de ${currentCompany.name}, en un regard.`, description: `${currentCompany.sector} · ${currentCompany.country}` }
       : { ...baseMeta, kicker: currentCompany.name }
     : baseMeta;
   const companyInitials = currentCompany?.name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'KD';
  return (
      <div className="app-shell flex h-[100dvh] min-h-0 overflow-hidden">
        <Sidebar session={session} location={location} allowed={allowed} canManagePeople={canManagePeople} onLogout={logout} employee={employee} companyName={currentCompany?.name} companyPhoto={currentCompany?.profilePhoto} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(value => !value)} />
        <main className="min-w-0 flex-1 overflow-y-auto overscroll-contain">
           <Topbar title={currentMeta.title} isAdmin={isAdmin} onNavigate={navigate} onToggleMenu={() => setMobileOpen(true)} notificationPath={isAdmin ? '/maximus/notifications' : '/kora/dashboard'} />
          <div className="page-pad mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
          <PageHeader {...currentMeta} location={location} />
          <ErrorBoundary resetKey={location}>
            {isAdmin ? <AdminRouter location={location} data={data} mutate={mutate} notify={notify} onNavigate={navigate} /> : <KoraRouter location={location} data={data} mutate={mutate} onNavigate={navigate} allowed={allowed} canManagePeople={canManagePeople} companyAdmin={session === 'kora' || session.startsWith('company:')} companyId={companyId} employee={employee} hasPermission={hasPermission} />}
          </ErrorBoundary>
        </div>
      </main>
      {toast && <div data-testid="status-toast" className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl bg-[hsl(var(--sidebar))] px-4 py-3 text-sm font-semibold text-[hsl(var(--sidebar-foreground))] shadow-2xl fade-up"><Check size={16} className="text-[hsl(var(--accent))]" />{toast}</div>}
      <Toaster />
    </div>
  );
}

function Login({ onLogin, employees }: { onLogin: (space: 'admin' | 'kora', email: string, password: string) => void; employees: StoreData['employees'] }) {
  const [email, setEmail] = useState('admin@kora.demo');
  const [password, setPassword] = useState('Kora123!');
  const [error, setError] = useState('');
  const [loginHelp, setLoginHelp] = useState(false);
  const demoAccounts = [
    { id: 'maximus-admin', label: 'Administration MAXIMUS', email: 'admin@maximus.demo', password: 'Admin123!' },
    { id: 'kora-manager', label: 'Manager KORA · KORA Distribution', email: 'admin@kora.demo', password: 'Kora123!' },
    ...employees.filter(account => account.status === 'ACTIF' && account.email.toLowerCase() !== 'admin@kora.demo').map(account => ({ id: account.id, label: `${account.firstName} ${account.lastName} · ${account.position}`, email: account.email, password: account.loginPassword ?? 'Kora123!' })),
  ];
  const selectDemoAccount = (account: (typeof demoAccounts)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
    onLogin(account.id === 'maximus-admin' ? 'admin' : 'kora', account.email, account.password);
  };
  return <div className="grid min-h-[100dvh] lg:grid-cols-[1.1fr_.9fr]">
    <section className="relative hidden overflow-hidden bg-[hsl(var(--sidebar))] p-12 text-[hsl(var(--sidebar-foreground))] lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full border-[32px] border-[hsl(var(--accent)/.16)]" />
      <div className="absolute bottom-16 right-16 h-44 w-44 rounded-full border border-[hsl(var(--accent)/.45)]" />
      <Brand inverse />
      <div className="relative max-w-xl pb-16"><p className="mb-6 mono text-xs uppercase tracking-[.24em] text-[hsl(var(--accent))]">Le cockpit opérationnel</p><h1 className="text-6xl font-bold leading-[.98] tracking-[-.06em]">Décider juste.<br /><span className="text-[hsl(var(--accent))]">Agir vite.</span></h1><p className="mt-8 max-w-md text-lg leading-8 text-[hsl(var(--sidebar-foreground)/.7)]">MAXIMUS donne aux entreprises ouest-africaines une vue fiable de leurs opérations, de leur conformité et de leur croissance.</p></div>
      <p className="mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--sidebar-foreground)/.5)]">Sénégal · Côte d’Ivoire · UEMOA</p>
    </section>
    <section className="flex items-center justify-center bg-[hsl(var(--background))] p-6 sm:p-12"><div className="w-full max-w-md fade-up">
      <div className="mb-10 lg:hidden"><Brand /></div>
       <div className="mb-8"><p className="mono mb-3 text-[11px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">Accès sécurisé</p><h2 className="text-3xl font-bold tracking-[-.04em]">Bienvenue dans MAXIMUS</h2><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Tous les comptes utilisent la même connexion. MAXIMUS ouvre automatiquement le bon espace.</p></div>
       <form onSubmit={e => { e.preventDefault(); const normalizedEmail = email.trim().toLowerCase(); const account = employees.find(item => item.email.toLowerCase() === normalizedEmail && item.status === 'ACTIF' && password === (item.loginPassword ?? 'Kora123!')); const validAdmin = normalizedEmail === 'admin@maximus.demo' && password === 'Admin123!'; if (!validAdmin && !account) { setError('Email ou mot de passe incorrect. Vérifiez que le compte est actif et que le mot de passe est correct.'); return; } setError(''); onLogin(validAdmin ? 'admin' : 'kora', email, password); }} className="space-y-5">
        <Field label="Adresse email" value={email} onChange={setEmail} type="email" testId="input-login-email" />
        <Field label="Mot de passe" value={password} onChange={setPassword} type="password" testId="input-login-password" />
        <div className="flex justify-end"><button type="button" data-testid="button-forgot-password" onClick={() => setLoginHelp(value => !value)} className="text-xs font-semibold text-[hsl(var(--primary))]">Aide à la connexion</button></div>
          {loginHelp && <p className="rounded-lg bg-[hsl(var(--muted))] px-3 py-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Utilisez l’email et le mot de passe du compte. Le manager KORA, les employés et l’administration MAXIMUS se connectent tous depuis ce même formulaire.</p>}
         {error && <p data-testid="login-error" className="rounded-lg bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-xs font-semibold text-[hsl(var(--destructive))]">{error}</p>}
         <button data-testid="button-login" className="btn flex w-full items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-3.5 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-lg shadow-[hsl(var(--primary)/.18)]" type="submit"><LogIn size={17} />Se connecter</button>
      </form>
      <div className="mt-8 border-t border-[hsl(var(--border))] pt-6 text-center text-sm text-[hsl(var(--muted-foreground))]">Pas encore d’espace ? <Link data-testid="link-signup" href="/inscription" className="font-bold text-[hsl(var(--primary))]">Créer une entreprise</Link></div>
       <div className="mt-8 rounded-xl border border-dashed border-[hsl(var(--border))] p-4"><span className="text-xs font-bold text-[hsl(var(--foreground))]">Comptes de démonstration</span><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">Cliquez sur un compte pour vous connecter directement.</p><div className="mt-3 grid gap-2">{demoAccounts.map(account => <button type="button" data-testid={`button-demo-account-${account.id}`} key={account.id} onClick={() => selectDemoAccount(account)} className={`rounded-lg border px-3 py-2 text-left transition hover:border-[hsl(var(--primary)/.55)] hover:bg-[hsl(var(--primary)/.06)] ${email === account.email ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.06)]' : ''}`}><span className="block text-xs font-bold">{account.label}</span><span className="mt-0.5 block text-[11px] text-[hsl(var(--muted-foreground))]">{account.email}</span></button>)}</div></div>
    </div></section>
  </div>;
}

function Signup({ data, onComplete }: { data: StoreData; onComplete: () => void }) {
  const fallbackPreset: SectorPreset = { id: 'default', name: 'Distribution', moduleIds: ['finance', 'commerce', 'stocks'] };
  const initialPreset = data.sectorPresets[0] ?? fallbackPreset;
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [manager, setManager] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [sector, setSector] = useState(initialPreset.name);
  const [orgName, setOrgName] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [orgType, setOrgType] = useState<OrgNode['type']>('direction');
  const [selectedModules, setSelectedModules] = useState<ModuleId[]>([...initialPreset.moduleIds]);
  const [moduleError, setModuleError] = useState('');
  const changeSector = (nextSector: string) => {
    const preset = data.sectorPresets.find(item => item.name === nextSector);
    setSector(nextSector);
    setSelectedModules(preset ? [...preset.moduleIds] : []);
    setModuleError('');
  };
  const toggle = (id: ModuleId) => {
    setSelectedModules(previous => previous.includes(id) ? previous.filter(moduleId => moduleId !== id) : [...previous, id]);
    setModuleError('');
  };
  if (submitted) return <div className="flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))] p-6"><div className="card-surface w-full max-w-xl rounded-2xl p-8 text-center fade-up"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]"><Check size={25} /></span><p className="mono mt-6 text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">Demande envoyée</p><h1 className="mt-3 text-3xl font-bold tracking-[-.04em]">Votre entreprise est en attente de validation.</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">Votre entreprise est en attente de validation par l’administration MAXIMUS. Vous pourrez accéder à votre espace dès son activation.</p><button data-testid="button-back-after-signup" onClick={onComplete} className="btn mt-8 rounded-lg bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">Retour à la connexion</button></div></div>;
    return <div className="min-h-[100dvh] bg-[hsl(var(--background))]"><header className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-5 lg:px-12"><Brand /><Link data-testid="link-back-login" href="/" className="text-sm font-semibold text-[hsl(var(--muted-foreground))]">Retour à la connexion</Link></header><div className="mx-auto max-w-3xl p-6 py-12 lg:py-20 fade-up"><div className="mb-10"><p className="mono text-[11px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">Nouvel espace entreprise</p><h1 className="mt-3 text-4xl font-bold tracking-[-.05em]">Commencez avec une base claire.</h1><p className="mt-3 text-[hsl(var(--muted-foreground))]">Votre demande sera revue par l’équipe MAXIMUS avant activation.</p></div><div className="mb-10 flex items-center gap-3"><Step n={1} label="Votre entreprise" active={step === 1} done={step > 1} /><div className="h-px flex-1 bg-[hsl(var(--border))]" /><Step n={2} label="Modules & organisation" active={step === 2} done={false} /></div>{step === 1 ? <div className="card-surface rounded-2xl p-6 sm:p-8"><div className="grid gap-5 sm:grid-cols-2"><Field label="Nom de l’entreprise" placeholder="Ex. Teranga Agro" value={name} onChange={setName} testId="input-company-name" /><Field label="Responsable" placeholder="Prénom Nom" value={manager} onChange={setManager} testId="input-company-manager" /><Field label="Email professionnel" placeholder="vous@entreprise.com" value={email} onChange={setEmail} type="email" testId="input-company-email" /><label className="block text-sm font-semibold">Secteur<select data-testid="select-company-sector" value={sector} onChange={e => changeSector(e.target.value)} className="mt-2 w-full rounded-lg border bg-transparent px-3 py-3 text-sm font-normal">{data.sectorPresets.map(preset => <option key={preset.id} value={preset.name}>{preset.name}</option>)}</select></label><Field label="Mot de passe administrateur" placeholder="Au moins 8 caractères" value={password} onChange={setPassword} type="password" testId="input-company-password" /><Field label="Confirmer le mot de passe" placeholder="Répétez le mot de passe" value={passwordConfirm} onChange={setPasswordConfirm} type="password" testId="input-company-password-confirm" /></div>{password && passwordConfirm && password !== passwordConfirm && <p className="mt-4 text-xs font-semibold text-[hsl(var(--destructive))]">Les mots de passe ne correspondent pas.</p>}<p className="mt-4 rounded-lg bg-[hsl(var(--muted))] p-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Ce mot de passe servira à l’administrateur de l’entreprise après validation de votre demande.</p><button disabled={!name || !manager || !email || password.length < 8 || password !== passwordConfirm} data-testid="button-next-signup" onClick={() => setStep(2)} className="btn mt-8 flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-40">Continuer <ChevronRight size={16} /></button></div> : <div className="card-surface rounded-2xl p-6 sm:p-8"><section className="mb-8 rounded-xl border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--primary)/.04)] p-4"><h2 className="font-bold">Organisation obligatoire</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Créez la première unité de votre entreprise. Vous pourrez ensuite construire librement toute la hiérarchie.</p><div className="mt-4 grid gap-4 sm:grid-cols-3"><Field label="Nom de l’unité *" placeholder="Ex. Direction générale" value={orgName} onChange={setOrgName} testId="input-company-org-name" /><Field label="Code *" placeholder="Ex. DG-01" value={orgCode} onChange={setOrgCode} testId="input-company-org-code" /><label className="block text-sm font-semibold">Type<select data-testid="select-company-org-type" value={orgType} onChange={e => setOrgType(e.target.value as OrgNode['type'])} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm font-normal"><option value="direction">Direction</option><option value="department">Département</option><option value="sector">Secteur</option><option value="service">Service</option></select></label></div></section><h2 className="text-xl font-bold">Les briques utiles dès le premier jour</h2><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">La sélection proposée correspond au secteur choisi. Vous pouvez l’ajuster avant d’envoyer la demande.</p>{moduleError && <p data-testid="signup-module-error" className="mt-4 rounded-lg bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-xs font-semibold text-[hsl(var(--destructive))]">{moduleError}</p>}<div className="mt-6 grid gap-3 sm:grid-cols-2">{modules.map(mod => <button type="button" data-testid={`button-module-${mod.id}`} key={mod.id} onClick={() => toggle(mod.id)} className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${selectedModules.includes(mod.id) ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.06)]' : 'border-[hsl(var(--border))]'}`}><span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border ${selectedModules.includes(mod.id) ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border-[hsl(var(--border))]'}`}>{selectedModules.includes(mod.id) && <Check size={13} />}</span><span><strong className="block text-sm">{mod.name}</strong><span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">{mod.description}</span></span></button>)}</div><div className="mt-8 flex gap-3"><button data-testid="button-back-signup" onClick={() => setStep(1)} className="rounded-lg border px-5 py-3 text-sm font-bold">Retour</button><button disabled={!orgName.trim() || !orgCode.trim() || selectedModules.length === 0} data-testid="button-submit-signup" onClick={() => { const newCompany: Company = { id: uid('company'), name, manager, email, adminPassword: password, phone: '', country: 'Sénégal', sector, status: 'EN ATTENTE', requestedModules: selectedModules, allowedModules: [], refusedModules: [], createdAt: new Date().toISOString().slice(0, 10) }; const orgId = uid('org'); try { const current = loadData(); current.companies.push(newCompany); current.orgNodes.push({ id: orgId, companyId: newCompany.id, name: orgName.trim(), code: orgCode.trim().toUpperCase(), type: orgType, parentId: null, moduleIds: [] }); saveData(current); } catch { /* localStorage unavailable */ } setSubmitted(true); }} className="btn flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">Envoyer la demande <Check size={16} /></button></div></div>}</div></div>;
}

function Brand({ inverse = false, homeHref }: { inverse?: boolean; homeHref?: string }) { return <Link data-testid="link-brand" href={homeHref ?? (inverse ? '/' : '/maximus/dashboard')} className="inline-flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--accent))] text-sm font-black text-[hsl(var(--foreground))]">M</span><span className={`text-lg font-black tracking-[-.06em] ${inverse ? 'text-[hsl(var(--sidebar-foreground))]' : ''}`}>MAXIMUS<span className="text-[hsl(var(--accent))]">.</span></span></Link>; }
function Step({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) { return <div className={`flex items-center gap-2 text-sm font-bold ${active || done ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${done ? 'bg-[hsl(var(--primary))] text-white' : active ? 'bg-[hsl(var(--accent))]' : 'border border-[hsl(var(--border))]'}`}>{done ? <Check size={14} /> : n}</span><span className="mobile-hide">{label}</span></div>; }
function Field({ label, value, onChange, placeholder, type = 'text', testId }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; testId: string }) { return <label className="block text-sm font-semibold">{label}<input data-testid={testId} type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className="mt-2 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3.5 py-3 text-sm font-normal transition focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.14)]" /></label>; }

function Sidebar({ session, location, allowed, canManagePeople, onLogout, employee, companyName, companyPhoto, mobileOpen, onClose, collapsed, onToggleCollapse, fixedHeight }: { session: Session; location: string; allowed: ModuleId[]; canManagePeople: boolean; onLogout: () => void; employee: StoreData['employees'][number] | null; companyName?: string; companyPhoto?: string; mobileOpen: boolean; onClose: () => void; collapsed: boolean; onToggleCollapse: () => void; fixedHeight?: boolean }) {
  const isAdmin = session === 'admin';
  const nav = isAdmin ? adminNav : koraNav.filter(item => (!item.adminOnly || session === 'kora' || session.startsWith('company:')) && (item.module === null || allowed.includes(item.module as ModuleId) || (item.href === '/kora/employes' && canManagePeople)));
  const initials = employee ? `${employee.firstName[0]}${employee.lastName[0]}` : companyName?.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'KD';
  const compact = collapsed && !mobileOpen;
  const profileImage = !isAdmin && !employee ? companyPhoto : undefined;
  return <><button aria-label="Fermer le menu" data-testid="button-close-mobile-menu" onClick={onClose} className={`fixed inset-0 z-40 bg-[hsl(var(--foreground)/.35)] backdrop-blur-sm md:hidden ${mobileOpen ? 'block' : 'hidden'}`} /><aside className={`sidebar shrink-0 flex-col overscroll-contain overflow-y-auto transition-[width] duration-200 md:relative md:flex md:h-[100dvh] ${compact ? 'md:w-20' : 'md:w-64'} ${mobileOpen ? 'fixed inset-y-0 left-0 z-50 flex w-72 shadow-2xl' : 'hidden'}`}><div className={`flex items-center ${compact ? 'gap-1 px-2' : 'justify-between px-4'} py-6`}>{isAdmin ? <div className={`flex min-w-0 items-center ${compact ? 'gap-1' : 'gap-3'}`}><span className={`flex shrink-0 items-center justify-center overflow-hidden bg-[hsl(var(--accent)/.18)] font-bold text-[hsl(var(--accent))] ${compact ? 'h-8 w-8 rounded-lg text-[10px]' : 'h-12 w-12 rounded-xl text-sm'}`}>MX</span>{!compact && <div className="min-w-0"><p className="truncate text-sm font-bold">MAXIMUS</p><p className="mt-0.5 text-[10px] text-[hsl(var(--sidebar-foreground)/.55)]">Centre de contrôle</p></div>}</div> : <div className={`flex min-w-0 items-center ${compact ? 'gap-1' : 'gap-3'}`}><span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[hsl(var(--accent)/.18)] font-bold text-[hsl(var(--accent))] ${compact ? 'h-8 w-8 rounded-lg text-[10px]' : 'h-12 w-12 text-sm'}`}>{profileImage ? <img src={profileImage} alt={`Logo de ${companyName ?? 'l’entreprise'}`} className="h-full w-full object-cover" /> : initials}</span>{!compact && <div className="min-w-0"><p className="truncate text-sm font-bold">{companyName ?? 'KORA Distribution'}</p><p className="mt-0.5 text-[10px] text-[hsl(var(--sidebar-foreground)/.55)]">{employee ? employee.role : 'Espace entreprise'}</p></div>}</div>}<button aria-label={compact ? 'Déployer le menu' : 'Rétracter le menu'} title={compact ? 'Déployer le menu' : 'Rétracter le menu'} data-testid="button-toggle-sidebar" onClick={onToggleCollapse} className={`hidden rounded-lg text-[hsl(var(--sidebar-foreground)/.7)] hover:bg-[hsl(var(--sidebar-accent))] md:block ${compact ? 'p-1' : 'p-2'}`}>{compact ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={18} />}</button><button aria-label="Fermer le menu" data-testid="button-close-mobile-menu-inner" onClick={onClose} className="rounded-lg p-2 text-[hsl(var(--sidebar-foreground)/.7)] hover:bg-[hsl(var(--sidebar-accent))] md:hidden"><X size={18} /></button></div><nav className={`${isAdmin ? 'flex-none' : 'min-h-0 flex-1'} space-y-1 overflow-hidden px-3`}>{nav.map(item => <Link data-testid={`link-nav-${item.href.split('/').pop()}`} title={compact ? item.label : undefined} onClick={onClose} key={item.href} href={item.href} className={`nav-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${compact ? 'justify-center' : ''} ${location === item.href ? 'active' : 'text-[hsl(var(--sidebar-foreground)/.7)]'}`}><item.icon size={17} strokeWidth={location === item.href ? 2.5 : 1.8} />{!compact && item.label}</Link>)}</nav><div className={`border-t border-[hsl(var(--sidebar-border))] pt-4 ${compact ? 'm-3' : 'm-4'}`}><button data-testid="button-logout" title={compact ? 'Se déconnecter' : undefined} onClick={onLogout} className={`nav-item flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[hsl(var(--sidebar-foreground)/.64)] ${compact ? 'justify-center' : ''}`}><LogIn size={17} className="rotate-180" />{!compact && 'Se déconnecter'}</button><div className="mt-4 flex justify-center"><span className="text-sm font-black tracking-[-.06em] text-[hsl(var(--sidebar-foreground))]">MAXIMUS<span className="text-[hsl(var(--accent))]">.</span></span></div></div></aside></>;
}

function Topbar({ title, isAdmin, onNavigate, onToggleMenu, notificationPath }: { title: string; isAdmin: boolean; onNavigate: (path: string) => void; onToggleMenu: () => void; notificationPath: string }) {
  const [search, setSearch] = useState('');
  return <header className="flex h-[76px] items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/.75)] px-4 backdrop-blur sm:px-8"><div className="flex items-center gap-3"><button data-testid="button-mobile-menu" aria-label="Ouvrir le menu" onClick={onToggleMenu} className="rounded-lg p-2 md:hidden"><Menu size={19} /></button><div className="hidden text-sm font-bold sm:block">{title}</div></div><div className="flex items-center gap-2 sm:gap-4">{isAdmin && <div className="relative hidden lg:block"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" /><input data-testid="input-global-search" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && search.trim()) { sessionStorage.setItem('maximus-company-search', search.trim()); onNavigate('/maximus/entreprises'); } }} placeholder="Rechercher une entreprise..." className="w-56 rounded-lg border border-transparent bg-[hsl(var(--muted))] py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[hsl(var(--primary))]" /></div>}<button data-testid="button-help" onClick={() => window.alert('Besoin d’aide ? Explorez les vues depuis la navigation de votre espace.')} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"><CircleHelp size={19} /></button><button data-testid="button-header-notifications" onClick={() => onNavigate(notificationPath)} className="relative rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"><Bell size={19} /><i className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" /></button></div></header>;
}
function PageHeader({ kicker, title, description, location }: { kicker: string; title: string; description: string; location: string }) { return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mono mb-2 text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">{kicker}</p><h1 data-testid="text-page-title" className="text-3xl font-bold tracking-[-.05em] sm:text-4xl">{title}</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{description}</p></div>{location !== '/maximus/dashboard' && location !== '/kora/dashboard' && <div className="mono hidden text-[10px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))] sm:block">Mis à jour à l’instant</div>}</div>; }

function AdminRouter({ location, data, mutate, notify, onNavigate }: { location: string; data: StoreData; mutate: (fn: (d: StoreData) => void, msg?: string) => void; notify: (message: string) => void; onNavigate: (path: string) => void }) {
  if (location === '/maximus/dashboard') return <AdminDashboard data={data} onNavigate={onNavigate} />;
  if (location === '/maximus/entreprises/organisation') return <OrganizationAdminPage data={data} mutate={mutate} onNavigate={onNavigate} />;
  const companyDetailMatch = location.match(/^\/maximus\/entreprises\/([^/]+)$/);
  if (companyDetailMatch) {
    const companyId = decodeURIComponent(companyDetailMatch[1]);
    const company = data.companies.find(item => item.id === companyId);
     return company ? <CompanyModulesDetail company={company} data={data} mutate={mutate} onBack={() => onNavigate('/maximus/entreprises')} /> : <EmptyState title="Entreprise introuvable" text="L’espace demandé est introuvable." action={() => onNavigate('/maximus/entreprises')} />;
  }
  if (location === '/maximus/entreprises') return <CompaniesPage data={data} mutate={mutate} onNavigate={onNavigate} detail={false} />;
  if (location === '/maximus/demandes') return <RequestsPage data={data} mutate={mutate} onNavigate={onNavigate} />;
  if (location === '/maximus/modules') return <InteractiveModulesPage data={data} mutate={mutate} notify={notify} />;
  if (location === '/maximus/secteurs') return <SectorPresetsPage data={data} mutate={mutate} />;
  if (location === '/maximus/abonnements') return <SubscriptionsPage data={data} />;
  if (location === '/maximus/notifications') return <NotificationsPage data={data} mutate={mutate} />;
  if (location === '/maximus/journal') return <JournalPage data={data} />;
  return <EmptyState title="Cette vue n’existe pas encore" text="Revenez au cockpit pour poursuivre." action={() => onNavigate('/maximus/dashboard')} />;
}

function OrganizationAdminPage({ data, mutate, onNavigate }: { data: StoreData; mutate: (fn: (d: StoreData) => void, msg?: string) => void; onNavigate: (path: string) => void }) {
  const [companyId, setCompanyId] = useState(data.companies.find(company => company.status === 'ACTIF')?.id ?? data.companies[0]?.id ?? '');
  const company = data.companies.find(item => item.id === companyId);
  if (!company) return <EmptyState title="Entreprise introuvable" text="Créez ou activez d’abord une entreprise." action={() => onNavigate('/maximus/entreprises')} />;
  return <div className="space-y-5"><label className="card-surface block rounded-xl p-4 text-sm font-semibold">Entreprise administrée<select data-testid="select-organization-company" value={companyId} onChange={event => setCompanyId(event.target.value)} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm">{data.companies.map(item => <option key={item.id} value={item.id}>{item.name} · {item.status}</option>)}</select></label><CompanyOrganizationAdmin company={company} data={data} mutate={mutate} /></div>;
}
function CompanyProfilePage({ company, data, mutate }: { company: Company; data: StoreData; mutate: (fn: (d: StoreData) => void, msg?: string) => void }) {
  type ProfileForm = Pick<Company, 'name' | 'manager' | 'email' | 'phone' | 'country' | 'sector'>;
  const [form, setForm] = useState<ProfileForm>({ name: company.name, manager: company.manager, email: company.email, phone: company.phone, country: company.country, sector: company.sector });
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const setField = (field: keyof ProfileForm) => (value: string) => setForm(current => ({ ...current, [field]: value }));

  useEffect(() => {
    setForm({ name: company.name, manager: company.manager, email: company.email, phone: company.phone, country: company.country, sector: company.sector });
    setNewPassword('');
    setPasswordConfirm('');
    setError('');
  }, [company.id, company.name, company.manager, company.email, company.phone, company.country, company.sector]);

  const save = () => {
    const name = form.name.trim();
    const manager = form.manager.trim();
    const email = form.email.trim().toLowerCase();
    const password = newPassword.trim();
    if (!name || !manager || !email) {
      setError('Le nom de l’entreprise, le responsable et l’email sont obligatoires.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Saisissez une adresse email valide.');
      return;
    }
    if (data.companies.some(item => item.id !== company.id && item.email.toLowerCase() === email)) {
      setError('Une autre entreprise utilise déjà cette adresse email.');
      return;
    }
    if (password && password.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    mutate(draft => {
      const target = draft.companies.find(item => item.id === company.id);
      if (target) {
        target.name = name;
        target.manager = manager;
        target.email = email;
        target.phone = form.phone.trim();
        target.country = form.country.trim();
        target.sector = form.sector.trim();
        if (password) target.adminPassword = password;
      }
    }, password ? 'Profil et mot de passe mis à jour.' : 'Profil entreprise mis à jour.');
    setNewPassword('');
    setPasswordConfirm('');
  };

  return <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
    <section className="card-surface rounded-2xl p-6">
      <div className="mb-7"><p className="mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">Profil entreprise</p><h2 className="mt-2 text-2xl font-bold">{company.name}</h2><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Ces informations sont utilisées dans votre espace et lors de votre connexion.</p></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nom de l’entreprise *" value={form.name} onChange={setField('name')} testId="input-profile-company-name" />
        <Field label="Responsable *" value={form.manager} onChange={setField('manager')} testId="input-profile-manager" />
        <Field label="Email administrateur *" value={form.email} onChange={setField('email')} type="email" testId="input-profile-email" />
        <Field label="Téléphone" value={form.phone} onChange={setField('phone')} testId="input-profile-phone" />
        <Field label="Pays" value={form.country} onChange={setField('country')} testId="input-profile-country" />
        <Field label="Secteur" value={form.sector} onChange={setField('sector')} testId="input-profile-sector" />
      </div>
      <div className="mt-7 border-t pt-6"><h3 className="font-bold">Modifier le mot de passe</h3><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Laissez ces champs vides pour conserver le mot de passe actuel.</p><div className="mt-4 grid gap-5 sm:grid-cols-2"><Field label="Nouveau mot de passe" value={newPassword} onChange={setNewPassword} type="password" placeholder="Au moins 8 caractères" testId="input-profile-password" /><Field label="Confirmer le mot de passe" value={passwordConfirm} onChange={setPasswordConfirm} type="password" placeholder="Répétez le mot de passe" testId="input-profile-password-confirm" /></div></div>
      {error && <p data-testid="profile-error" className="mt-5 rounded-lg bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-xs font-semibold text-[hsl(var(--destructive))]">{error}</p>}
      <div className="mt-7 flex justify-end"><button data-testid="button-save-profile" onClick={save} className="btn rounded-lg bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">Enregistrer le profil</button></div>
    </section>
    <section className="card-surface h-fit rounded-2xl p-6"><h2 className="font-bold">Accès de votre espace</h2><div className="mt-5 space-y-4 text-sm"><div><p className="text-xs text-[hsl(var(--muted-foreground))]">Statut</p><p className="mt-1 font-bold">{company.status}</p></div><div><p className="text-xs text-[hsl(var(--muted-foreground))]">Connexion</p><p className="mt-1 leading-6">Utilisez l’email administrateur et votre mot de passe depuis « Espace KORA ».</p></div><div><p className="text-xs text-[hsl(var(--muted-foreground))]">Modules autorisés</p><p className="mt-1 font-bold">{company.allowedModules.length} module(s)</p></div></div></section>
  </div>;
}

function CompanyEditModal({ company, data, mutate, onClose }: { company: Company; data: StoreData; mutate: (fn: (d: StoreData) => void, msg?: string) => void; onClose: () => void }) {
  type CompanyForm = Pick<Company, 'name' | 'manager' | 'email' | 'phone' | 'country' | 'sector'>;
  const [form, setForm] = useState<CompanyForm>({ name: company.name, manager: company.manager, email: company.email, phone: company.phone, country: company.country, sector: company.sector });
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const setField = (field: keyof CompanyForm) => (value: string) => setForm(current => ({ ...current, [field]: value }));
  const save = () => {
    const name = form.name.trim();
    const manager = form.manager.trim();
    const email = form.email.trim().toLowerCase();
    const nextPassword = password.trim();
    if (!name || !manager || !email) {
      setError('Le nom de l’entreprise, le responsable et l’email sont obligatoires.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Saisissez une adresse email valide.');
      return;
    }
    if (data.companies.some(item => item.id !== company.id && item.email.toLowerCase() === email)) {
      setError('Une autre entreprise utilise déjà cette adresse email.');
      return;
    }
    if (nextPassword && nextPassword.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (nextPassword !== passwordConfirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    mutate(draft => {
      const target = draft.companies.find(item => item.id === company.id);
      if (target) {
        Object.assign(target, { ...form, name, manager, email, phone: form.phone.trim(), country: form.country.trim(), sector: form.sector.trim(), ...(nextPassword ? { adminPassword: nextPassword } : {}) });
      }
    }, nextPassword ? 'Entreprise et mot de passe mis à jour.' : 'Entreprise mise à jour.');
    onClose();
  };
  return <Modal title={`Modifier ${company.name}`} onClose={onClose}>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nom de l’entreprise *" value={form.name} onChange={setField('name')} testId="input-edit-company-name" />
      <Field label="Responsable *" value={form.manager} onChange={setField('manager')} testId="input-edit-company-manager" />
      <Field label="Email administrateur *" value={form.email} onChange={setField('email')} type="email" testId="input-edit-company-email" />
      <Field label="Téléphone" value={form.phone} onChange={setField('phone')} testId="input-edit-company-phone" />
      <Field label="Pays" value={form.country} onChange={setField('country')} testId="input-edit-company-country" />
      <Field label="Secteur" value={form.sector} onChange={setField('sector')} testId="input-edit-company-sector" />
      <Field label="Nouveau mot de passe" value={password} onChange={setPassword} type="password" placeholder="Laisser vide pour conserver" testId="input-edit-company-password" />
      <Field label="Confirmer le mot de passe" value={passwordConfirm} onChange={setPasswordConfirm} type="password" placeholder="Répétez le mot de passe" testId="input-edit-company-password-confirm" />
    </div>
    {error && <p role="alert" className="mt-5 rounded-lg bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-xs font-semibold text-[hsl(var(--destructive))]">{error}</p>}
    <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2.5 text-xs font-bold">Annuler</button><ActionButton primary testId="button-save-company-edit" onClick={save}>Enregistrer les modifications</ActionButton></div>
  </Modal>;
}

function KoraRouter({ location, data, mutate, onNavigate, allowed, canManagePeople, companyAdmin, companyId, employee, hasPermission }: { location: string; data: StoreData; mutate: (fn: (d: StoreData) => void, msg?: string) => void; onNavigate: (path: string) => void; allowed: ModuleId[]; canManagePeople: boolean; companyAdmin: boolean; companyId: string; employee: StoreData['employees'][number] | null; hasPermission: (moduleId: ModuleId, permission: 'voir' | 'créer' | 'modifier') => boolean }) {
  const routeModules: Record<string, ModuleId> = { '/kora/commerce': 'commerce', '/kora/ventes': 'ventes', '/kora/achats': 'achats', '/kora/stocks': 'stocks', '/kora/finance': 'finance', '/kora/comptabilite': 'comptabilite', '/kora/rh': 'rh', '/kora/presences': 'presences', '/kora/paie': 'paie', '/kora/crm': 'crm', '/kora/fournisseurs': 'fournisseurs', '/kora/logistique': 'logistique', '/kora/documents': 'documents', '/kora/rapports': 'rapports' };
  const requiredModule = routeModules[location];
  if (requiredModule && !allowed.includes(requiredModule) && !(location === '/kora/employes' && canManagePeople)) return <EmptyState title="Accès non autorisé" text="Votre rôle ne possède pas la permission Consulter pour ce module." action={() => onNavigate('/kora/dashboard')} />;
  if (location === '/kora/dashboard') return <KoraDashboard data={data} onNavigate={onNavigate} allowed={allowed} />;
  if (location === '/kora/profil') {
    const company = data.companies.find(item => item.id === companyId);
    return companyAdmin && company ? <CompanyOrganizationAdmin company={company} data={data} mutate={mutate} initialTab="profile" /> : <EmptyState title="Accès réservé à l’administrateur" text="Le profil de l’entreprise est géré par son administrateur." action={() => onNavigate('/kora/dashboard')} />;
  }
  if (location === '/kora/organisation') {
    const company = data.companies.find(item => item.id === companyId);
    return companyAdmin && company ? <CompanyOrganizationAdmin company={company} data={data} mutate={mutate} /> : <EmptyState title="Accès réservé à l’administrateur" text="La structure de l’entreprise est gérée depuis le compte administrateur KORA." action={() => onNavigate('/kora/dashboard')} />;
  }
   if (location === '/kora/stocks') return <StockModulePage companyId={companyId} companyUsers={data.employees.filter(employee => employee.companyId === companyId)} companyServices={data.orgNodes.filter(node => node.companyId === companyId && node.type === 'service')} canCreate={hasPermission('stocks', 'créer')} canModify={hasPermission('stocks', 'modifier')} />;
  if (location === '/kora/finance') return <FinancePage data={data} mutate={mutate} />;
  if (location === '/kora/commerce') return <CommercePage data={data} mutate={mutate} />;
  if (location === '/kora/ventes') return <CommercePage data={data} mutate={mutate} />;
  if (location === '/kora/achats') return <OperationalModulePage moduleId="achats" data={data} mutate={mutate} canCreate={hasPermission('achats', 'créer')} canModify={hasPermission('achats', 'modifier')} />;
  if (location === '/kora/comptabilite') return <OperationalModulePage moduleId="comptabilite" data={data} mutate={mutate} canCreate={hasPermission('comptabilite', 'créer')} canModify={hasPermission('comptabilite', 'modifier')} />;
  if (location === '/kora/rh') return <HumanResourcesWorkspace data={data} mutate={mutate} companyAdmin={companyAdmin} employee={employee} companyId={companyId} />;
  if (location === '/kora/presences') return <PresencesPage data={data} />;
  if (location === '/kora/paie') return <OperationalModulePage moduleId="paie" data={data} mutate={mutate} canCreate={hasPermission('paie', 'créer')} canModify={hasPermission('paie', 'modifier')} />;
  if (location === '/kora/crm') return <OperationalModulePage moduleId="crm" data={data} mutate={mutate} canCreate={hasPermission('crm', 'créer')} canModify={hasPermission('crm', 'modifier')} />;
  if (location === '/kora/fournisseurs') return <OperationalModulePage moduleId="fournisseurs" data={data} mutate={mutate} canCreate={hasPermission('fournisseurs', 'créer')} canModify={hasPermission('fournisseurs', 'modifier')} />;
  if (location === '/kora/logistique') return <OperationalModulePage moduleId="logistique" data={data} mutate={mutate} canCreate={hasPermission('logistique', 'créer')} canModify={hasPermission('logistique', 'modifier')} />;
  if (location === '/kora/documents') return <OperationalModulePage moduleId="documents" data={data} mutate={mutate} canCreate={hasPermission('documents', 'créer')} canModify={hasPermission('documents', 'modifier')} />;
  if (location === '/kora/rapports') return <OperationalReportsPage data={data} />;
  return <EmptyState title="Module non autorisé" text={`Cette vue n’est pas disponible pour KORA (${allowed.length} modules autorisés).`} action={() => onNavigate('/kora/dashboard')} />;
}

function AdminDashboard({ data, onNavigate }: { data: StoreData; onNavigate: (path: string) => void }) {
  const pending = data.companies.filter(c => c.status === 'EN ATTENTE').length; return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-3"><Metric label="Entreprises actives" value={String(data.companies.filter(c => c.status === 'ACTIF').length)} detail="+1 ce mois" icon={Building2} accent /><Metric label="Demandes à traiter" value={String(pending).padStart(2, '0')} detail="requiert votre attention" icon={FileClock} /><Metric label="Modules activés" value="05" detail="sur 05 disponibles" icon={LayoutGrid} /></div><div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]"><section className="card-surface overflow-hidden rounded-2xl"><div className="flex items-center justify-between border-b p-5"><div><h2 className="font-bold">Activité récente</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Les derniers mouvements dans vos espaces</p></div><button data-testid="button-see-journal" onClick={() => onNavigate('/maximus/journal')} className="text-xs font-bold text-[hsl(var(--primary))]">Voir le journal <ChevronRight className="inline" size={14} /></button></div><div className="divide-y">{data.activities.slice(0, 4).map((a, i) => <ActivityRow key={a.id} activity={a} delay={i} />)}</div></section><section className="card-surface rounded-2xl p-5"><div className="flex items-center justify-between"><div><h2 className="font-bold">État des espaces</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Aujourd’hui</p></div><button data-testid="button-see-companies" onClick={() => onNavigate('/maximus/entreprises')} className="rounded-lg p-2 hover:bg-[hsl(var(--muted))]"><ChevronRight size={17} /></button></div><div className="mt-5 space-y-4">{data.companies.map(c => <div data-testid={`row-company-status-${c.id}`} key={c.id} className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--primary)/.1)] text-xs font-black text-[hsl(var(--primary))]">{c.name.slice(0, 2).toUpperCase()}</span><div><p className="text-sm font-bold">{c.name}</p><p className="text-[11px] text-[hsl(var(--muted-foreground))]">{c.allowedModules.length} modules actifs</p></div></div><StatusBadge status={c.status} /></div>)}</div></section></div><section className="grid-lines rounded-2xl border border-dashed border-[hsl(var(--border))] p-5 sm:p-6"><div className="flex items-start gap-4"><div className="rounded-xl bg-[hsl(var(--accent)/.2)] p-3"><Sparkles size={19} className="text-[hsl(var(--primary))]" /></div><div><h2 className="font-bold">MAXIMUS en bref</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Le centre de contrôle est prêt. Consultez les demandes, ajustez les modules autorisés et gardez une trace de chaque décision.</p></div></div></section></div>;
}
function KoraDashboard({ data, onNavigate, allowed }: { data: StoreData; onNavigate: (path: string) => void; allowed: ModuleId[] }) {
  const revenue = data.payments.filter(p => p.status === 'CONFIRMÉ').reduce((a, p) => a + p.amount, 0); const low = data.products.filter(p => p.stock <= p.threshold).length; const canCommerce = allowed.includes('commerce'); const canStocks = allowed.includes('stocks'); const canPresences = allowed.includes('presences');
  return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Metric label="Encaissements du mois" value={shortMoney(revenue)} suffix=" FCFA" detail="+12,8% vs. mois dernier" icon={TrendingUp} accent />{canCommerce && <Metric label="Ventes validées" value={String(data.sales.filter(s => s.status === 'VALIDÉ').length)} detail="sur les 30 derniers jours" icon={ShoppingCart} />}{canStocks && <Metric label="Produits à surveiller" value={String(low).padStart(2, '0')} detail="seuil de sécurité atteint" icon={Package} warning />}{canPresences && <Metric label="Présences aujourd’hui" value="18 / 21" detail="85,7% de l’effectif" icon={Users} />}</div><div className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]">{canCommerce && <section className="card-surface rounded-2xl p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--primary))]">Performance commerciale</p><h2 className="mt-2 text-xl font-bold">Les ventes avancent bien.</h2></div><button data-testid="button-open-commerce" onClick={() => onNavigate('/kora/commerce')} className="rounded-lg border px-3 py-2 text-xs font-bold">Ouvrir Commerce</button></div><div className="mt-8 flex h-48 items-end gap-2 sm:gap-4">{[38, 53, 45, 68, 57, 80, 72, 92, 76, 87, 81, 100].map((v, i) => <div key={i} className="flex flex-1 flex-col items-center gap-2"><div className={`w-full rounded-t-md ${i === 11 ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--primary)/.18)]'}`} style={{ height: `${v}%` }} /><span className="mono text-[9px] text-[hsl(var(--muted-foreground))]">{['J','F','M','A','M','J','J','A','S','O','N','D'][i]}</span></div>)}</div></section>}<section className="card-surface rounded-2xl p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--primary))]">À surveiller</p><h2 className="mt-2 text-xl font-bold">Signaux du jour</h2></div><Bell size={18} className="text-[hsl(var(--muted-foreground))]" /></div><div className="mt-6 space-y-4">{canStocks && <div className="flex gap-3 border-b pb-4"><span className="h-2 w-2 mt-1.5 rounded-full bg-[hsl(var(--accent))]" /><div><p className="text-sm font-bold">Stock bas</p><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{low} produits sous leur seuil recommandé.</p><button onClick={() => onNavigate('/kora/stocks')} className="mt-2 text-xs font-bold text-[hsl(var(--primary))]">Voir les stocks</button></div></div>}<div className="flex gap-3"><span className="h-2 w-2 mt-1.5 rounded-full bg-[hsl(var(--primary))]" /><div><p className="text-sm font-bold">Rapport hebdomadaire</p><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Votre synthèse de la semaine est disponible.</p><button onClick={() => onNavigate('/kora/rapports')} className="mt-2 text-xs font-bold text-[hsl(var(--primary))]">Consulter</button></div></div></div></section></div>{canCommerce && <section className="card-surface overflow-hidden rounded-2xl"><div className="flex items-center justify-between border-b p-5"><div><h2 className="font-bold">Dernières ventes</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Aujourd’hui et hier</p></div><button onClick={() => onNavigate('/kora/commerce')} className="text-xs font-bold text-[hsl(var(--primary))]">Tout voir</button></div><DataTable headers={['Référence', 'Client', 'Montant', 'Statut', 'Date']} rows={data.sales.map(s => [s.reference, s.client, money(s.amount), <StatusBadge status={s.status} />, s.date])} /></section>}</div>;
}

function Metric({ label, value, suffix = '', detail, icon: MetricIcon, accent = false, warning = false }: { label: string; value: string; suffix?: string; detail: string; icon: Icon; accent?: boolean; warning?: boolean }) { return <div className={`card-surface fade-up rounded-2xl p-5 ${accent ? 'border-[hsl(var(--primary)/.25)]' : ''}`}><div className="flex items-start justify-between"><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${warning ? 'bg-[hsl(var(--accent)/.2)] text-[hsl(var(--foreground))]' : accent ? 'bg-[hsl(var(--primary)/.11)] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}><MetricIcon size={17} /></span>{accent && <span className="mono rounded-full bg-[hsl(var(--primary)/.1)] px-2 py-1 text-[9px] font-bold text-[hsl(var(--primary))]">LIVE</span>}</div><p className="mt-5 text-xs font-medium text-[hsl(var(--muted-foreground))]">{label}</p><p data-testid={`metric-value-${label}`} className="mt-1 text-2xl font-bold tracking-[-.05em]">{value}<span className="text-sm font-medium">{suffix}</span></p><p className={`mt-2 text-[11px] ${warning ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--muted-foreground))]'}`}>{detail}</p></div>; }
function StatusBadge({ status }: { status: string }) { const styles: Record<string, string> = { ACTIF: 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]', 'VALIDÉ': 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]', CONFIRMÉ: 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]', 'EN ATTENTE': 'bg-[hsl(var(--accent)/.22)] text-[hsl(var(--foreground))]', SUSPENDU: 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]', BROUILLON: 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]' }; return <span data-testid={`status-${status.replace(/\s/g, '-').toLowerCase()}`} className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${styles[status] ?? styles.BROUILLON}`}>{status}</span>; }
function ActivityRow({ activity, delay = 0 }: { activity: StoreData['activities'][number]; delay?: number }) { return <div data-testid={`row-activity-${activity.id}`} className={`flex items-center gap-3 px-5 py-4 fade-up fade-up-delay-${Math.min(delay + 1, 3)}`}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--muted))] text-[10px] font-black text-[hsl(var(--primary))]">{activity.user.split(' ').map(x => x[0]).join('')}</span><div className="min-w-0 flex-1"><p className="truncate text-sm"><strong>{activity.user}</strong> {activity.action}</p><p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{activity.module} · {activity.object}</p></div><span className="mobile-hide text-[10px] text-[hsl(var(--muted-foreground))]">{activity.date}</span></div>; }
function DataTable({ headers, rows }: { headers: string[]; rows: (ReactNode)[][] }) { return <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-[hsl(var(--muted)/.55)] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]"><tr>{headers.map(h => <th key={h} className="px-5 py-3 font-bold">{h}</th>)}</tr></thead><tbody className="divide-y">{rows.map((row, i) => <tr data-testid={`table-row-${i}`} key={i} className="transition hover:bg-[hsl(var(--muted)/.35)]">{row.map((cell, j) => <td key={j} className="px-5 py-4">{cell}</td>)}</tr>)}</tbody></table></div>; }
function Toolbar({ search, setSearch, children }: { search: string; setSearch: (s: string) => void; children?: ReactNode }) { return <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative max-w-sm flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" /><input data-testid="input-table-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full rounded-lg border bg-[hsl(var(--card))] py-2.5 pl-9 pr-3 text-sm" /></div><div className="flex items-center gap-2">{children}</div></div>; }
function ActionButton({ children, onClick, primary = false, testId, icon: ButtonIcon = Plus }: { children: ReactNode; onClick: () => void; primary?: boolean; testId: string; icon?: Icon }) { return <button data-testid={testId} onClick={onClick} className={`btn flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-bold ${primary ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]'}`}><ButtonIcon size={15} />{children}</button>; }
function CompaniesPage({ data, mutate, onNavigate, detail }: { data: StoreData; mutate: (fn: (d: StoreData) => void, msg?: string) => void; onNavigate: (p: string) => void; detail: boolean }) {
  const [search, setSearch] = useState(() => sessionStorage.getItem('maximus-company-search') ?? '');
  const [filter, setFilter] = useState('Toutes');
  const [selected, setSelected] = useState<Company | null>(detail ? data.companies.find(c => c.id === 'kora') ?? null : null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const list = data.companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).filter(c => filter === 'Toutes' || (filter === 'Actives' && c.status === 'ACTIF') || (filter === 'En attente' && c.status === 'EN ATTENTE') || (filter === 'Suspendues' && c.status === 'SUSPENDU'));
  const deleteCompany = (company: Company) => {
    if (company.id === 'kora') {
      window.alert('L’espace de démonstration KORA est protégé et ne peut pas être supprimé.');
      return;
    }
    if (!window.confirm(`Supprimer l’entreprise « ${company.name} » et ses données d’organisation ?`)) return;
    mutate(draft => {
      draft.companies = draft.companies.filter(item => item.id !== company.id);
      draft.employees = draft.employees.filter(item => item.companyId !== company.id);
      draft.roles = draft.roles.filter(item => item.companyId !== company.id);
      draft.orgNodes = draft.orgNodes.filter(item => item.companyId !== company.id);
    }, 'Entreprise et données d’organisation supprimées.');
  };
  if (selected) return <CompanyDetail company={data.companies.find(c => c.id === selected.id) ?? selected} mutate={mutate} onBack={() => { setSelected(null); onNavigate('/maximus/entreprises'); }} />;
  return <section className="card-surface overflow-hidden rounded-2xl">
    <div className="border-b p-5"><Toolbar search={search} setSearch={value => { setSearch(value); sessionStorage.setItem('maximus-company-search', value); }}><ActionButton primary testId="button-add-company" onClick={() => onNavigate('/inscription')}>Ajouter une entreprise</ActionButton></Toolbar><div className="flex gap-2 overflow-x-auto">{['Toutes', 'Actives', 'En attente', 'Suspendues'].map(label => <FilterChip key={label} label={label} active={filter === label} onClick={() => setFilter(label)} />)}</div></div>
    <DataTable headers={['Entreprise', 'Responsable', 'Pays', 'Modules', 'Statut', 'Actions']} rows={list.map(c => [
      <button data-testid={`button-open-company-${c.id}`} aria-label={`Ouvrir ${c.name}`} onClick={() => { setSelected(c); onNavigate(`/maximus/entreprises/${encodeURIComponent(c.id)}`); }} className="flex items-center gap-3 text-left"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--primary)/.1)] text-[10px] font-black text-[hsl(var(--primary))]">{c.name.slice(0, 2).toUpperCase()}</span><span><strong className="block">{c.name}</strong><small className="text-xs text-[hsl(var(--muted-foreground))]">{c.email}</small></span></button>,
      c.manager,
      c.country,
      `${c.allowedModules.length} / ${c.requestedModules.length}`,
      <StatusBadge status={c.status} />,
      <div className="flex flex-wrap items-center gap-2">
        <button data-testid={`button-edit-company-${c.id}`} aria-label={`Modifier ${c.name}`} title={`Modifier ${c.name}`} onClick={() => setEditingCompany(c)} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-bold hover:bg-[hsl(var(--muted))]"><Edit3 size={14} /><span>Modifier</span></button>
        <button data-testid={`button-delete-company-${c.id}`} aria-label={`Supprimer ${c.name}`} title={c.id === 'kora' ? 'L’espace KORA est protégé' : `Supprimer ${c.name}`} disabled={c.id === 'kora'} onClick={() => deleteCompany(c)} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-bold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.08)] disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={14} /><span>Supprimer</span></button>
      </div>
    ])} />
    {editingCompany && <CompanyEditModal company={editingCompany} data={data} mutate={mutate} onClose={() => setEditingCompany(null)} />}
  </section>;
}
function FilterChip({ label, active = false, onClick }: { label: string; active?: boolean; onClick?: () => void }) { return <button data-testid={`button-filter-${label.toLowerCase().replace(/\s/g, '-')}`} onClick={onClick} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'hover:bg-[hsl(var(--muted))]'}`}>{label}</button>; }
function CompanyDetail({ company, mutate, onBack }: { company: Company; mutate: (fn: (d: StoreData) => void, msg?: string) => void; onBack: () => void }) { const [active, setActive] = useState(company.allowedModules); const toggle = (id: ModuleId) => setActive(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); return <div className="space-y-5"><button data-testid="button-back-companies" onClick={onBack} className="text-xs font-bold text-[hsl(var(--primary))]">← Retour aux entreprises</button><div className="card-surface rounded-2xl p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div className="flex gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--primary))] text-lg font-black text-[hsl(var(--primary-foreground))]">{company.name.slice(0, 2).toUpperCase()}</span><div><h2 className="text-2xl font-bold">{company.name}</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{company.sector} · {company.country}</p><div className="mt-3"><StatusBadge status={company.status} /></div></div></div><div className="flex gap-2"><ActionButton testId="button-suspend-company" icon={company.status === 'SUSPENDU' ? RefreshCw : ShieldCheck} onClick={() => mutate(d => { const c = d.companies.find(x => x.id === company.id); if (c) c.status = c.status === 'SUSPENDU' ? 'ACTIF' : 'SUSPENDU'; }, company.status === 'SUSPENDU' ? 'Entreprise réactivée.' : 'Entreprise suspendue.')}>{company.status === 'SUSPENDU' ? 'Réactiver' : 'Suspendre'}</ActionButton></div></div><div className="mt-8 grid gap-4 border-t pt-5 text-sm sm:grid-cols-3"><div><p className="text-xs text-[hsl(var(--muted-foreground))]">Responsable</p><p className="mt-1 font-bold">{company.manager}</p></div><div><p className="text-xs text-[hsl(var(--muted-foreground))]">Email</p><p className="mt-1 font-bold">{company.email}</p></div><div><p className="text-xs text-[hsl(var(--muted-foreground))]">Demande reçue</p><p className="mt-1 font-bold">{company.createdAt}</p></div></div></div><section className="card-surface rounded-2xl p-6"><div className="flex items-center justify-between"><div><h2 className="font-bold">Modules autorisés</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Ajustez le périmètre de l’espace.</p></div><span className="mono text-xs text-[hsl(var(--muted-foreground))]">{active.length} / 5</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{modules.map(m => <button data-testid={`button-toggle-company-module-${m.id}`} key={m.id} onClick={() => toggle(m.id)} className={`flex items-center justify-between rounded-xl border p-4 text-left ${active.includes(m.id) ? 'border-[hsl(var(--primary)/.4)] bg-[hsl(var(--primary)/.05)]' : 'bg-[hsl(var(--muted)/.4)] opacity-65'}`}><div className="flex items-center gap-3"><span className="rounded-lg bg-[hsl(var(--muted))] p-2"><LayoutGrid size={16} /></span><div><strong className="text-sm">{m.name}</strong><p className="text-[11px] text-[hsl(var(--muted-foreground))]">{m.description}</p></div></div><span className={`flex h-5 w-5 items-center justify-center rounded-full border ${active.includes(m.id) ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white' : ''}`}>{active.includes(m.id) && <Check size={13} />}</span></button>)}</div><div className="mt-6 flex justify-end"><ActionButton primary testId="button-save-company-modules" onClick={() => mutate(d => { const c = d.companies.find(x => x.id === company.id); if (c) { c.allowedModules = active; c.refusedModules = c.requestedModules.filter(x => !active.includes(x)); } }, 'Configuration enregistrée.')}>Enregistrer la configuration</ActionButton></div></section></div>; }

function RequestsPage({ data, mutate, onNavigate }: { data: StoreData; mutate: (fn: (d: StoreData) => void, msg?: string) => void; onNavigate: (p: string) => void }) {
  const requests = data.companies.filter(c => c.status === 'EN ATTENTE');
  return <div className="space-y-4">{requests.length === 0 ? <EmptyState title="Aucune demande en attente" text="Toutes les demandes ont été traitées." action={() => onNavigate('/maximus/entreprises')} /> : requests.map(c => <section data-testid={`card-request-${c.id}`} key={c.id} className="card-surface rounded-2xl p-5 sm:p-6"><div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center"><div className="flex gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--accent)/.24)] font-black">{c.name.slice(0, 2).toUpperCase()}</span><div><h2 className="font-bold">{c.name}</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{c.manager} · {c.email} · {c.country}</p><div className="mt-3 flex flex-wrap gap-2">{c.requestedModules.map(x => <span key={x} className="rounded-full bg-[hsl(var(--muted))] px-2.5 py-1 text-[10px] font-bold">{modules.find(m => m.id === x)?.name}</span>)}</div></div></div><div className="flex gap-2"><ActionButton testId={`button-refuse-request-${c.id}`} icon={X} onClick={() => mutate(d => { const x = d.companies.find(y => y.id === c.id); if (x) x.status = 'REFUSÉ'; }, 'Demande refusée.')}>Refuser</ActionButton><ActionButton primary testId={`button-approve-request-${c.id}`} icon={Check} onClick={() => mutate(d => { const x = d.companies.find(y => y.id === c.id); if (x) { x.status = 'ACTIF'; x.allowedModules = [...x.requestedModules]; } }, 'Entreprise activée.')}>Autoriser l’espace</ActionButton></div></div></section>)}</div>;
}
function ModulesPage({ data, mutate }: { data: StoreData; mutate: (fn: (d: StoreData) => void, msg?: string) => void }) { return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{modules.map((m, i) => { const active = (data.moduleStatuses?.[m.id] ?? m.status) !== 'INACTIF'; return <section data-testid={`card-module-${m.id}`} key={m.id} className={`card-surface rounded-2xl p-5 fade-up fade-up-delay-${Math.min(i + 1, 3)}`}><div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><LayoutGrid size={19} /></span><StatusBadge status={active ? m.status : 'INACTIF'} /></div><h2 className="mt-5 text-lg font-bold">{m.name}</h2><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{m.description}</p><div className="mt-5 space-y-2 border-t pt-4">{m.features.map(f => <div key={f} className="flex items-center gap-2 text-xs"><Check size={14} className="text-[hsl(var(--primary))]" />{f}</div>)}</div><button data-testid={`button-toggle-module-${m.id}`} onClick={() => mutate(draft => { draft.moduleStatuses = { ...(draft.moduleStatuses ?? {}), [m.id]: active ? 'INACTIF' : m.status }; }, active ? `${m.name} désactivé.` : `${m.name} activé.`)} className="mt-5 text-xs font-bold text-[hsl(var(--primary))]">{active ? 'Désactiver' : 'Activer'} <ChevronRight className="inline" size={14} /></button></section>; })}</div>; }
function SectorPresetsPage({ data, mutate }: { data: StoreData; mutate: (fn: (d: StoreData) => void, msg?: string) => void }) {
  const [sectorName, setSectorName] = useState('');
  const [sectorModules, setSectorModules] = useState<ModuleId[]>([]);
  const [editingSector, setEditingSector] = useState<SectorPreset | null>(null);
  const [sectorError, setSectorError] = useState('');
  const sectorPresets = data.sectorPresets ?? [];
  const moduleName = (id: ModuleId) => modules.find(module => module.id === id)?.name ?? id;

  const toggleSectorModule = (moduleId: ModuleId) => {
    setSectorModules(previous => {
      setSectorError('');
      return previous.includes(moduleId) ? previous.filter(id => id !== moduleId) : [...previous, moduleId];
    });
  };

  const openSector = (preset?: SectorPreset) => {
    setEditingSector(preset ?? null);
    setSectorName(preset?.name ?? '');
    setSectorModules(preset ? [...preset.moduleIds] : []);
    setSectorError('');
  };

  const createSector = (event: FormEvent) => {
    event.preventDefault();
    const normalizedName = sectorName.trim();
    if (!normalizedName) {
      setSectorError('Saisissez le nom du secteur.');
      return;
    }
    if (sectorPresets.some(preset => preset.id !== editingSector?.id && preset.name.toLowerCase() === normalizedName.toLowerCase())) {
      setSectorError('Ce secteur existe déjà.');
      return;
    }
    if (sectorModules.length === 0) {
      setSectorError('Sélectionnez au moins un module par défaut.');
      return;
    }
    const preset: SectorPreset = { id: editingSector?.id ?? uid('sector'), name: normalizedName, moduleIds: [...sectorModules] };
    mutate(draft => { draft.sectorPresets = editingSector ? (draft.sectorPresets ?? []).map(item => item.id === editingSector.id ? preset : item) : [...(draft.sectorPresets ?? []), preset]; }, editingSector ? 'Secteur modifié.' : 'Secteur et modules par défaut enregistrés.');
    setSectorName('');
    setSectorModules([]);
    setEditingSector(null);
    setSectorError('');
  };

  const deleteSector = (preset: SectorPreset) => {
    if (data.companies.some(company => company.sector === preset.name)) {
      setSectorError(`Le secteur « ${preset.name} » est déjà utilisé par une entreprise.`);
      return;
    }
    if (!window.confirm(`Supprimer le secteur « ${preset.name} » ?`)) return;
    mutate(draft => { draft.sectorPresets = (draft.sectorPresets ?? []).filter(item => item.id !== preset.id); }, 'Secteur supprimé.');
  };

  return <div className="space-y-5">
    <section className="card-surface rounded-2xl p-6">
      <div className="flex items-start gap-3"><span className="rounded-xl bg-[hsl(var(--accent)/.2)] p-3 text-[hsl(var(--foreground))]"><Building2 size={19} /></span><div><p className="mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">Profils d’inscription</p><h2 className="mt-2 text-xl font-bold">Configurer un secteur d’activité</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Associez une sélection de modules à chaque secteur. Lors de l’inscription, le choix du secteur préremplit cette sélection, que l’entreprise pourra ensuite ajuster.</p></div></div>
      <form onSubmit={createSector} className="mt-6 border-t pt-5">
        <label className="block max-w-md text-sm font-semibold">Nom du secteur<input data-testid="input-sector-name" value={sectorName} onChange={event => setSectorName(event.target.value)} placeholder="Ex. Bâtiment et travaux publics" className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm font-normal" /></label>
        <p className="mt-5 text-sm font-semibold">Modules proposés automatiquement</p>
        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Sélectionnez librement les modules à proposer pour ce secteur.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{modules.map(module => <button type="button" data-testid={`button-sector-module-${module.id}`} key={module.id} onClick={() => toggleSectorModule(module.id)} className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${sectorModules.includes(module.id) ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.06)]' : 'border-[hsl(var(--border))]'}`}><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${sectorModules.includes(module.id) ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border-[hsl(var(--border))]'}`}>{sectorModules.includes(module.id) && <Check size={13} />}</span><span><strong className="block text-sm">{module.name}</strong><span className="mt-1 block text-[11px] text-[hsl(var(--muted-foreground))]">{module.description}</span></span></button>)}</div>
        {sectorError && <p data-testid="sector-error" className="mt-4 rounded-lg bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-xs font-semibold text-[hsl(var(--destructive))]">{sectorError}</p>}
         <div className="mt-5 flex flex-wrap gap-2"><button data-testid="button-create-sector" type="submit" className="btn inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]">{editingSector ? <Edit3 size={15} /> : <Plus size={15} />}{editingSector ? 'Enregistrer les modifications' : 'Enregistrer le secteur'}</button>{editingSector && <button type="button" onClick={() => openSector()} className="rounded-lg border px-4 py-2.5 text-xs font-bold">Annuler la modification</button>}</div>
      </form>
    </section>
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3 px-1"><div><h2 className="font-bold">Secteurs configurés</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{sectorPresets.length} secteur{sectorPresets.length > 1 ? 's' : ''} disponible{sectorPresets.length > 1 ? 's' : ''} à l’inscription</p></div></div>
      {sectorPresets.map(preset => <article data-testid={`card-sector-preset-${preset.id}`} key={preset.id} className="card-surface flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-start gap-3"><span className="rounded-lg bg-[hsl(var(--primary)/.1)] p-3 text-[hsl(var(--primary))]"><Building2 size={19} /></span><div><strong>{preset.name}</strong><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{preset.moduleIds.length} module{preset.moduleIds.length > 1 ? 's' : ''} proposé{preset.moduleIds.length > 1 ? 's' : ''} automatiquement</p><div className="mt-2 flex flex-wrap gap-1.5">{preset.moduleIds.map(moduleId => <span key={moduleId} className="rounded-full bg-[hsl(var(--muted))] px-2 py-1 text-[10px] font-semibold">{moduleName(moduleId)}</span>)}</div></div></div><div className="flex self-start sm:self-center"><button type="button" data-testid={`button-edit-sector-${preset.id}`} onClick={() => openSector(preset)} aria-label={`Modifier le secteur ${preset.name}`} className="rounded-lg p-2 hover:bg-[hsl(var(--muted))]"><Edit3 size={16} /></button><button type="button" data-testid={`button-delete-sector-${preset.id}`} onClick={() => deleteSector(preset)} aria-label={`Supprimer le secteur ${preset.name}`} className="rounded-lg p-2 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.08)]"><Trash2 size={16} /></button></div></article>)}
      {sectorPresets.length === 0 && <div className="card-surface rounded-2xl border-dashed p-10 text-center"><Building2 className="mx-auto text-[hsl(var(--muted-foreground))]" size={26} /><h3 className="mt-4 font-bold">Aucun secteur configuré</h3><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Ajoutez un premier secteur pour guider les inscriptions.</p></div>}
    </section>
  </div>;
}
function SimpleAdminPage({ type, data, onNavigate }: { type: 'users'; data: StoreData; onNavigate: (path: string) => void }) { return <section className="card-surface overflow-hidden rounded-2xl"><div className="border-b p-5"><Toolbar search={''} setSearch={() => {}}><ActionButton primary testId="button-add-user" onClick={() => onNavigate('/maximus/entreprises/organisation')}>Gérer les comptes employés</ActionButton></Toolbar></div><DataTable headers={['Utilisateur', 'Espace', 'Dernière activité', 'Statut']} rows={[['admin@maximus.demo', 'Administration MAXIMUS', 'Aujourd’hui, 10:22', <StatusBadge status="ACTIF" />], ...data.employees.map(e => [`${e.firstName} ${e.lastName}`, data.companies.find(company => company.id === e.companyId)?.name ?? 'Entreprise', 'Compte actif', <StatusBadge status={e.status} />])]} /></section>; }
function RolesPage({ data, onNavigate }: { data: StoreData; onNavigate: (path: string) => void }) { if (data.roles.length === 0) return <EmptyState title="Aucun rôle configuré" text="Créez les rôles depuis l’organisation de l’entreprise concernée." action={() => onNavigate('/maximus/entreprises/organisation')} />; return <div className="grid gap-4 lg:grid-cols-3">{data.roles.map(role => <section key={role.id} data-testid={`card-role-${role.id}`} className="card-surface rounded-2xl p-5"><div className="flex items-start justify-between"><span className="rounded-xl bg-[hsl(var(--primary)/.1)] p-3 text-[hsl(var(--primary))]"><KeyRound size={18} /></span><button data-testid={`button-edit-role-${role.id}`} title="Modifier dans l’organisation" onClick={() => onNavigate('/maximus/entreprises/organisation')} className="rounded-lg p-2 hover:bg-[hsl(var(--muted))]"><SlidersHorizontal size={16} /></button></div><h2 className="mt-5 font-bold">{role.name}</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{role.description}</p><div className="mt-5 space-y-2">{Object.keys(role.modulePermissions).map(key => <div key={key} className="flex items-center justify-between text-xs"><span>{modules.find(m => m.id === key)?.name ?? key}</span><span className="text-[hsl(var(--muted-foreground))]">{role.modulePermissions[key].join(' · ')}</span></div>)}</div></section>)}</div>; }
function SubscriptionsPage({ data }: { data: StoreData }) { return <div className="grid gap-4 md:grid-cols-3">{data.companies.map(c => <section className="card-surface rounded-2xl p-5" key={c.id}><div className="flex items-center justify-between"><span className="font-bold">{c.name}</span><StatusBadge status={c.status} /></div><p className="mt-6 text-3xl font-bold">Sur mesure</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Facturation mensuelle · {c.allowedModules.length} modules</p><div className="mt-5 h-1.5 rounded-full bg-[hsl(var(--muted))]"><div className="h-full rounded-full bg-[hsl(var(--primary))]" style={{ width: `${Math.max(12, c.allowedModules.length * 20)}%` }} /></div></section>)}</div>; }
function NotificationsPage({ data, mutate }: { data: StoreData; mutate: (fn: (d: StoreData) => void, msg?: string) => void }) { return <div className="space-y-3">{data.notifications.map(n => <section data-testid={`notification-${n.id}`} key={n.id} className={`card-surface flex items-start gap-4 rounded-2xl p-5 ${!n.read ? 'border-l-4 border-l-[hsl(var(--accent))]' : ''}`}><span className="rounded-xl bg-[hsl(var(--muted))] p-3"><Bell size={17} /></span><div className="flex-1"><div className="flex justify-between gap-3"><h2 className="font-bold">{n.title}</h2><span className="text-[10px] text-[hsl(var(--muted-foreground))]">{n.date}</span></div><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{n.text}</p>{!n.read && <button data-testid={`button-read-notification-${n.id}`} onClick={() => mutate(d => { const x = d.notifications.find(y => y.id === n.id); if (x) x.read = true; }, 'Notification marquée comme lue.')} className="mt-3 text-xs font-bold text-[hsl(var(--primary))]">Marquer comme lue</button>}</div></section>)}</div>; }
function JournalPage({ data }: { data: StoreData }) { const [search, setSearch] = useState(''); const rows = data.activities.filter(a => `${a.user} ${a.action} ${a.object}`.toLowerCase().includes(search.toLowerCase())); return <section className="card-surface overflow-hidden rounded-2xl"><div className="border-b p-5"><Toolbar search={search} setSearch={setSearch}><button data-testid="button-filter-journal" onClick={() => setSearch(search ? '' : 'finance')} className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-bold"><SlidersHorizontal size={14} />{search ? 'Réinitialiser' : 'Filtrer Finance'}</button></Toolbar></div><DataTable headers={['Utilisateur', 'Action', 'Module', 'Objet', 'Date', 'État']} rows={rows.map(a => [a.user, a.action, a.module, a.object, a.date, <StatusBadge status={a.status} />])} /></section>; }

function OrganisationPage({ data, mutate }: { data: StoreData; mutate: (fn: (d: StoreData) => void, msg?: string) => void }) { const [modal, setModal] = useState<OrgNode | 'new' | null>(null); const [name, setName] = useState(''); const [parent, setParent] = useState<string | null>(null); const roots = data.orgNodes.filter(n => !n.parentId); const open = (node: OrgNode | 'new') => { setModal(node); setName(node === 'new' ? '' : node.name); setParent(node === 'new' ? null : node.parentId); }; return <div className="grid gap-6 lg:grid-cols-[1fr_320px]"><section className="card-surface rounded-2xl p-5 sm:p-6"><div className="mb-6 flex items-center justify-between"><div><h2 className="font-bold">Arborescence</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Déployez vos équipes à la profondeur qui vous convient.</p></div><ActionButton primary testId="button-add-org-node" onClick={() => open('new')}>Ajouter un nœud</ActionButton></div><div className="space-y-2">{roots.map(node => <OrgTree key={node.id} node={node} nodes={data.orgNodes} onEdit={open} onDelete={id => mutate(d => { d.orgNodes = d.orgNodes.filter(n => n.id !== id && n.parentId !== id); }, 'Nœud supprimé.')} />)}</div></section><section className="card-surface grid-lines rounded-2xl p-5"><GitBranch size={19} className="text-[hsl(var(--primary))]" /><h2 className="mt-5 font-bold">Une structure vivante</h2><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Direction, département, service ou équipe : chaque nœud peut accueillir ses propres enfants.</p><div className="mt-6 border-t pt-4"><p className="mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total nœuds</p><p className="mt-1 text-2xl font-bold">{data.orgNodes.length}</p></div></section>{modal && <Modal title={modal === 'new' ? 'Nouveau nœud' : 'Modifier le nœud'} onClose={() => setModal(null)}><div className="space-y-4"><Field label="Nom" value={name} onChange={setName} testId="input-org-name" /><label className="block text-sm font-semibold">Parent<select data-testid="select-org-parent" value={parent ?? ''} onChange={e => setParent(e.target.value || null)} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-3 text-sm"><option value="">Racine</option>{data.orgNodes.filter(n => modal === 'new' || n.id !== (modal as OrgNode).id).map(n => <option key={n.id} value={n.id}>{n.name}</option>)}</select></label><div className="flex justify-end gap-2"><button data-testid="button-cancel-org" onClick={() => setModal(null)} className="rounded-lg border px-4 py-2 text-sm font-bold">Annuler</button><ActionButton primary testId="button-save-org" onClick={() => { if (!name) return; mutate(d => { if (modal === 'new') d.orgNodes.push({ id: uid('org'), name, type: 'service', parentId: parent }); else { const x = d.orgNodes.find(n => n.id === (modal as OrgNode).id); if (x) { x.name = name; x.parentId = parent; } } }, 'Organisation mise à jour.'); setModal(null); }}>Enregistrer</ActionButton></div></div></Modal>}</div>; }
function OrgTree({ node, nodes, onEdit, onDelete, depth = 0 }: { node: OrgNode; nodes: OrgNode[]; onEdit: (n: OrgNode) => void; onDelete: (id: string) => void; depth?: number }) { const [expanded, setExpanded] = useState(true); const children = nodes.filter(n => n.parentId === node.id); return <div style={{ marginLeft: depth * 22 }}><div className="group flex items-center gap-2 rounded-lg px-2 py-2.5 hover:bg-[hsl(var(--muted)/.6)]"><button data-testid={`button-expand-org-${node.id}`} onClick={() => setExpanded(!expanded)} className="text-[hsl(var(--muted-foreground))]">{children.length ? <ChevronDown size={15} className={expanded ? '' : '-rotate-90'} /> : <span className="block w-[15px]" />}</button><span className="rounded-lg bg-[hsl(var(--primary)/.1)] p-2 text-[hsl(var(--primary))]"><Building2 size={14} /></span><span className="flex-1 text-sm font-bold">{node.name}<small className="ml-2 text-[10px] font-normal text-[hsl(var(--muted-foreground))]">{node.type}</small></span><button data-testid={`button-edit-org-${node.id}`} onClick={() => onEdit(node)} className="invisible rounded p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] group-hover:visible"><Settings size={14} /></button><button data-testid={`button-delete-org-${node.id}`} onClick={() => onDelete(node.id)} className="invisible rounded p-1.5 text-[hsl(var(--destructive))] group-hover:visible"><Trash2 size={14} /></button></div>{expanded && children.map(child => <OrgTree key={child.id} node={child} nodes={nodes} onEdit={onEdit} onDelete={onDelete} depth={depth + 1} />)}</div>; }
function EmployeesPage({ data, mutate, companyAdmin, sectorAdminDepartment }: { data: StoreData; mutate: (fn: (d: StoreData) => void, msg?: string) => void; companyAdmin: boolean; sectorAdminDepartment?: string }) {
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<Employee | 'new' | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', position: '', department: sectorAdminDepartment ?? 'Commerce', role: 'Vendeur', loginPassword: 'Kora123!', isSectorAdmin: false });
  const list = data.employees.filter(e => !sectorAdminDepartment || e.department === sectorAdminDepartment).filter(e => `${e.firstName} ${e.lastName} ${e.position} ${e.email}`.toLowerCase().includes(search.toLowerCase()));
  const resetForm = () => setForm({ firstName: '', lastName: '', email: '', phone: '', position: '', department: sectorAdminDepartment ?? 'Commerce', role: 'Vendeur', loginPassword: 'Kora123!', isSectorAdmin: false });
  const openEmployee = (employee?: Employee) => {
    setModal(employee ?? 'new');
    setForm(employee ? { firstName: employee.firstName, lastName: employee.lastName, email: employee.email, phone: employee.phone, position: employee.position, department: employee.department, role: employee.role, loginPassword: employee.loginPassword ?? '', isSectorAdmin: Boolean(employee.isSectorAdmin) } : { firstName: '', lastName: '', email: '', phone: '', position: '', department: sectorAdminDepartment ?? 'Commerce', role: 'Vendeur', loginPassword: 'Kora123!', isSectorAdmin: false });
  };
  const saveEmployee = () => {
    if (!form.firstName || !form.lastName || !form.email || !form.position || !form.loginPassword) return;
    if (data.employees.some(e => e.id !== (modal !== 'new' && modal ? modal.id : '') && e.email.toLowerCase() === form.email.trim().toLowerCase())) return;
    mutate(d => {
      if (modal !== 'new' && modal) {
        const target = d.employees.find(employee => employee.id === modal.id);
        if (target) Object.assign(target, { ...form, email: form.email.trim().toLowerCase(), isSectorAdmin: companyAdmin && form.isSectorAdmin });
      } else {
        d.employees.push({ id: uid('emp'), ...form, email: form.email.trim().toLowerCase(), subDepartment: '', status: 'ACTIF', isSectorAdmin: companyAdmin && form.isSectorAdmin });
      }
    }, modal !== 'new' && modal ? 'Compte employé modifié.' : companyAdmin && form.isSectorAdmin ? 'Administrateur de secteur créé avec ses identifiants.' : 'Compte employé créé avec ses identifiants.');
    setModal(null);
    resetForm();
  };
  return <div className="space-y-5">
    <section className="rounded-2xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.05)] p-5">
      <div className="flex items-start gap-3"><span className="rounded-xl bg-[hsl(var(--primary)/.12)] p-3 text-[hsl(var(--primary))]"><KeyRound size={18} /></span><div><h2 className="font-bold">{companyAdmin ? 'Administration des secteurs' : `Administration du secteur ${sectorAdminDepartment}`}</h2><p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{companyAdmin ? 'Créez un administrateur pour chaque secteur. Il pourra ensuite gérer les employés de son secteur.' : 'Vous pouvez gérer les employés de votre secteur. Leur rôle définit les modules et actions accessibles après connexion.'}</p></div></div>
    </section>
    <section className="card-surface overflow-hidden rounded-2xl">
       <div className="border-b p-5"><Toolbar search={search} setSearch={setSearch}><ActionButton primary testId="button-add-employee" onClick={() => openEmployee()}><UserPlus size={15} />{companyAdmin ? 'Créer un compte' : 'Créer un employé'}</ActionButton></Toolbar></div>
       <DataTable headers={['Employé', 'Poste', 'Département', 'Rôle autorisé', 'Accès de connexion', 'Statut', '']} rows={list.map(e => [<div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--accent)/.28)] text-[10px] font-black">{e.firstName[0]}{e.lastName[0]}</span><span><strong className="block">{e.firstName} {e.lastName}</strong><small className="text-xs text-[hsl(var(--muted-foreground))]">{e.email}</small></span></div>, e.position, `${e.department}${e.subDepartment ? ` · ${e.subDepartment}` : ''}`, <div><strong>{e.role}</strong>{e.isSectorAdmin && <span className="ml-2 rounded-full bg-[hsl(var(--accent)/.28)] px-2 py-1 text-[9px] font-bold">Admin secteur</span>}</div>, <div className="text-xs"><span className="block font-semibold">Email + mot de passe</span><small className="text-[hsl(var(--muted-foreground))]">{e.loginPassword ?? 'Kora123!'}</small></div>, <StatusBadge status={e.status} />, <div className="flex gap-1"><button data-testid={`button-edit-employee-${e.id}`} title="Modifier" onClick={() => openEmployee(e)} className="rounded-lg p-2 hover:bg-[hsl(var(--muted))]"><Settings size={15} /></button><button data-testid={`button-remove-employee-${e.id}`} title="Supprimer" onClick={() => { if (window.confirm(`Supprimer le compte de ${e.firstName} ${e.lastName} ?`)) mutate(d => { d.employees = d.employees.filter(x => x.id !== e.id); }, 'Compte employé supprimé.'); }} className="rounded-lg p-2 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--muted))]"><Trash2 size={15} /></button></div>])} />
    </section>
     {modal && <Modal title={modal === 'new' ? companyAdmin ? 'Créer un compte de secteur' : 'Créer un compte employé' : 'Modifier le compte employé'} onClose={() => { setModal(null); resetForm(); }}><div className="grid gap-4 sm:grid-cols-2"><Field label="Prénom" value={form.firstName} onChange={v => setForm({ ...form, firstName: v })} testId="input-employee-firstname" /><Field label="Nom" value={form.lastName} onChange={v => setForm({ ...form, lastName: v })} testId="input-employee-lastname" /><Field label="Email de connexion" value={form.email} onChange={v => setForm({ ...form, email: v })} type="email" testId="input-employee-email" /><Field label="Téléphone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} testId="input-employee-phone" /><Field label="Poste" value={form.position} onChange={v => setForm({ ...form, position: v })} testId="input-employee-position" /><Field label="Mot de passe initial" value={form.loginPassword} onChange={v => setForm({ ...form, loginPassword: v })} type="text" testId="input-employee-password" /></div><label className="mt-4 block text-sm font-semibold">Département<select disabled={!companyAdmin} data-testid="select-employee-department" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="mt-2 w-full rounded-lg border bg-transparent px-3 py-3 text-sm disabled:opacity-60"><option>Commerce</option><option>Finance</option><option>Opérations</option><option>RH</option><option>Direction</option></select></label><label className="mt-4 block text-sm font-semibold">Rôle et poste autorisé<select data-testid="select-employee-role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="mt-2 w-full rounded-lg border bg-transparent px-3 py-3 text-sm">{data.roles.map(role => <option key={role.id} value={role.name}>{role.name}</option>)}</select></label>{companyAdmin && <label className="mt-4 flex items-start gap-3 rounded-lg border border-[hsl(var(--border))] p-3 text-sm"><input data-testid="checkbox-sector-admin" type="checkbox" checked={form.isSectorAdmin} onChange={e => setForm({ ...form, isSectorAdmin: e.target.checked })} className="mt-1" /><span><strong className="block">Administrateur de secteur</strong><small className="font-normal text-[hsl(var(--muted-foreground))]">Autoriser ce compte à gérer les employés de son département.</small></span></label>}<p className="mt-4 rounded-lg bg-[hsl(var(--muted))] p-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">L’employé se connectera avec cet email et ce mot de passe. Son rôle détermine les modules visibles et les actions autorisées.</p><div className="mt-6 flex justify-end"><ActionButton primary testId="button-save-employee" onClick={saveEmployee}>{modal === 'new' ? 'Créer le compte' : 'Enregistrer les modifications'}</ActionButton></div></Modal>}
  </div>;
}
function KoraRolesPage({ data, mutate }: { data: StoreData; mutate: (fn: (d: StoreData) => void, msg?: string) => void }) {
  const [modal, setModal] = useState<Role | 'new' | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const open = (role?: Role) => { setModal(role ?? 'new'); setName(role?.name ?? ''); setDescription(role?.description ?? ''); };
  const save = () => {
    if (!name.trim()) return;
    const permissions: Role['modulePermissions'] = { finance: ['voir'] };
    mutate(d => {
      if (modal !== 'new' && modal) {
        const target = d.roles.find(role => role.id === modal.id);
        if (target) { target.name = name.trim(); target.description = description.trim() || 'Rôle personnalisé KORA.'; }
      } else d.roles.push({ id: uid('role'), name: name.trim(), description: description.trim() || 'Rôle personnalisé KORA.', modulePermissions: permissions });
    }, modal !== 'new' && modal ? 'Rôle modifié.' : 'Rôle créé.');
    setModal(null); setName(''); setDescription('');
  };
  const remove = (role: Role) => {
    if (data.employees.some(employee => employee.roleId === role.id || employee.role === role.name)) { window.alert('Ce rôle est utilisé par un ou plusieurs employés. Réaffectez-les avant de le supprimer.'); return; }
    if (!window.confirm(`Supprimer le rôle « ${role.name} » ?`)) return;
    mutate(d => { d.roles = d.roles.filter(item => item.id !== role.id); }, 'Rôle supprimé.');
  };
  return <div className="space-y-4"><div className="flex justify-end"><ActionButton primary testId="button-add-kora-role" onClick={() => open()}>Ajouter un rôle</ActionButton></div><div className="grid gap-4 md:grid-cols-3">{data.roles.map(r => <section data-testid={`card-kora-role-${r.id}`} key={r.id} className="card-surface rounded-2xl p-5"><div className="flex items-start justify-between"><span className="rounded-xl bg-[hsl(var(--primary)/.1)] p-3 text-[hsl(var(--primary))]"><ShieldCheck size={18} /></span><div className="flex flex-wrap gap-1"><button data-testid={`button-edit-kora-role-${r.id}`} aria-label={`Modifier le rôle ${r.name}`} title="Modifier" onClick={() => open(r)} className="inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold hover:bg-[hsl(var(--muted))]"><Settings size={13} /><span>Modifier</span></button><button data-testid={`button-delete-kora-role-${r.id}`} aria-label={`Supprimer le rôle ${r.name}`} title="Supprimer" onClick={() => remove(r)} className="inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--muted))]"><Trash2 size={13} /><span>Supprimer</span></button></div></div><h2 className="mt-5 font-bold">{r.name}</h2><p className="mt-1 text-sm leading-5 text-[hsl(var(--muted-foreground))]">{r.description}</p><div className="mt-5 flex flex-wrap gap-1.5">{Object.keys(r.modulePermissions).map(m => <span key={m} className="rounded-full bg-[hsl(var(--muted))] px-2 py-1 text-[10px] font-bold">{modules.find(x => x.id === m)?.name}</span>)}</div></section>)}</div>{modal && <Modal title={modal === 'new' ? 'Nouveau rôle' : 'Modifier le rôle'} onClose={() => setModal(null)}><Field label="Nom du rôle" value={name} onChange={setName} testId="input-role-name" /><Field label="Description" value={description} onChange={setDescription} testId="input-role-description" /><div className="mt-6 flex justify-end"><ActionButton primary testId="button-save-role" onClick={save}>{modal === 'new' ? 'Créer le rôle' : 'Enregistrer les modifications'}</ActionButton></div></Modal>}</div>;
}
function StocksPage({ data, mutate }: { data: StoreData; mutate: (fn: (d: StoreData) => void, msg?: string) => void }) {
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<StoreData['products'][number] | 'new' | null>(null);
  const [form, setForm] = useState({ name: '', sku: '', category: 'Divers', stock: 0, threshold: 0, price: 0 });
  const products = data.products.filter(p => `${p.name} ${p.sku}`.toLowerCase().includes(search.toLowerCase()));
  const open = (product?: StoreData['products'][number]) => { setModal(product ?? 'new'); setForm(product ? { name: product.name, sku: product.sku, category: product.category, stock: product.stock, threshold: product.threshold, price: product.price } : { name: '', sku: '', category: 'Divers', stock: 0, threshold: 0, price: 0 }); };
  const save = () => {
    if (!form.name.trim() || !form.sku.trim()) return;
    if (data.products.some(product => product.id !== (modal !== 'new' && modal ? modal.id : '') && product.sku.toLowerCase() === form.sku.trim().toLowerCase())) { window.alert('Cette référence existe déjà.'); return; }
    mutate(d => {
      if (modal !== 'new' && modal) { const target = d.products.find(product => product.id === modal.id); if (target) Object.assign(target, { ...form, name: form.name.trim(), sku: form.sku.trim() }); }
      else d.products.push({ id: uid('p'), ...form, name: form.name.trim(), sku: form.sku.trim() });
    }, modal !== 'new' && modal ? 'Produit modifié.' : 'Produit ajouté au catalogue.');
    setModal(null);
  };
  const remove = (product: StoreData['products'][number]) => {
    if (data.sales.some(sale => sale.items.some(item => item.productId === product.id))) { window.alert('Ce produit est référencé par une vente et ne peut pas être supprimé.'); return; }
    if (!window.confirm(`Supprimer le produit « ${product.name} » ?`)) return;
    mutate(d => { d.products = d.products.filter(item => item.id !== product.id); }, 'Produit supprimé.');
  };
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-3"><Metric label="Références actives" value={String(data.products.length)} detail="dans le catalogue KORA" icon={Package} accent /><Metric label="Unités en stock" value={String(data.products.reduce((a, p) => a + p.stock, 0))} detail="toutes localisations" icon={Boxes} /><Metric label="Alertes de seuil" value={String(data.products.filter(p => p.stock <= p.threshold).length)} detail="à réapprovisionner" icon={Bell} warning /></div><section className="card-surface overflow-hidden rounded-2xl"><div className="border-b p-5"><Toolbar search={search} setSearch={setSearch}><ActionButton primary testId="button-add-product" onClick={() => open()}>Ajouter un produit</ActionButton></Toolbar></div><DataTable headers={['Produit', 'SKU', 'Catégorie', 'Stock actuel', 'Seuil', 'Prix unitaire', 'État', 'Actions']} rows={products.map(p => [<strong>{p.name}</strong>, <span className="mono text-xs">{p.sku}</span>, p.category, <span className={p.stock <= p.threshold ? 'font-bold text-[hsl(var(--destructive))]' : 'font-bold'}>{p.stock}</span>, p.threshold, money(p.price), p.stock <= p.threshold ? <StatusBadge status="SUSPENDU" /> : <StatusBadge status="ACTIF" />, <div className="flex flex-wrap gap-1"><button aria-label={`Modifier ${p.name}`} title="Modifier" onClick={() => open(p)} className="inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold hover:bg-[hsl(var(--muted))]"><Settings size={13} /><span>Modifier</span></button><button aria-label={`Supprimer ${p.name}`} title="Supprimer" onClick={() => remove(p)} className="inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--muted))]"><Trash2 size={13} /><span>Supprimer</span></button></div>])} /></section>{modal && <Modal title={modal === 'new' ? 'Nouveau produit' : 'Modifier le produit'} onClose={() => setModal(null)}><div className="grid gap-4 sm:grid-cols-2"><Field label="Nom" value={form.name} onChange={value => setForm({ ...form, name: value })} testId="input-product-name" /><Field label="SKU" value={form.sku} onChange={value => setForm({ ...form, sku: value })} testId="input-product-sku" /><Field label="Catégorie" value={form.category} onChange={value => setForm({ ...form, category: value })} testId="input-product-category" /><Field label="Stock actuel" type="number" value={String(form.stock)} onChange={value => setForm({ ...form, stock: Number(value) })} testId="input-product-stock" /><Field label="Seuil" type="number" value={String(form.threshold)} onChange={value => setForm({ ...form, threshold: Number(value) })} testId="input-product-threshold" /><Field label="Prix unitaire" type="number" value={String(form.price)} onChange={value => setForm({ ...form, price: Number(value) })} testId="input-product-price" /></div><div className="mt-6 flex justify-end"><ActionButton primary testId="button-save-product" onClick={save}>{modal === 'new' ? 'Créer le produit' : 'Enregistrer les modifications'}</ActionButton></div></Modal>}</div>;
}
function FinancePage({ data, mutate }: { data: StoreData; mutate: (fn: (d: StoreData) => void, msg?: string) => void }) {
  const confirmed = data.payments.filter(p => p.status === 'CONFIRMÉ'); const pending = data.payments.filter(p => p.status === 'EN ATTENTE');
  const [editing, setEditing] = useState<StoreData['payments'][number] | null>(null); const [invoice, setInvoice] = useState(''); const [amount, setAmount] = useState('');
  const open = (payment: StoreData['payments'][number]) => { setEditing(payment); setInvoice(payment.invoice); setAmount(String(payment.amount)); };
  const save = () => { if (!editing || !invoice.trim() || !amount || Number(amount) < 0) return; mutate(d => { const target = d.payments.find(payment => payment.id === editing.id); if (target) { target.invoice = invoice.trim(); target.amount = Number(amount); } }, 'Paiement modifié.'); setEditing(null); };
  const remove = (payment: StoreData['payments'][number]) => { if (!window.confirm(`Supprimer le paiement ${payment.reference} ?`)) return; mutate(d => { d.payments = d.payments.filter(item => item.id !== payment.id); }, 'Paiement supprimé.'); };
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-3"><Metric label="Revenus encaissés" value={shortMoney(confirmed.reduce((a, p) => a + p.amount, 0))} suffix=" FCFA" detail="depuis le début du mois" icon={WalletCards} accent /><Metric label="En attente" value={shortMoney(pending.reduce((a, p) => a + p.amount, 0))} suffix=" FCFA" detail={`${pending.length} paiements à suivre`} icon={CreditCard} /><Metric label="Taux d’encaissement" value="84,6" suffix="%" detail="+4,2 points ce mois" icon={TrendingUp} /></div><section className="card-surface overflow-hidden rounded-2xl"><div className="border-b p-5"><h2 className="font-bold">Paiements récents</h2></div><DataTable headers={['Référence', 'Facture', 'Montant', 'Date', 'Statut', 'Actions']} rows={data.payments.map(p => [<strong>{p.reference}</strong>, p.invoice, money(p.amount), p.date, <StatusBadge status={p.status} />, p.status === 'EN ATTENTE' ? <div className="flex flex-wrap gap-1"><button data-testid={`button-edit-payment-${p.id}`} aria-label={`Modifier le paiement ${p.reference}`} title="Modifier" onClick={() => open(p)} className="inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold hover:bg-[hsl(var(--muted))]"><Settings size={13} /><span>Modifier</span></button><button data-testid={`button-delete-payment-${p.id}`} aria-label={`Supprimer le paiement ${p.reference}`} title="Supprimer" onClick={() => remove(p)} className="inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--muted))]"><Trash2 size={13} /><span>Supprimer</span></button><button data-testid={`button-confirm-payment-${p.id}`} onClick={() => mutate(d => { const x = d.payments.find(y => y.id === p.id); if (x) x.status = 'CONFIRMÉ'; d.activities.unshift({ id: uid('a'), user: 'Aminata Diop', action: 'a confirmé un paiement', module: 'Finance', object: p.reference, date: 'À l’instant', status: 'CONFIRMÉ' }); }, 'Paiement confirmé.')} className="rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-[10px] font-bold text-[hsl(var(--primary-foreground))]">Confirmer</button></div> : <Check size={16} className="text-[hsl(var(--primary))]" />])} /></section>{editing && <Modal title="Modifier le paiement" onClose={() => setEditing(null)}><div className="space-y-4"><Field label="Facture" value={invoice} onChange={setInvoice} testId="input-payment-invoice" /><Field label="Montant (FCFA)" value={amount} onChange={setAmount} type="number" testId="input-payment-amount" /></div><div className="mt-6 flex justify-end"><ActionButton primary testId="button-save-payment" onClick={save}>Enregistrer les modifications</ActionButton></div></Modal>}</div>;
}
function CommercePage({ data, mutate }: { data: StoreData; mutate: (fn: (d: StoreData) => void, msg?: string) => void }) {
  const [modal, setModal] = useState<Sale | 'new' | null>(null); const [client, setClient] = useState(''); const [amount, setAmount] = useState('');
  const open = (sale?: Sale) => { setModal(sale ?? 'new'); setClient(sale?.client ?? ''); setAmount(sale ? String(sale.amount) : ''); };
  const validateSale = (sale: Sale) => mutate(d => { const s = d.sales.find(x => x.id === sale.id); if (!s || s.status === 'VALIDÉ') return; s.status = 'VALIDÉ'; s.items.forEach(item => { const p = d.products.find(x => x.id === item.productId); if (p) { p.stock -= item.quantity; d.movements.unshift({ id: uid('m'), product: p.name, quantity: item.quantity, type: 'SORTIE', date: 'À l’instant', user: 'Aminata Diop', location: 'Boutique Dakar' }); } }); d.activities.unshift({ id: uid('a'), user: 'Aminata Diop', action: 'a validé une vente', module: 'Commerce', object: sale.reference, date: 'À l’instant', status: 'VALIDÉ' }); }, 'Vente validée et stock mis à jour.');
  const save = () => { if (!client.trim() || !amount || Number(amount) < 0) return; mutate(d => { if (modal !== 'new' && modal) { const target = d.sales.find(sale => sale.id === modal.id); if (target) { target.client = client.trim(); target.amount = Number(amount); } } else d.sales.unshift({ id: uid('sale'), reference: `VTE-${Date.now().toString().slice(-6)}`, client: client.trim(), amount: Number(amount), status: 'BROUILLON', date: 'À l’instant', items: [] }); }, modal !== 'new' && modal ? 'Vente modifiée.' : 'Vente enregistrée en brouillon.'); setModal(null); };
  const remove = (sale: Sale) => { if (!window.confirm(`Supprimer le brouillon ${sale.reference} ?`)) return; mutate(d => { d.sales = d.sales.filter(item => item.id !== sale.id); }, 'Vente supprimée.'); };
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-3"><Metric label="Chiffre d’affaires" value={shortMoney(data.sales.filter(s => s.status === 'VALIDÉ').reduce((a, s) => a + s.amount, 0))} suffix=" FCFA" detail="ventes validées ce mois" icon={ShoppingCart} accent /><Metric label="Ventes du mois" value={String(data.sales.length)} detail="+8,4% vs. mois dernier" icon={TrendingUp} /><Metric label="Panier moyen" value={shortMoney(data.sales.length ? data.sales.reduce((a, s) => a + s.amount, 0) / data.sales.length : 0)} suffix=" FCFA" detail="sur les ventes enregistrées" icon={Store} /></div><section className="card-surface overflow-hidden rounded-2xl"><div className="flex items-center justify-between border-b p-5"><div><h2 className="font-bold">Ventes</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Valider une vente met à jour le stock automatiquement.</p></div><ActionButton primary testId="button-add-sale" onClick={() => open()}>Nouvelle vente</ActionButton></div><DataTable headers={['Référence', 'Client', 'Montant', 'Date', 'Statut', 'Actions']} rows={data.sales.map(s => [<strong>{s.reference}</strong>, s.client, money(s.amount), s.date, <StatusBadge status={s.status} />, s.status === 'BROUILLON' ? <div className="flex flex-wrap gap-1"><button data-testid={`button-edit-sale-${s.id}`} aria-label={`Modifier la vente ${s.reference}`} title="Modifier" onClick={() => open(s)} className="inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold hover:bg-[hsl(var(--muted))]"><Settings size={13} /><span>Modifier</span></button><button data-testid={`button-delete-sale-${s.id}`} aria-label={`Supprimer la vente ${s.reference}`} title="Supprimer" onClick={() => remove(s)} className="inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--muted))]"><Trash2 size={13} /><span>Supprimer</span></button><button data-testid={`button-validate-sale-${s.id}`} onClick={() => validateSale(s)} className="rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-[10px] font-bold text-[hsl(var(--primary-foreground))]">Valider</button></div> : <Check size={16} className="text-[hsl(var(--primary))]" />])} /></section>{modal && <Modal title={modal === 'new' ? 'Nouvelle vente' : 'Modifier la vente'} onClose={() => setModal(null)}><div className="space-y-4"><Field label="Client" value={client} onChange={setClient} placeholder="Nom du client" testId="input-sale-client" /><Field label="Montant (FCFA)" value={amount} onChange={setAmount} type="number" testId="input-sale-amount" /></div><div className="mt-6 flex justify-end"><ActionButton primary testId="button-save-sale" onClick={save}>{modal === 'new' ? 'Enregistrer le brouillon' : 'Enregistrer les modifications'}</ActionButton></div></Modal>}</div>;
}
function RHPage({ data }: { data: StoreData }) {
  const units = data.orgNodes.filter(node => node.companyId === 'kora');
  const employees = data.employees.filter(employee => employee.companyId === 'kora');
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
      <section className="card-surface rounded-2xl p-6">
        <h2 className="font-bold">Vue équipe</h2>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Répartition selon les unités réellement créées par l’entreprise.</p>
        <div className="mt-8 space-y-5">
          {units.map(unit => {
            const count = employees.filter(employee => employee.sectorId === unit.id).length;
            const width = employees.length ? Math.max((count / employees.length) * 100, count ? 8 : 0) : 0;
            return <div key={unit.id}><div className="mb-2 flex justify-between text-sm"><span className="font-bold">{unit.name}</span><span className="mono text-xs text-[hsl(var(--muted-foreground))]">{count} personne{count > 1 ? 's' : ''}</span></div><div className="h-2 rounded-full bg-[hsl(var(--muted))]"><div className="h-full rounded-full bg-[hsl(var(--primary))]" style={{ width: `${width}%` }} /></div></div>;
          })}
          {units.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">Aucune unité n’a encore été créée par l’entreprise.</p>}
        </div>
      </section>
      <section className="card-surface rounded-2xl p-6">
        <Users size={19} className="text-[hsl(var(--primary))]" />
        <h2 className="mt-5 font-bold">Effectif total</h2>
        <p className="mt-1 text-4xl font-bold">{employees.length}</p>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">collaborateurs enregistrés dans KORA</p>
        <div className="mt-6 border-t pt-5 text-xs leading-6 text-[hsl(var(--muted-foreground))]">{employees.filter(employee => employee.sectorId).length} employé(s) affecté(s) à une unité créée par l’entreprise.</div>
      </section>
    </div>
  );
}
function PresencesPage({ data }: { data: StoreData }) { return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-3"><Metric label="Présents aujourd’hui" value="18" detail="85,7% de l’effectif" icon={Check} accent /><Metric label="En retard" value="02" detail="à 09:30" icon={FileClock} warning /><Metric label="Absents" value="01" detail="absence signalée" icon={Users} /></div><section className="card-surface overflow-hidden rounded-2xl"><div className="flex items-center justify-between border-b p-5"><div><h2 className="font-bold">Pointage du mardi 18 juin</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Dernière synchronisation il y a 2 min</p></div><button data-testid="button-refresh-presences" onClick={() => window.location.reload()} className="rounded-lg border p-2 hover:bg-[hsl(var(--muted))]"><RefreshCw size={15} /></button></div><DataTable headers={['Collaborateur', 'Département', 'Arrivée', 'Départ', 'État']} rows={data.employees.map((e, i) => [`${e.firstName} ${e.lastName}`, e.department, ['08:42', '08:55', '09:31', '08:47'][i] ?? '09:02', '—', <StatusBadge status={i === 2 ? 'EN ATTENTE' : 'ACTIF'} />])} /></section></div>; }
function ReportsPage({ data }: { data: StoreData }) { return <div className="grid gap-4 md:grid-cols-2"><ReportCard title="Synthèse hebdomadaire" text="Ventes, encaissements, stocks et équipe sur les 7 derniers jours." date="Semaine du 12 au 18 juin" /><ReportCard title="État des stocks" text={`${data.products.filter(p => p.stock <= p.threshold).length} références demandent votre attention.`} date="Actualisé aujourd’hui" /><ReportCard title="Performance commerciale" text="Une lecture des ventes validées et du panier moyen." date="Mois de juin 2024" /><ReportCard title="Rapport d’activité" text="L’historique des actions importantes de l’espace KORA." date="Dernières 30 jours" /></div>; }
function ReportCard({ title, text, date }: { title: string; text: string; date: string }) { return <section data-testid={`card-report-${title}`} className="card-surface rounded-2xl p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><FileBarChart size={19} /></span><h2 className="mt-5 font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{text}</p><div className="mt-5 flex items-center justify-between border-t pt-4"><span className="text-[10px] text-[hsl(var(--muted-foreground))]">{date}</span><button data-testid={`button-open-report-${title}`} onClick={() => window.print()} className="text-xs font-bold text-[hsl(var(--primary))]">Consulter <ChevronRight className="inline" size={14} /></button></div></section>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) { useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]); return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--foreground)/.35)] p-4 backdrop-blur-sm"><div className="card-surface max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl p-6 fade-up"><div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-bold">{title}</h2><button data-testid="button-close-modal" onClick={onClose} className="rounded-lg p-2 hover:bg-[hsl(var(--muted))]"><X size={18} /></button></div>{children}</div></div>; }
function EmptyState({ title, text, action }: { title: string; text: string; action: () => void }) { return <div className="card-surface flex flex-col items-center justify-center rounded-2xl px-6 py-20 text-center"><span className="rounded-2xl bg-[hsl(var(--muted))] p-4 text-[hsl(var(--muted-foreground))]"><FolderKanban size={24} /></span><h2 className="mt-5 text-lg font-bold">{title}</h2><p className="mt-2 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">{text}</p><button data-testid="button-empty-action" onClick={action} className="mt-6 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]">Revenir au cockpit</button></div>; }

function InteractiveModulesPage({ data, mutate, notify }: { data: StoreData; mutate: (fn: (d: StoreData) => void, msg?: string) => void; notify: (message: string) => void }) {
  const [selectedId, setSelectedId] = useState<ModuleId | null>(null);
  const [editingModule, setEditingModule] = useState<(typeof modules)[number] | null>(null);
  const [deletingModule, setDeletingModule] = useState<(typeof modules)[number] | null>(null);
  const [moduleForm, setModuleForm] = useState({ name: '', description: '', features: '' });
  const [testMode, setTestMode] = useState(false);
  const [tests, setTests] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Toutes');
  const [statusFilter, setStatusFilter] = useState<'TOUTES' | 'ACTIFS' | 'INACTIFS'>('TOUTES');
  const moduleDefinitions = modules.filter(module => !data.removedModules?.includes(module.id)).map(module => ({ ...module, ...(data.moduleOverrides?.[module.id] ?? {}) }));
  const statusOf = (moduleId: ModuleId): ModuleAvailability => data.removedModules?.includes(moduleId) ? 'INACTIF' : data.moduleStatuses?.[moduleId] ?? modules.find(module => module.id === moduleId)?.status ?? 'INACTIF';
  const selected = selectedId ? moduleDefinitions.find(module => module.id === selectedId) ?? null : null;
  const categories = ['Toutes', 'Commerce', 'Finance', 'Ressources humaines', 'Opérations'];
  const categoryOf = (moduleId: ModuleId) => {
    if (['commerce', 'ventes', 'achats', 'crm', 'fournisseurs', 'logistique'].includes(moduleId)) return 'Commerce';
    if (['finance', 'comptabilite', 'rapports'].includes(moduleId)) return 'Finance';
    if (['rh', 'presences', 'paie'].includes(moduleId)) return 'Ressources humaines';
    return 'Opérations';
  };
  const visibleModules = moduleDefinitions.filter(module => {
    const matchesQuery = `${module.name} ${module.description} ${module.features.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesCategory = category === 'Toutes' || categoryOf(module.id) === category;
    const isActive = statusOf(module.id) !== 'INACTIF';
    const matchesStatus = statusFilter === 'TOUTES' || (statusFilter === 'ACTIFS' ? isActive : !isActive);
    return matchesQuery && matchesCategory && matchesStatus;
  });
  const activeCount = moduleDefinitions.filter(module => statusOf(module.id) !== 'INACTIF').length;
  const betaCount = moduleDefinitions.filter(module => statusOf(module.id) === 'BETA').length;

  const openEdit = (module: (typeof modules)[number]) => {
    setEditingModule(module);
    setModuleForm({ name: module.name, description: module.description, features: module.features.join('\n') });
  };

  const saveModule = () => {
    if (!editingModule || !moduleForm.name.trim() || !moduleForm.description.trim()) return;
    const features = moduleForm.features.split(/[\n,]/).map(feature => feature.trim()).filter(Boolean);
    if (features.length === 0) return;
    mutate(draft => {
      draft.moduleOverrides = { ...(draft.moduleOverrides ?? {}), [editingModule.id]: { name: moduleForm.name.trim(), description: moduleForm.description.trim(), features } };
    }, `${moduleForm.name.trim()} a été modifié.`);
    setEditingModule(null);
  };

  const removeModule = (module: (typeof modules)[number]) => {
    mutate(draft => {
      draft.moduleStatuses = { ...(draft.moduleStatuses ?? {}), [module.id]: 'INACTIF' };
      draft.removedModules = [...new Set([...(draft.removedModules ?? []), module.id])];
      draft.companies.forEach(company => {
        company.allowedModules = company.allowedModules.filter(id => id !== module.id);
      });
      draft.sectorPresets = (draft.sectorPresets ?? []).map(preset => ({ ...preset, moduleIds: preset.moduleIds.filter(id => id !== module.id) }));
      draft.orgNodes = draft.orgNodes.map(node => ({ ...node, moduleIds: node.moduleIds?.filter(id => id !== module.id) }));
    }, `${module.name} a été supprimé et désactivé.`);
    if (selectedId === module.id) setSelectedId(null);
    setDeletingModule(null);
  };

  const toggleModule = (moduleId: ModuleId) => {
    const module = moduleDefinitions.find(item => item.id === moduleId);
    if (!module) return;
    const isActive = statusOf(moduleId) !== 'INACTIF';
    mutate(draft => {
      draft.moduleStatuses = { ...(draft.moduleStatuses ?? {}), [moduleId]: isActive ? 'INACTIF' : 'ACTIF' };
      if (isActive) draft.companies.forEach(company => { company.allowedModules = company.allowedModules.filter(id => id !== moduleId); });
    }, isActive ? `${module.name} a été désactivé pour tous les espaces.` : `${module.name} est maintenant actif.`);
  };

  const runFeatureTest = (moduleId: ModuleId, feature: string) => {
    const key = `${moduleId}:${feature}`;
    setTests(previous => ({ ...previous, [key]: true }));
    notify(`Test réussi : ${feature}.`);
  };

  if (selected && testMode) {
    return <ModuleTestWorkbench module={selected} data={data} mutate={mutate} onBack={() => setTestMode(false)} />;
  }

  if (selected) {
    const status = statusOf(selected.id);
    const isActive = status !== 'INACTIF';
    return <div className="space-y-5">
      <button data-testid="button-back-modules" onClick={() => setSelectedId(null)} className="text-xs font-bold text-[hsl(var(--primary))]">← Retour au catalogue</button>
      <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <section className="card-surface rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><LayoutGrid size={21} /></span>
            <StatusBadge status={status} />
          </div>
           <div className="mt-6 flex flex-wrap items-start justify-between gap-3"><h2 className="text-2xl font-bold">{selected.name}</h2><div className="flex gap-1"><button data-testid={`button-edit-module-${selected.id}`} title="Modifier le module" onClick={() => openEdit(selected)} className="rounded-lg border p-2 hover:bg-[hsl(var(--muted))]"><Edit3 size={15} /></button><button data-testid={`button-delete-module-${selected.id}`} title="Supprimer le module" onClick={() => setDeletingModule(selected)} className="rounded-lg border p-2 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--muted))]"><Trash2 size={15} /></button></div></div>
          <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{selected.description}</p>
          <div className="mt-6 space-y-3 border-t pt-5 text-sm">
            <div className="flex items-center justify-between"><span className="text-[hsl(var(--muted-foreground))]">Fonctionnalités</span><strong>{selected.features.length}</strong></div>
          </div>
          <div className="mt-7 flex flex-wrap gap-2">
            <button data-testid={`button-detail-toggle-module-${selected.id}`} onClick={() => toggleModule(selected.id)} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold ${isActive ? 'border border-[hsl(var(--destructive)/.35)] text-[hsl(var(--destructive))]' : 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'}`}>
              {isActive ? 'Désactiver le module' : 'Activer le module'} <ChevronRight size={14} />
            </button>
            <button data-testid={`button-open-live-test-${selected.id}`} onClick={() => setTestMode(true)} className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--primary)/.35)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary))]">
              Ouvrir l’espace de test <ChevronRight size={14} />
            </button>
          </div>
        </section>
        <section className="card-surface rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div><p className="mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">Banc de test</p><h2 className="mt-2 text-xl font-bold">Tester les fonctionnalités</h2><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Lancez chaque scénario depuis l’administration avant de l’autoriser pour un espace.</p></div>
            <Check size={19} className="text-[hsl(var(--primary))]" />
          </div>
          <div className="mt-6 space-y-3">{selected.features.map(feature => {
            const tested = tests[`${selected.id}:${feature}`];
            return <div data-testid={`row-feature-${selected.id}-${feature.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} key={feature} className="flex items-center justify-between gap-4 rounded-xl border p-4">
              <div className="flex items-center gap-3"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tested ? 'bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>{tested ? <Check size={15} /> : <LayoutGrid size={15} />}</span><span className="text-sm font-semibold">{feature}</span></div>
              <button data-testid={`button-test-feature-${selected.id}-${feature.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} onClick={() => runFeatureTest(selected.id, feature)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${tested ? 'border border-[hsl(var(--primary)/.3)] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'}`}>{tested ? 'Test réussi' : 'Tester'}</button>
            </div>;
          })}</div>
        </section>
     </div>
     {editingModule && <Modal title="Modifier le module" onClose={() => setEditingModule(null)}><div className="space-y-4"><Field label="Nom du module" value={moduleForm.name} onChange={value => setModuleForm(current => ({ ...current, name: value }))} testId="input-module-name" /><Field label="Description" value={moduleForm.description} onChange={value => setModuleForm(current => ({ ...current, description: value }))} testId="input-module-description" /><label className="block text-sm font-semibold">Fonctionnalités<textarea data-testid="input-module-features" value={moduleForm.features} onChange={event => setModuleForm(current => ({ ...current, features: event.target.value }))} placeholder="Une fonctionnalité par ligne" rows={5} className="mt-2 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3.5 py-3 text-sm font-normal focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.14)]" /></label><p className="rounded-lg bg-[hsl(var(--muted))] p-3 text-xs text-[hsl(var(--muted-foreground))]">Les fonctionnalités peuvent être séparées par des lignes ou des virgules.</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingModule(null)} className="rounded-lg border px-4 py-2.5 text-xs font-bold">Annuler</button><ActionButton primary testId="button-save-module" onClick={saveModule}>Enregistrer les modifications</ActionButton></div></div></Modal>}
    </div>;
  }

  return <div className="space-y-5">
    <section className="card-surface rounded-2xl p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div>
          <p className="mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">Catalogue d’applications</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-.03em]">Vos applications métier</h2>
          <p className="mt-2 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">Chaque module est une application indépendante. Activez uniquement celles dont vos espaces ont besoin.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <div className="rounded-xl bg-[hsl(var(--muted)/.65)] px-4 py-3"><p className="mono text-[10px] uppercase text-[hsl(var(--muted-foreground))]">Actives</p><p className="mt-1 text-xl font-bold">{activeCount}<span className="ml-1 text-xs font-normal text-[hsl(var(--muted-foreground))]">/ {modules.length}</span></p></div>
          <div className="rounded-xl bg-[hsl(var(--muted)/.65)] px-4 py-3"><p className="mono text-[10px] uppercase text-[hsl(var(--muted-foreground))]">Bêta</p><p className="mt-1 text-xl font-bold">{betaCount}</p></div>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3 border-t pt-5 xl:flex-row xl:items-center">
        <label className="relative block flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={16} />
          <input data-testid="input-search-modules" value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher une application..." className="w-full rounded-xl border bg-transparent py-3 pl-10 pr-3 text-sm outline-none focus:border-[hsl(var(--primary))]" />
        </label>
        <div className="flex shrink-0 rounded-xl bg-[hsl(var(--muted)/.65)] p-1">
          {(['TOUTES', 'ACTIFS', 'INACTIFS'] as const).map(filter => <button type="button" data-testid={`button-filter-modules-${filter.toLowerCase()}`} key={filter} onClick={() => setStatusFilter(filter)} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${statusFilter === filter ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm' : 'text-[hsl(var(--muted-foreground))]'}`}>{filter === 'TOUTES' ? 'Toutes' : filter === 'ACTIFS' ? 'Actives' : 'Inactives'}</button>)}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {categories.map(item => <button type="button" data-testid={`button-category-modules-${item.toLowerCase().replace(/\s+/g, '-')}`} key={item} onClick={() => setCategory(item)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${category === item ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary)/.5)]'}`}>{item}</button>)}
      </div>
    </section>
    <div className="flex items-center justify-between gap-3 px-1">
      <p className="text-sm font-semibold">{visibleModules.length} application{visibleModules.length > 1 ? 's' : ''} affichée{visibleModules.length > 1 ? 's' : ''}</p>
      <p className="text-xs text-[hsl(var(--muted-foreground))]">Cliquez sur une application pour voir ses détails et la tester.</p>
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {visibleModules.map((module, index) => {
        const status = statusOf(module.id);
        const isActive = status !== 'INACTIF';
        const ModuleIcon: Icon = categoryOf(module.id) === 'Commerce' ? ShoppingCart : categoryOf(module.id) === 'Finance' ? WalletCards : categoryOf(module.id) === 'Ressources humaines' ? Users : Boxes;
         return <article data-testid={`card-module-${module.id}`} key={module.id} className={`card-surface group relative flex min-h-[180px] flex-col rounded-2xl p-4 text-center transition hover:-translate-y-1 hover:border-[hsl(var(--primary)/.45)] hover:shadow-lg fade-up fade-up-delay-${Math.min(index + 1, 3)} ${isActive ? '' : 'opacity-65'}`}>
           <button type="button" data-testid={`button-open-module-${module.id}`} onClick={() => setSelectedId(module.id)} aria-label={`Ouvrir l’application ${module.name}`} className="flex flex-1 flex-col items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]">
             <span className={`absolute right-3 top-3 h-2 w-2 rounded-full ${isActive ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted-foreground)/.45)]'}`} title={isActive ? 'Application active' : 'Application inactive'} />
             <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))] transition group-hover:scale-105"><ModuleIcon size={25} /></span>
             <span className="mt-4 line-clamp-2 text-sm font-bold leading-5">{module.name}</span>
             <span className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{categoryOf(module.id)}</span>
           </button>
            <div className="mt-3 flex justify-center gap-1 border-t pt-3"><button type="button" data-testid={`button-edit-module-${module.id}`} title="Modifier le module" onClick={() => openEdit(module)} className="rounded-lg p-2 text-xs hover:bg-[hsl(var(--muted))]"><Edit3 size={14} /></button><button type="button" data-testid={`button-delete-module-${module.id}`} title="Supprimer le module" onClick={() => setDeletingModule(module)} className="rounded-lg p-2 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.08)]"><Trash2 size={14} /></button></div>
         </article>;
      })}
      {visibleModules.length === 0 && <div className="card-surface col-span-full rounded-2xl p-10 text-center"><Package className="mx-auto text-[hsl(var(--muted-foreground))]" size={28} /><h2 className="mt-4 font-bold">Aucune application trouvée</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Modifiez votre recherche ou réinitialisez les filtres.</p><button type="button" onClick={() => { setQuery(''); setCategory('Toutes'); setStatusFilter('TOUTES'); }} className="mt-4 text-xs font-bold text-[hsl(var(--primary))]">Réinitialiser les filtres</button></div>}
     </div>
     {deletingModule && <Modal title="Confirmer la suppression" onClose={() => setDeletingModule(null)}><p className="text-sm leading-6 text-[hsl(var(--muted-foreground))]">Voulez-vous vraiment supprimer le module <strong className="text-[hsl(var(--foreground))]">{deletingModule.name}</strong> ? Il sera retiré du catalogue et désactivé pour tous les espaces.</p><div className="mt-6 flex justify-end gap-2"><button type="button" data-testid="button-cancel-delete-module" onClick={() => setDeletingModule(null)} className="rounded-lg border px-4 py-2.5 text-xs font-bold">Annuler</button><button type="button" data-testid="button-confirm-delete-module" onClick={() => removeModule(deletingModule)} className="rounded-lg bg-[hsl(var(--destructive))] px-4 py-2.5 text-xs font-bold text-white">Supprimer le module</button></div></Modal>}
    </div>;
}

function ModuleTestWorkbench({ module, data, mutate, onBack }: { module: (typeof modules)[number]; data: StoreData; mutate: (fn: (d: StoreData) => void, msg?: string) => void; onBack: () => void }) {
  const operationalModules: ModuleId[] = ['achats', 'comptabilite', 'paie', 'crm', 'fournisseurs', 'logistique', 'documents'];
  const koraCompany = data.companies.find(company => company.id === 'kora');
  return <div data-testid="module-workbench" className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button data-testid="button-back-live-test" onClick={onBack} className="text-xs font-bold text-[hsl(var(--primary))]">← Retour au module</button>
      <span className="rounded-full bg-[hsl(var(--accent)/.2)] px-3 py-1.5 text-[10px] font-bold text-[hsl(var(--foreground))]">MODE TEST ADMINISTRATION</span>
    </div>
    <section className="card-surface rounded-2xl border border-[hsl(var(--primary)/.25)] p-5">
      <p className="mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">Espace de test</p>
      <h1 className="mt-2 text-2xl font-bold">{module.name}</h1>
      <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Les actions effectuées ici utilisent les mêmes écrans et données que l’espace entreprise. Elles servent à valider le module avant son activation.</p>
    </section>
     {module.id === 'stocks' && <StockModulePage companyId="kora" />}
    {(module.id === 'commerce' || module.id === 'ventes') && <CommercePage data={data} mutate={mutate} />}
    {module.id === 'finance' && <FinancePage data={data} mutate={mutate} />}
    {module.id === 'rh' && koraCompany && <CompanyOrganizationAdmin company={koraCompany} data={data} mutate={mutate} />}
    {module.id === 'presences' && <PresencesPage data={data} />}
    {operationalModules.includes(module.id) && <OperationalModulePage moduleId={module.id} data={data} mutate={mutate} />}
    {module.id === 'rapports' && <OperationalReportsPage data={data} />}
  </div>;
}

function OperationalReportsPage({ data }: { data: StoreData }) {
  type ReportId = 'sales' | 'stock' | 'finance' | 'activity';
  const [report, setReport] = useState<ReportId>('sales');
  const [query, setQuery] = useState('');
  const definitions: Record<ReportId, { label: string; description: string; headers: string[]; rows: string[][] }> = {
    sales: { label: 'Ventes', description: 'Chiffre d’affaires et commandes clients.', headers: ['Référence', 'Client', 'Montant', 'Statut', 'Date'], rows: data.sales.map(item => [item.reference, item.client, money(item.amount), item.status, item.date]) },
    stock: { label: 'Gestion de stock', description: 'Valorisation et niveaux des produits.', headers: ['Produit', 'SKU', 'Catégorie', 'Stock', 'Valeur'], rows: data.products.map(item => [item.name, item.sku, item.category, String(item.stock), money(item.stock * item.price)]) },
    finance: { label: 'Finance', description: 'Paiements et encaissements enregistrés.', headers: ['Référence', 'Facture', 'Montant', 'Statut', 'Date'], rows: data.payments.map(item => [item.reference, item.invoice, money(item.amount), item.status, item.date]) },
    activity: { label: 'Activité', description: 'Traçabilité des actions réalisées.', headers: ['Utilisateur', 'Action', 'Module', 'Objet', 'Date'], rows: data.activities.map(item => [item.user, item.action, item.module, item.object, item.date]) },
  };
  const active = definitions[report];
  const rows = active.rows.filter(row => row.join(' ').toLowerCase().includes(query.toLowerCase()));
  const exportCsv = () => {
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = [active.headers, ...rows].map(row => row.map(escape).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport-${report}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{(Object.entries(definitions) as [ReportId, typeof active][]).map(([id, item]) => <button key={id} onClick={() => setReport(id)} className={`card-surface rounded-2xl p-5 text-left transition ${report === id ? 'ring-2 ring-[hsl(var(--primary))]' : 'hover:-translate-y-0.5'}`}><FileBarChart size={18} className="text-[hsl(var(--primary))]" /><p className="mt-4 font-bold">{item.label}</p><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{item.description}</p></button>)}</div>
    <section className="card-surface overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-bold">Rapport {active.label}</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{rows.length} lignes calculées depuis les données de l’entreprise.</p></div><div className="flex gap-2"><button onClick={() => window.print()} className="rounded-lg border px-4 py-2.5 text-xs font-bold">Imprimer</button><button onClick={exportCsv} className="rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]">Exporter CSV</button></div></div>
      <div className="p-5"><label className="relative block max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filtrer le rapport..." className="w-full rounded-lg border bg-transparent py-2.5 pl-9 pr-3 text-sm" /></label></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-[hsl(var(--muted)/.55)] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]"><tr>{active.headers.map(header => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead><tbody className="divide-y">{rows.map((row, index) => <tr key={`${report}-${index}`} className="hover:bg-[hsl(var(--muted)/.35)]">{row.map((cell, cellIndex) => <td key={`${cellIndex}-${cell}`} className="px-4 py-3">{cell}</td>)}</tr>)}{rows.length === 0 && <tr><td colSpan={active.headers.length} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">Aucune donnée pour ce filtre.</td></tr>}</tbody></table></div>
    </section>
  </div>;
}

function HumanResourcesWorkspace({ data, mutate, companyAdmin, employee, companyId }: { data: StoreData; mutate: (fn: (d: StoreData) => void, msg?: string) => void; companyAdmin: boolean; employee: StoreData['employees'][number] | null; companyId: string }) {
  const company = data.companies.find(item => item.id === companyId);
  if (companyAdmin && company) return <CompanyOrganizationAdmin company={company} data={data} mutate={mutate} />;
  return <RHPage data={data} />;
}

function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><AppContent /></WouterRouter></TooltipProvider></QueryClientProvider>; }

function AdminCreateCompanyPage({ data, mutate, onComplete, onCancel }: { data: StoreData; mutate: (fn: (d: StoreData) => void, msg?: string) => void; onComplete: () => void; onCancel: () => void }) {
  const fallbackPreset: SectorPreset = { id: 'default', name: 'Distribution', moduleIds: ['finance', 'commerce', 'stocks'] };
  const initialPreset = data.sectorPresets[0] ?? fallbackPreset;
  const [name, setName] = useState('');
  const [manager, setManager] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [sector, setSector] = useState(initialPreset.name);
  const [orgName, setOrgName] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [orgType, setOrgType] = useState<OrgNode['type']>('direction');
  const [selectedModules, setSelectedModules] = useState<ModuleId[]>([...initialPreset.moduleIds]);
  const [error, setError] = useState('');
  const changeSector = (nextSector: string) => {
    const preset = data.sectorPresets.find(item => item.name === nextSector);
    setSector(nextSector);
    setSelectedModules(preset ? [...preset.moduleIds] : []);
    setError('');
  };

  const toggle = (id: ModuleId) => {
    setSelectedModules(previous => previous.includes(id) ? previous.filter(moduleId => moduleId !== id) : [...previous, id]);
    setError('');
  };
  const save = () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!name.trim() || !manager.trim() || !normalizedEmail || password.length < 8 || password !== passwordConfirm || !orgName.trim() || !orgCode.trim()) {
      setError('Complétez l’entreprise, sa première unité organisationnelle et vérifiez le mot de passe.');
      return;
    }
    if (selectedModules.length === 0) {
      setError('Sélectionnez au moins un module.');
      return;
    }
    if (loadData().companies.some(company => company.email.toLowerCase() === normalizedEmail)) {
      setError('Une entreprise utilise déjà cette adresse email.');
      return;
    }
    mutate(draft => {
      const companyId = uid('company');
      draft.companies.push({ id: companyId, name: name.trim(), manager: manager.trim(), email: normalizedEmail, adminPassword: password, phone: '', country: 'Sénégal', sector, status: 'ACTIF', requestedModules: [...selectedModules], allowedModules: [...selectedModules], refusedModules: [], createdAt: new Date().toISOString().slice(0, 10) });
      draft.orgNodes.push({ id: uid('org'), companyId, name: orgName.trim(), code: orgCode.trim().toUpperCase(), type: orgType, parentId: null, moduleIds: [] });
    }, 'Entreprise créée et activée.');
    onComplete();
  };

  return <div className="mx-auto max-w-3xl">
    <section className="card-surface rounded-2xl p-6 sm:p-8">
      <div className="mb-8"><p className="mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">Création administrative</p><h2 className="mt-3 text-2xl font-bold">Nouvelle entreprise</h2><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Cette entreprise sera active immédiatement et ne passera pas par les demandes en attente.</p></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nom de l’entreprise" value={name} onChange={setName} placeholder="Ex. Teranga Agro" testId="input-admin-company-name" />
        <Field label="Responsable" value={manager} onChange={setManager} placeholder="Prénom Nom" testId="input-admin-company-manager" />
        <Field label="Email administrateur" value={email} onChange={setEmail} type="email" placeholder="admin@entreprise.com" testId="input-admin-company-email" />
         <label className="block text-sm font-semibold">Secteur<select data-testid="select-admin-company-sector" value={sector} onChange={event => changeSector(event.target.value)} className="mt-2 w-full rounded-lg border bg-transparent px-3 py-3 text-sm font-normal">{data.sectorPresets.map(preset => <option key={preset.id} value={preset.name}>{preset.name}</option>)}</select></label>
        <Field label="Mot de passe administrateur" value={password} onChange={setPassword} type="password" placeholder="Au moins 8 caractères" testId="input-admin-company-password" />
        <Field label="Confirmer le mot de passe" value={passwordConfirm} onChange={setPasswordConfirm} type="password" placeholder="Répétez le mot de passe" testId="input-admin-company-password-confirm" />
      </div>
       <div className="mt-8 border-t pt-6"><h3 className="font-bold">Organisation obligatoire</h3><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Créez la première unité de l’entreprise. La hiérarchie pourra ensuite être étendue librement.</p><div className="mt-4 grid gap-5 sm:grid-cols-3"><Field label="Nom de l’unité *" value={orgName} onChange={setOrgName} placeholder="Ex. Direction générale" testId="input-admin-org-name" /><Field label="Code *" value={orgCode} onChange={setOrgCode} placeholder="Ex. DG-01" testId="input-admin-org-code" /><label className="block text-sm font-semibold">Type<select data-testid="select-admin-org-type" value={orgType} onChange={event => setOrgType(event.target.value as OrgNode['type'])} className="mt-2 w-full rounded-lg border bg-transparent px-3 py-3 text-sm font-normal"><option value="direction">Direction</option><option value="department">Département</option><option value="sector">Secteur</option><option value="service">Service</option></select></label></div></div>
       <div className="mt-8 border-t pt-6"><h3 className="font-bold">Modules autorisés</h3><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Ces modules seront accessibles dès la première connexion.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{modules.map(module => <button type="button" data-testid={`button-admin-module-${module.id}`} key={module.id} onClick={() => toggle(module.id)} className={`flex items-start gap-3 rounded-xl border p-4 text-left ${selectedModules.includes(module.id) ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.06)]' : 'border-[hsl(var(--border))]'}`}><span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border ${selectedModules.includes(module.id) ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border-[hsl(var(--border))]'}`}>{selectedModules.includes(module.id) && <Check size={13} />}</span><span><strong className="block text-sm">{module.name}</strong><span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">{module.description}</span></span></button>)}</div></div>
      {error && <p data-testid="admin-create-error" className="mt-5 rounded-lg bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-xs font-semibold text-[hsl(var(--destructive))]">{error}</p>}
       <div className="mt-8 flex justify-end gap-3"><button data-testid="button-cancel-admin-company" onClick={onCancel} className="rounded-lg border px-5 py-3 text-sm font-bold">Annuler</button><button data-testid="button-save-admin-company" onClick={save} className="btn rounded-lg bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">Créer l’entreprise</button></div>
    </section>
  </div>;
}

function CompanyModulesDetail({ company, data, mutate, onBack }: { company: Company; data: StoreData; mutate: (fn: (d: StoreData) => void, msg?: string) => void; onBack: () => void }) {
  const [active, setActive] = useState<ModuleId[]>(company.allowedModules);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setActive(company.allowedModules);
  }, [company.id, company.allowedModules.join('|')]);

  const toggle = (id: ModuleId) => {
    setActive(previous => previous.includes(id) ? previous.filter(moduleId => moduleId !== id) : [...previous, id]);
  };

  const save = () => {
    mutate(draft => {
      const target = draft.companies.find(item => item.id === company.id);
      if (target) {
        target.allowedModules = [...active];
        target.refusedModules = target.requestedModules.filter(moduleId => !active.includes(moduleId));
      }
    }, 'Configuration enregistrée.');
  };

  return <div className="space-y-5">
    <button data-testid="button-back-companies" onClick={onBack} className="text-xs font-bold text-[hsl(var(--primary))]">← Retour aux entreprises</button>
    <div className="card-surface rounded-2xl p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div className="flex gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--primary))] text-lg font-black text-[hsl(var(--primary-foreground))]">{company.name.slice(0, 2).toUpperCase()}</span>
          <div>
            <h2 className="text-2xl font-bold">{company.name}</h2>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{company.sector} · {company.country}</p>
            <div className="mt-3"><StatusBadge status={company.status} /></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2"><ActionButton testId="button-edit-company-detail" icon={Edit3} onClick={() => setEditing(true)}>Modifier</ActionButton><ActionButton testId="button-suspend-company" icon={company.status === 'SUSPENDU' ? RefreshCw : ShieldCheck} onClick={() => mutate(draft => {
          const target = draft.companies.find(item => item.id === company.id);
          if (target) target.status = target.status === 'SUSPENDU' ? 'ACTIF' : 'SUSPENDU';
        }, company.status === 'SUSPENDU' ? 'Entreprise réactivée.' : 'Entreprise suspendue.')}>{company.status === 'SUSPENDU' ? 'Réactiver' : 'Suspendre'}</ActionButton></div>
      </div>
      <div className="mt-8 grid gap-4 border-t pt-5 text-sm sm:grid-cols-3">
        <div><p className="text-xs text-[hsl(var(--muted-foreground))]">Responsable</p><p className="mt-1 font-bold">{company.manager}</p></div>
        <div><p className="text-xs text-[hsl(var(--muted-foreground))]">Email</p><p className="mt-1 font-bold">{company.email}</p></div>
        <div><p className="text-xs text-[hsl(var(--muted-foreground))]">Modules actifs</p><p className="mt-1 font-bold">{active.length} / {modules.length}</p></div>
      </div>
    </div>
    <section className="card-surface rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <div><h2 className="font-bold">Modules autorisés</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Ajustez le périmètre de l’espace.</p></div>
        <span className="mono text-xs text-[hsl(var(--muted-foreground))]">{active.length} / {modules.length}</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {modules.map(module => {
          const isAllowed = active.includes(module.id);
          return <button data-testid={`button-toggle-company-module-${module.id}`} aria-pressed={isAllowed} key={module.id} onClick={() => toggle(module.id)} className={`flex items-center justify-between rounded-xl border p-4 text-left ${isAllowed ? 'border-[hsl(var(--primary)/.4)] bg-[hsl(var(--primary)/.05)]' : 'bg-[hsl(var(--muted)/.4)] opacity-65'}`}>
            <div className="flex items-center gap-3"><span className="rounded-lg bg-[hsl(var(--muted))] p-2"><LayoutGrid size={16} /></span><div><strong className="text-sm">{module.name}</strong><p className="text-[11px] text-[hsl(var(--muted-foreground))]">{module.description}</p></div></div>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${isAllowed ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white' : ''}`}>{isAllowed && <Check size={13} />}</span>
          </button>;
        })}
      </div>
      <div className="mt-6 flex justify-end"><ActionButton primary testId="button-save-company-modules" onClick={save}>Enregistrer la configuration</ActionButton></div>
    </section>
    {editing && <CompanyEditModal company={company} data={data} mutate={mutate} onClose={() => setEditing(false)} />}
  </div>;
}
export default App;