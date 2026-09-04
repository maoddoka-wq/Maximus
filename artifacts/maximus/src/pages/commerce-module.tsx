import { useEffect, useMemo, useState, type ComponentType, type FormEvent, type ReactNode } from 'react';
import {
  Archive,
  ArrowDownToLine,
  ArrowUpRight,
  BarChart3,
  Bell,
  Boxes,
  BriefcaseBusiness,
  Building2,
  Calculator,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  FileBarChart,
  FileCheck2,
  FileDown,
  FileText,
  History,
  LayoutDashboard,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShoppingCart,
  Store,
  Tags,
  Trash2,
  UserRound,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import type { Sale, Status, StoreData } from '@/lib/store';
import { addNotification, getVisibleNotifications, money, shortMoney, uid } from '@/lib/store';
import { useQueryTab } from '@/lib/query-tab';
import { useAppDialog } from '@/components/confirm-dialog';

type Icon = ComponentType<{ size?: number; className?: string }>;
type Tab = (typeof tabs)[number]['id'];

const tabs = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, group: '' },
  { id: 'sales', label: 'Ventes & caisse', icon: ShoppingCart, group: 'Commerce' },
  { id: 'products', label: 'Produits & stock', icon: Boxes, group: 'Commerce' },
  { id: 'clients', label: 'Clients', icon: Users, group: 'Commerce' },
  { id: 'suppliers', label: 'Fournisseurs', icon: Store, group: 'Commerce' },
  { id: 'purchases', label: 'Achats', icon: Package, group: 'Finance' },
  { id: 'expenses', label: 'Dépenses', icon: ArrowDownToLine, group: 'Finance' },
  { id: 'cash', label: 'Comptes de caisse', icon: WalletCards, group: 'Finance' },
  { id: 'credit', label: 'Crédit clients', icon: CreditCard, group: 'Finance' },
  { id: 'invoices', label: 'Factures & reçus', icon: FileCheck2, group: 'Finance' },
  { id: 'returns', label: 'Retours & avoirs', icon: ArrowUpRight, group: 'Finance' },
  { id: 'reports', label: 'Rapports', icon: FileBarChart, group: 'Pilotage' },
  { id: 'activity', label: 'Journal d’activité', icon: History, group: 'Pilotage' },
  { id: 'team', label: 'Équipe & droits', icon: Users, group: 'Pilotage' },
  { id: 'settings', label: 'Paramètres', icon: Settings, group: 'Pilotage' },
] as const;

const featureTabAliases: Record<string, Tab> = {
  clients: 'clients',
  'devis-et-commandes': 'sales',
  'chiffre-d-affaires': 'dashboard',
  devis: 'sales',
  commandes: 'sales',
  facturation: 'invoices',
};

type CommerceClient = { id: string; name: string; phone: string; email: string; address: string; balance: number };
type Expense = { id: string; label: string; category: string; amount: number; date: string; account: string };
type CashAccount = { id: string; name: string; balance: number; responsible: string; active: boolean };
type Credit = { id: string; client: string; reference: string; amount: number; paid: number; dueDate: string; status: 'EN COURS' | 'RÉGLÉ' };
type ReturnRecord = { id: string; reference: string; type: 'RETOUR CLIENT' | 'AVOIR FOURNISSEUR'; partner: string; amount: number; date: string; status: Status; productId?: string; quantity?: number };
type CommerceSaleLine = { productId: string; quantity: string };
type CommerceSettings = { taxRate: string; defaultCash: string; receiptFooter: string; lowStockAlerts: boolean };
type CommerceState = {
  clients: CommerceClient[];
  expenses: Expense[];
  cashAccounts: CashAccount[];
  credits: Credit[];
  returns: ReturnRecord[];
  settings: CommerceSettings;
};

const initialState: CommerceState = {
  clients: [
    { id: 'client-1', name: 'Boutique Keur Gui', phone: '+221 77 401 21 10', email: 'contact@keur-gui.sn', address: 'Dakar', balance: 0 },
    { id: 'client-2', name: 'Maison Baobab', phone: '+221 76 304 18 55', email: 'achats@baobab.sn', address: 'Thiès', balance: 42000 },
    { id: 'client-3', name: 'Marché Tilène', phone: '+221 78 224 06 32', email: 'tilene@client.sn', address: 'Dakar', balance: 0 },
  ],
  expenses: [
    { id: 'expense-1', label: 'Transport livraison Dakar', category: 'Logistique', amount: 18500, date: '18 juin 2024', account: 'Caisse principale' },
    { id: 'expense-2', label: 'Fournitures de bureau', category: 'Fonctionnement', amount: 12500, date: '17 juin 2024', account: 'Caisse principale' },
  ],
  cashAccounts: [
    { id: 'cash-1', name: 'Caisse principale', balance: 1248500, responsible: 'Aminata Diop', active: true },
    { id: 'cash-2', name: 'Compte bancaire UBA', balance: 3840000, responsible: 'Mamadou Ba', active: true },
    { id: 'cash-3', name: 'Caisse boutique Dakar', balance: 462000, responsible: 'Ibrahima Kane', active: true },
  ],
  credits: [
    { id: 'credit-1', client: 'Maison Baobab', reference: 'CRD-2406-002', amount: 145000, paid: 103000, dueDate: '30 juin 2024', status: 'EN COURS' },
    { id: 'credit-2', client: 'Marché Tilène', reference: 'CRD-2406-001', amount: 94000, paid: 94000, dueDate: '15 juin 2024', status: 'RÉGLÉ' },
  ],
  returns: [
    { id: 'return-1', reference: 'AVR-2406-003', type: 'RETOUR CLIENT', partner: 'Maison Baobab', amount: 18000, date: '17 juin 2024', status: 'CONFIRMÉ' },
  ],
  settings: { taxRate: '18', defaultCash: 'Caisse principale', receiptFooter: 'Merci pour votre confiance.', lowStockAlerts: true },
};

const readState = (companyId: string): CommerceState => {
  try {
    const stored = localStorage.getItem(`maximus-commerce-${companyId}`);
    if (!stored) return structuredClone(initialState);
    const parsed = JSON.parse(stored) as Partial<CommerceState>;
    return {
      clients: parsed.clients ?? initialState.clients,
      expenses: parsed.expenses ?? initialState.expenses,
      cashAccounts: parsed.cashAccounts ?? initialState.cashAccounts,
      credits: parsed.credits ?? initialState.credits,
      returns: parsed.returns ?? initialState.returns,
      settings: { ...initialState.settings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return structuredClone(initialState);
  }
};

const tabUrl = (id: Tab) => {
  const url = new URL(window.location.href);
  url.searchParams.set('tab', id);
  window.history.pushState({}, '', `${url.pathname}?${url.searchParams.toString()}`);
  window.dispatchEvent(new Event('pushState'));
};

export default function CommerceModulePage({
  companyId,
  data,
  mutate,
  canCreate = true,
  canModify = true,
  initialTab = 'dashboard',
  allowedTabs,
  singleModuleNavigation = false,
  onNavigate,
}: {
  companyId: string;
  data: StoreData;
  mutate: (fn: (draft: StoreData) => void, message?: string) => void;
  canCreate?: boolean;
  canModify?: boolean;
  initialTab?: Tab;
  allowedTabs?: readonly Tab[];
  singleModuleNavigation?: boolean;
  onNavigate?: (path: string) => void;
}) {
  const [state, setState] = useState<CommerceState>(() => readState(companyId));
  const availableTabIds = allowedTabs?.length ? tabs.filter(item => allowedTabs.includes(item.id)).map(item => item.id) : tabs.map(item => item.id);
  const defaultTab = availableTabIds.includes(initialTab) ? initialTab : (availableTabIds[0] ?? 'dashboard');
  const [tab, setTab] = useQueryTab({ tabs: availableTabIds, defaultTab, aliases: featureTabAliases });
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    localStorage.setItem(`maximus-commerce-${companyId}`, JSON.stringify(state));
  }, [companyId, state]);
  useEffect(() => {
    setState(readState(companyId));
  }, [companyId]);
  useEffect(() => {
    const sync = () => setState(readState(companyId));
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [companyId]);
  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const navigateTab = (next: Tab) => {
    setTab(next);
    tabUrl(next);
    setQuery('');
  };
  const updateState = (fn: (draft: CommerceState) => void, message?: string) => {
    setState(previous => {
      const next = structuredClone(previous) as CommerceState;
      fn(next);
      return next;
    });
    if (message) setToast(message);
  };
  const validatedSales = data.sales.filter(sale => sale.status === 'VALIDÉ');
  const revenue = validatedSales.reduce((sum, sale) => sum + sale.amount, 0);
  const lowStock = data.products.filter(product => product.stock <= product.threshold);
  const unread = getVisibleNotifications(data.notifications, { isAdmin: false, companyId }).filter(notification => !notification.read).length;
  const visibleTabs = tabs.filter(item => availableTabIds.includes(item.id));

  return <div className="space-y-5" data-testid="commerce-module">
    {toast && <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-xl bg-[hsl(var(--foreground))] px-4 py-3 text-sm font-bold text-[hsl(var(--background))] shadow-xl"><Check size={16} className="text-[hsl(var(--accent))]" />{toast}</div>}
    <section className="card-surface rounded-2xl border border-[hsl(var(--primary)/.18)] p-5 sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">Application commerciale</p>
          <h1 className="mt-2 text-2xl font-bold tracking-[-.04em]">Gestion commerciale</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Ventes, stock, trésorerie et pilotage réunis dans un seul espace opérationnel.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-[hsl(var(--muted)/.55)] p-1.5 text-center">
          <div className="rounded-lg bg-[hsl(var(--background))] px-3 py-2"><p className="mono text-[9px] uppercase text-[hsl(var(--muted-foreground))]">CA validé</p><strong className="mt-1 block text-sm">{shortMoney(revenue)}</strong></div>
          <div className="rounded-lg px-3 py-2"><p className="mono text-[9px] uppercase text-[hsl(var(--muted-foreground))]">À recevoir</p><strong className="mt-1 block text-sm">{shortMoney(state.credits.filter(item => item.status === 'EN COURS').reduce((sum, item) => sum + item.amount - item.paid, 0))}</strong></div>
          <div className="rounded-lg px-3 py-2"><p className="mono text-[9px] uppercase text-[hsl(var(--muted-foreground))]">Alertes</p><strong className="mt-1 block text-sm">{lowStock.length + unread}</strong></div>
        </div>
      </div>
      {!singleModuleNavigation && <nav aria-label="Menu Gestion commerciale" className="module-tabs mt-6 flex min-w-0 gap-1.5 overflow-x-auto border-t pt-4">
        {visibleTabs.map(item => {
          const ItemIcon = item.icon;
          const isActive = tab === item.id;
          return <button key={item.id} type="button" data-testid={`commerce-tab-${item.id}`} onClick={() => navigateTab(item.id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition ${isActive ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'}`}><ItemIcon size={16} />{item.label}</button>;
        })}
      </nav>}
    </section>
    {tab !== 'dashboard' && <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="relative block max-w-xl flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={16} /><input data-testid="input-commerce-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher dans cet espace..." className="w-full rounded-xl border bg-transparent py-3 pl-10 pr-3 text-sm outline-none focus:border-[hsl(var(--primary))]" /></label><button type="button" onClick={() => setState(readState(companyId))} className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold hover:bg-[hsl(var(--muted))]"><RefreshCw size={14} />Actualiser</button></div>}
    {tab === 'dashboard' && <Dashboard data={data} state={state} lowStock={lowStock} revenue={revenue} onTab={navigateTab} />}
     {tab === 'sales' && <SalesPageFunctional data={data} query={query} mutate={mutate} canCreate={canCreate} canModify={canModify} taxRate={Number(state.settings.taxRate) || 0} companyId={companyId} />}
     {tab === 'products' && <ProductsPageComplete data={data} query={query} mutate={mutate} canCreate={canCreate} canModify={canModify} />}
     {tab === 'clients' && <ClientsPageComplete state={state} query={query} canCreate={canCreate} canModify={canModify} onUpdate={updateState} />}
     {tab === 'suppliers' && <SuppliersPageComplete data={data} query={query} canCreate={canCreate} canModify={canModify} mutate={mutate} />}
     {tab === 'purchases' && <PurchasesPageComplete data={data} query={query} canCreate={canCreate} canModify={canModify} mutate={mutate} />}
     {tab === 'expenses' && <ExpensesPageComplete state={state} query={query} canCreate={canCreate} canModify={canModify} onUpdate={updateState} />}
     {tab === 'cash' && <CashPageComplete state={state} query={query} canCreate={canCreate} canModify={canModify} onUpdate={updateState} />}
     {tab === 'credit' && <CreditPageComplete state={state} query={query} canCreate={canCreate} canModify={canModify} onUpdate={updateState} />}
     {tab === 'invoices' && <InvoicesPageComplete data={data} query={query} onToast={setToast} />}
     {tab === 'returns' && <ReturnsPageComplete data={data} state={state} query={query} canCreate={canCreate} canModify={canModify} mutate={mutate} onUpdate={updateState} />}
    {tab === 'reports' && <ReportsPage data={data} state={state} />}
    {tab === 'activity' && <ActivityPage data={data} query={query} />}
    {tab === 'team' && <TeamPage data={data} query={query} canModify={canModify} onToast={setToast} onNavigate={onNavigate} />}
    {tab === 'settings' && <SettingsPage state={state} canModify={canModify} onUpdate={updateState} />}
  </div>;
}

function Dashboard({ data, state, lowStock, revenue, onTab }: { data: StoreData; state: CommerceState; lowStock: StoreData['products']; revenue: number; onTab: (tab: Tab) => void }) {
  const expenses = state.expenses.reduce((sum, item) => sum + item.amount, 0);
  const stockValue = data.products.reduce((sum, product) => sum + product.stock * product.price, 0);
  const activityCards: { label: string; value: number; icon: Icon }[] = [
    { label: 'Ventes validées', value: data.sales.filter(sale => sale.status === 'VALIDÉ').length, icon: ShoppingCart },
    { label: 'Paiements confirmés', value: data.payments.filter(payment => payment.status === 'CONFIRMÉ').length, icon: Calculator },
    { label: 'Commandes fournisseurs', value: data.purchaseOrders.length, icon: Package },
  ];
  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Chiffre d’affaires" value={money(revenue)} detail="Ventes validées" icon={CircleDollarSign} accent /><Metric label="Bénéfice estimé" value={money(Math.max(0, revenue - expenses))} detail="Après dépenses enregistrées" icon={BarChart3} /><Metric label="Valeur du stock" value={money(stockValue)} detail={`${data.products.length} références actives`} icon={Boxes} /><Metric label="Créances clients" value={money(state.credits.reduce((sum, item) => sum + Math.max(0, item.amount - item.paid), 0))} detail="Reste à encaisser" icon={CreditCard} warning /></div>
    <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <Panel title="Activité commerciale" action={<button type="button" onClick={() => onTab('sales')} className="text-xs font-bold text-[hsl(var(--primary))]">Voir les ventes <ChevronRight className="inline" size={14} /></button>}><div className="grid gap-3 sm:grid-cols-3">{activityCards.map(card => { const CardIcon = card.icon; return <div key={card.label} className="rounded-xl border bg-[hsl(var(--muted)/.25)] p-4"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><CardIcon size={17} /></span><p className="mt-4 text-xs text-[hsl(var(--muted-foreground))]">{card.label}</p><p className="mt-1 text-2xl font-bold">{card.value}</p></div>; })}</div><div className="mt-5 flex h-40 items-end gap-2 rounded-xl bg-[hsl(var(--muted)/.25)] p-4">{[38, 56, 45, 72, 61, 84, 68, 96, 75, 88, 79, 100].map((height, index) => <div key={index} className="flex flex-1 flex-col items-center gap-2"><div className={`w-full rounded-t-md ${index === 11 ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--primary)/.22)]'}`} style={{ height: `${height}%` }} /><span className="mono text-[9px] text-[hsl(var(--muted-foreground))]">{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][index]}</span></div>)}</div></Panel>
      <Panel title="À surveiller" action={<button type="button" onClick={() => onTab('products')} className="text-xs font-bold text-[hsl(var(--primary))]">Produits <ChevronRight className="inline" size={14} /></button>}><div className="space-y-3">{lowStock.length === 0 && <Empty text="Aucune alerte de stock." />}{lowStock.slice(0, 5).map(product => <div key={product.id} className="flex items-start gap-3 rounded-xl border border-[hsl(var(--accent)/.3)] bg-[hsl(var(--accent)/.08)] p-3"><span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--accent)/.22)]"><Package size={15} /></span><div><p className="text-sm font-bold">{product.name}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{product.stock} en stock · seuil {product.threshold}</p></div></div>)}</div><div className="mt-5 rounded-xl border border-dashed p-4"><p className="text-xs font-bold">Dépenses du mois</p><p className="mt-1 text-xl font-bold">{money(state.expenses.reduce((sum, item) => sum + item.amount, 0))}</p><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">Suivies depuis l’espace Finance.</p></div></Panel>
    </div>
    <Panel title="Dernières ventes" action={<button type="button" onClick={() => onTab('sales')} className="text-xs font-bold text-[hsl(var(--primary))]">Tout voir</button>}><DataTable headers={['Référence', 'Client', 'Montant', 'Statut', 'Date']} rows={data.sales.slice(0, 5).map(sale => [<strong key={sale.id}>{sale.reference}</strong>, sale.client, money(sale.amount), <StatusBadge key={`${sale.id}-status`} status={sale.status} />, sale.date])} /></Panel>
  </div>;
}

function SalesPageComplete({ data, query, mutate, canCreate, canModify, companyId }: { data: StoreData; query: string; mutate: (fn: (draft: StoreData) => void, message?: string) => void; canCreate: boolean; canModify: boolean; companyId: string; onToast?: (message: string) => void }) {
  const { alert, confirm } = useAppDialog();
  const [modal, setModal] = useState<Sale | 'new' | null>(null);
  const [client, setClient] = useState('');
  const [amount, setAmount] = useState('');
  const [lines, setLines] = useState<CommerceSaleLine[]>([]);
  const open = (sale?: Sale) => {
    setModal(sale ?? 'new');
    setClient(sale?.client ?? '');
    setAmount(sale ? String(sale.amount) : '');
    setLines(sale?.items.map(item => ({ productId: item.productId, quantity: String(item.quantity) })) ?? []);
  };
  const lineTotal = lines.reduce((sum, line) => {
    const product = data.products.find(item => item.id === line.productId);
    return sum + (product?.price ?? 0) * (Number(line.quantity) || 0);
  }, 0);
  const save = (event?: FormEvent) => {
    event?.preventDefault();
    const items = lines.map(line => ({ productId: line.productId, quantity: Number(line.quantity) })).filter(item => item.productId && Number.isFinite(item.quantity) && item.quantity > 0);
    const total = items.length ? items.reduce((sum, item) => sum + (data.products.find(product => product.id === item.productId)?.price ?? 0) * item.quantity, 0) : Number(amount);
    if (!client.trim() || !Number.isFinite(total) || total <= 0) return;
    mutate(draft => {
      if (modal !== 'new' && modal) {
        const target = draft.sales.find(item => item.id === modal.id);
        if (target) Object.assign(target, { client: client.trim(), amount: total, items });
      } else {
        draft.sales.unshift({ id: uid('sale'), reference: `VTE-${Date.now().toString().slice(-6)}`, client: client.trim(), amount: total, status: 'BROUILLON', date: 'À l’instant', items });
      }
    }, modal !== 'new' && modal ? 'Vente modifiée.' : 'Vente enregistrée en brouillon.');
    setModal(null);
  };
  const validate = async (sale: Sale) => {
    if (sale.items.length === 0) {
      await alert({ title: 'Vente incomplète', description: 'Ajoutez au moins un article avant de valider cette vente afin de garantir la mise à jour du stock.', confirmLabel: 'Compris' });
      return;
    }
    if (!await confirm({ title: 'Valider cette vente ?', description: `La vente ${sale.reference} sera validée et le stock des articles sera déduit.`, confirmLabel: 'Valider' })) return;
    const requested = new Map<string, number>();
    sale.items.forEach(item => requested.set(item.productId, (requested.get(item.productId) ?? 0) + item.quantity));
    const unavailable = [...requested.entries()].find(([productId, quantity]) => (data.products.find(product => product.id === productId)?.stock ?? 0) < quantity);
    if (unavailable) {
      const product = data.products.find(item => item.id === unavailable[0]);
      await alert({ title: 'Stock insuffisant', description: `Stock insuffisant pour ${product?.name ?? 'cet article'}.`, confirmLabel: 'Compris', tone: 'danger' });
      return;
    }
    mutate(draft => {
      const target = draft.sales.find(item => item.id === sale.id);
      if (!target || target.status === 'VALIDÉ') return;
      target.status = 'VALIDÉ';
      target.items.forEach(item => {
        const product = draft.products.find(candidate => candidate.id === item.productId);
        if (product) {
          product.stock -= item.quantity;
          draft.movements.unshift({ id: uid('movement'), product: product.name, quantity: item.quantity, type: 'SORTIE', date: 'À l’instant', user: 'Utilisateur actuel', location: 'Boutique principale' });
          if (product.stock <= product.threshold) {
            addNotification(draft, { title: 'Stock à surveiller', text: `${product.name} est passé sous son seuil de sécurité.`, audience: 'company', companyId, module: 'stocks', severity: 'warning', href: '/kora/stocks?tab=products' });
          }
        }
      });
      draft.activities.unshift({ id: uid('activity'), user: 'Utilisateur actuel', action: 'a validé une vente', module: 'Gestion commerciale', object: sale.reference, date: 'À l’instant', status: 'VALIDÉ' });
      addNotification(draft, { title: 'Vente validée', text: `La vente ${sale.reference} a été validée et le stock a été mis à jour.`, audience: 'company', companyId, module: 'commerce', severity: 'success', href: '/kora/commerce?tab=sales' });
    }, 'Vente validée et stock mis à jour.');
  };
  const remove = async (sale: Sale) => {
    if (!await confirm({ title: 'Supprimer ce brouillon ?', description: `Le brouillon ${sale.reference} sera supprimé définitivement.`, confirmLabel: 'Supprimer', tone: 'danger' })) return;
    mutate(draft => { draft.sales = draft.sales.filter(item => item.id !== sale.id); }, 'Vente supprimée.');
  };
  const sales = data.sales.filter(item => `${item.reference} ${item.client} ${item.status}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-5">
    <Panel title="Ventes & caisse" description="Créez une vente avec ses articles, puis validez-la pour déduire automatiquement le stock." action={canCreate ? <Button primary onClick={() => open()}><Plus size={15} />Nouvelle vente</Button> : undefined}>
      <div className="grid gap-3 sm:grid-cols-3"><Metric label="Ventes enregistrées" value={String(data.sales.length)} detail="Brouillons compris" icon={ShoppingCart} /><Metric label="CA validé" value={money(data.sales.filter(item => item.status === 'VALIDÉ').reduce((sum, item) => sum + item.amount, 0))} detail="Ventes confirmées" icon={CircleDollarSign} accent /><Metric label="Panier moyen" value={money(data.sales.length ? data.sales.reduce((sum, item) => sum + item.amount, 0) / data.sales.length : 0)} detail="Sur les ventes enregistrées" icon={Tags} /></div>
    </Panel>
    <Panel title="Journal des ventes"><DataTable headers={['Référence', 'Client', 'Montant', 'Date', 'Statut', 'Actions']} rows={sales.map(sale => [<strong key={sale.id}>{sale.reference}</strong>, sale.client, money(sale.amount), sale.date, <StatusBadge key={`${sale.id}-badge`} status={sale.status} />, sale.status === 'BROUILLON' ? <div className="flex flex-wrap gap-1">{canModify && <button type="button" onClick={() => open(sale)} className="rounded-lg border px-2 py-1.5 text-[10px] font-bold">Modifier</button>}{canModify && <button type="button" onClick={() => validate(sale)} className="rounded-lg bg-[hsl(var(--primary))] px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--primary-foreground))]">Valider</button>}{canModify && <button type="button" onClick={() => remove(sale)} className="rounded-lg border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--destructive))]"><Trash2 size={13} /></button>}</div> : <span className="text-xs text-[hsl(var(--muted-foreground))]">Stock déduit</span>])} /></Panel>
    {modal && <Modal title={modal === 'new' ? 'Nouvelle vente' : `Modifier ${modal.reference}`} onClose={() => setModal(null)}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Client" value={client} onChange={setClient} placeholder="Nom du client" help="Le client affiché sur la vente et le reçu." />
        <div className="rounded-xl border p-4">
          <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-bold">Articles vendus</h3><p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">Ajoutez des articles pour calculer le total et déduire le stock à la validation.</p></div><button type="button" onClick={() => setLines(current => [...current, { productId: data.products[0]?.id ?? '', quantity: '1' }])} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-[10px] font-bold"><Plus size={13} />Ajouter</button></div>
          <div className="mt-3 space-y-2">{lines.map((line, index) => <div key={`${line.productId}-${index}`} className="flex items-center gap-2"><select aria-label={`Article ${index + 1}`} value={line.productId} onChange={event => setLines(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, productId: event.target.value } : item))} className="min-w-0 flex-1 rounded-lg border bg-[hsl(var(--card))] px-2.5 py-2 text-xs">{data.products.map(product => <option key={product.id} value={product.id}>{product.name} · {money(product.price)}</option>)}</select><input aria-label={`Quantité article ${index + 1}`} type="number" min="1" value={line.quantity} onChange={event => setLines(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: event.target.value } : item))} className="w-20 rounded-lg border bg-transparent px-2.5 py-2 text-xs" /><button type="button" aria-label="Retirer l’article" onClick={() => setLines(current => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg p-2 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--muted))]"><Trash2 size={14} /></button></div>)}</div>
          {lines.length > 0 && <p className="mt-3 text-right text-sm font-bold">Total calculé : {money(lineTotal)}</p>}
        </div>
        {lines.length === 0 && <Field label="Montant TTC" value={amount} onChange={setAmount} type="number" placeholder="0" help="Saisissez un montant libre ou ajoutez des articles pour le calcul automatique." />}
        <div className="flex justify-end gap-2"><Button onClick={() => setModal(null)}>Annuler</Button><Button primary onClick={() => save()}><Check size={15} />Enregistrer le brouillon</Button></div>
      </form>
    </Modal>}
  </div>;
}

function ProductsPageComplete({ data, query, mutate, canCreate, canModify }: { data: StoreData; query: string; mutate: (fn: (draft: StoreData) => void, message?: string) => void; canCreate: boolean; canModify: boolean }) {
  const { alert, confirm } = useAppDialog();
  type Product = StoreData['products'][number];
  const blank = { name: '', sku: '', category: 'Divers', stock: '0', threshold: '0', price: '0' };
  const [modal, setModal] = useState<Product | 'new' | null>(null);
  const [form, setForm] = useState(blank);
  const open = (product?: Product) => { setModal(product ?? 'new'); setForm(product ? { name: product.name, sku: product.sku, category: product.category, stock: String(product.stock), threshold: String(product.threshold), price: String(product.price) } : blank); };
  const save = () => {
    const stock = Number(form.stock); const threshold = Number(form.threshold); const price = Number(form.price);
    if (!form.name.trim() || !form.sku.trim() || [stock, threshold, price].some(value => !Number.isFinite(value) || value < 0)) return;
    if (data.products.some(product => product.id !== (modal !== 'new' && modal ? modal.id : '') && product.sku.toLowerCase() === form.sku.trim().toLowerCase())) { void alert({ title: 'Référence déjà utilisée', description: 'Cette référence existe déjà dans le catalogue.', confirmLabel: 'Compris' }); return; }
    mutate(draft => {
      if (modal !== 'new' && modal) {
        const target = draft.products.find(product => product.id === modal.id);
        if (target) Object.assign(target, { name: form.name.trim(), sku: form.sku.trim(), category: form.category.trim() || 'Divers', stock, threshold, price });
      } else draft.products.unshift({ id: uid('product'), name: form.name.trim(), sku: form.sku.trim(), category: form.category.trim() || 'Divers', stock, threshold, price });
    }, modal !== 'new' && modal ? 'Produit modifié.' : 'Produit ajouté au catalogue.');
    setModal(null);
  };
  const remove = async (product: Product) => {
    if (data.sales.some(sale => sale.items.some(item => item.productId === product.id))) { await alert({ title: 'Suppression impossible', description: 'Ce produit est référencé par une vente et ne peut pas être supprimé.', confirmLabel: 'Compris', tone: 'danger' }); return; }
    if (!await confirm({ title: 'Supprimer ce produit ?', description: `Le produit « ${product.name} » sera supprimé du catalogue.`, confirmLabel: 'Supprimer', tone: 'danger' })) return;
    mutate(draft => { draft.products = draft.products.filter(item => item.id !== product.id); }, 'Produit supprimé.');
  };
  const products = data.products.filter(product => `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-5"><Panel title="Produits & stock" description="Le catalogue commercial partage les niveaux de stock avec les ventes et les opérations." action={canCreate ? <Button primary onClick={() => open()}><Plus size={15} />Nouveau produit</Button> : undefined}><div className="grid gap-3 sm:grid-cols-3"><Metric label="Références" value={String(data.products.length)} detail="Catalogue actif" icon={Boxes} /><Metric label="Unités en stock" value={String(data.products.reduce((sum, item) => sum + item.stock, 0))} detail="Toutes catégories" icon={Package} /><Metric label="Sous seuil" value={String(data.products.filter(item => item.stock <= item.threshold).length)} detail="À réapprovisionner" icon={Archive} warning /></div></Panel><Panel title="Catalogue produits"><DataTable headers={['Produit', 'SKU', 'Catégorie', 'Stock', 'Prix de vente', 'État', 'Actions']} rows={products.map(product => [<strong key={product.id}>{product.name}</strong>, <span className="mono text-xs">{product.sku}</span>, product.category, <span className={product.stock <= product.threshold ? 'font-bold text-[hsl(var(--destructive))]' : 'font-bold'}>{product.stock}</span>, money(product.price), <StatusBadge status={product.stock <= product.threshold ? 'EN ATTENTE' : 'ACTIF'} />, <div className="flex flex-wrap gap-1">{canModify && <button type="button" onClick={() => open(product)} className="rounded-lg border px-2 py-1.5 text-[10px] font-bold">Modifier</button>}{canModify && <button type="button" onClick={() => remove(product)} className="rounded-lg border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--destructive))]"><Trash2 size={13} /></button>}</div>])} /></Panel>{modal && <Modal title={modal === 'new' ? 'Nouveau produit' : 'Modifier le produit'} onClose={() => setModal(null)}><div className="grid gap-4 sm:grid-cols-2"><Field label="Nom" value={form.name} onChange={value => setForm(current => ({ ...current, name: value }))} /><Field label="SKU" value={form.sku} onChange={value => setForm(current => ({ ...current, sku: value }))} /><Field label="Catégorie" value={form.category} onChange={value => setForm(current => ({ ...current, category: value }))} /><Field label="Stock actuel" value={form.stock} onChange={value => setForm(current => ({ ...current, stock: value }))} type="number" /><Field label="Seuil d’alerte" value={form.threshold} onChange={value => setForm(current => ({ ...current, threshold: value }))} type="number" /><Field label="Prix de vente" value={form.price} onChange={value => setForm(current => ({ ...current, price: value }))} type="number" /></div><div className="mt-5 flex justify-end gap-2"><Button onClick={() => setModal(null)}>Annuler</Button><Button primary onClick={save}><Check size={15} />Enregistrer</Button></div></Modal>}</div>;
}

function ClientsPageComplete({ state, query, canCreate, canModify, onUpdate }: { state: CommerceState; query: string; canCreate: boolean; canModify: boolean; onUpdate: (fn: (draft: CommerceState) => void, message?: string) => void }) {
  const { alert, confirm } = useAppDialog();
  const blank = { name: '', phone: '', email: '', address: '' };
  const [modal, setModal] = useState<CommerceClient | 'new' | null>(null);
  const [form, setForm] = useState(blank);
  const open = (client?: CommerceClient) => { setModal(client ?? 'new'); setForm(client ? { name: client.name, phone: client.phone, email: client.email, address: client.address } : blank); };
  const save = () => { if (!form.name.trim()) return; onUpdate(draft => { if (modal !== 'new' && modal) { const target = draft.clients.find(item => item.id === modal.id); if (target) Object.assign(target, { ...form, name: form.name.trim() }); } else draft.clients.unshift({ id: uid('client'), ...form, name: form.name.trim(), balance: 0 }); }, modal !== 'new' && modal ? 'Client modifié.' : 'Client ajouté.'); setModal(null); };
  const remove = async (client: CommerceClient) => { if (state.credits.some(item => item.client === client.name)) { await alert({ title: 'Suppression impossible', description: 'Ce client possède un dossier de crédit et ne peut pas être supprimé.', confirmLabel: 'Compris', tone: 'danger' }); return; } if (!await confirm({ title: 'Supprimer cette fiche ?', description: `La fiche de ${client.name} sera supprimée.`, confirmLabel: 'Supprimer', tone: 'danger' })) return; onUpdate(draft => { draft.clients = draft.clients.filter(item => item.id !== client.id); }, 'Client supprimé.'); };
  const clients = state.clients.filter(client => `${client.name} ${client.phone} ${client.email}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-5"><Panel title="Clients" description="Retrouvez vos clients, leurs coordonnées et leurs encours." action={canCreate ? <Button primary onClick={() => open()}><Plus size={15} />Nouveau client</Button> : undefined}><div className="grid gap-3 sm:grid-cols-3"><Metric label="Clients actifs" value={String(state.clients.length)} detail="Fiches commerciales" icon={Users} /><Metric label="Clients à crédit" value={String(state.credits.filter(item => item.status === 'EN COURS').length)} detail="Suivi des règlements" icon={CreditCard} warning /><Metric label="Encours total" value={money(state.credits.reduce((sum, item) => sum + Math.max(0, item.amount - item.paid), 0))} detail="À recouvrer" icon={CircleDollarSign} /></div></Panel><Panel title="Répertoire clients"><DataTable headers={['Client', 'Téléphone', 'Email', 'Localisation', 'Encours', 'Actions']} rows={clients.map(client => [<strong key={client.id}>{client.name}</strong>, client.phone || '—', client.email || '—', client.address || '—', money(client.balance), <div className="flex gap-1">{canModify && <button type="button" onClick={() => open(client)} className="rounded-lg border px-2 py-1.5 text-[10px] font-bold">Modifier</button>}{canModify && <button type="button" onClick={() => remove(client)} className="rounded-lg border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--destructive))]"><Trash2 size={13} /></button>}</div>])} /></Panel>{modal && <Modal title={modal === 'new' ? 'Nouveau client' : 'Modifier le client'} onClose={() => setModal(null)}><div className="grid gap-4 sm:grid-cols-2"><Field label="Nom du client" value={form.name} onChange={value => setForm(current => ({ ...current, name: value }))} /><Field label="Téléphone" value={form.phone} onChange={value => setForm(current => ({ ...current, phone: value }))} /><Field label="Email" value={form.email} onChange={value => setForm(current => ({ ...current, email: value }))} type="email" /><Field label="Adresse" value={form.address} onChange={value => setForm(current => ({ ...current, address: value }))} /></div><div className="mt-5 flex justify-end gap-2"><Button onClick={() => setModal(null)}>Annuler</Button><Button primary onClick={save}>Enregistrer</Button></div></Modal>}</div>;
}

function SuppliersPageComplete({ data, query, canCreate, canModify, mutate }: { data: StoreData; query: string; canCreate: boolean; canModify: boolean; mutate: (fn: (draft: StoreData) => void, message?: string) => void }) {
  const { alert, confirm } = useAppDialog();
  type Supplier = StoreData['supplierRecords'][number];
  const blank = { name: '', contact: '', phone: '', category: 'Divers' };
  const [modal, setModal] = useState<Supplier | 'new' | null>(null);
  const [form, setForm] = useState(blank);
  const open = (supplier?: Supplier) => { setModal(supplier ?? 'new'); setForm(supplier ? { name: supplier.name, contact: supplier.contact, phone: supplier.phone, category: supplier.category } : blank); };
  const save = () => { if (!form.name.trim()) return; mutate(draft => { if (modal !== 'new' && modal) { const target = draft.supplierRecords.find(item => item.id === modal.id); if (target) Object.assign(target, { ...form, name: form.name.trim() }); } else draft.supplierRecords.unshift({ id: uid('supplier'), ...form, name: form.name.trim(), score: 0, status: 'ACTIF' }); }, modal !== 'new' && modal ? 'Fournisseur modifié.' : 'Fournisseur ajouté.'); setModal(null); };
  const remove = async (supplier: Supplier) => { if (data.purchaseOrders.some(order => order.supplier === supplier.name)) { await alert({ title: 'Suppression impossible', description: 'Ce fournisseur est lié à une commande et ne peut pas être supprimé.', confirmLabel: 'Compris', tone: 'danger' }); return; } if (!await confirm({ title: 'Supprimer ce fournisseur ?', description: `Le fournisseur ${supplier.name} sera supprimé.`, confirmLabel: 'Supprimer', tone: 'danger' })) return; mutate(draft => { draft.supplierRecords = draft.supplierRecords.filter(item => item.id !== supplier.id); }, 'Fournisseur supprimé.'); };
  const suppliers = data.supplierRecords.filter(item => `${item.name} ${item.contact} ${item.category}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-5"><Panel title="Fournisseurs" description="Pilotez le référentiel et la qualité de vos partenaires d’approvisionnement." action={canCreate ? <Button primary onClick={() => open()}><Plus size={15} />Ajouter</Button> : undefined}><div className="grid gap-3 sm:grid-cols-3"><Metric label="Partenaires actifs" value={String(suppliers.length)} detail="Référentiel entreprise" icon={Store} /><Metric label="Note moyenne" value={`${suppliers.length ? Math.round(suppliers.reduce((sum, item) => sum + item.score, 0) / suppliers.length) : 0}/100`} detail="Évaluation fournisseur" icon={BarChart3} accent /><Metric label="Commandes ouvertes" value={String(data.purchaseOrders.filter(item => item.status !== 'VALIDÉ').length)} detail="À suivre" icon={ClipboardList} /></div></Panel><Panel title="Référentiel fournisseurs"><DataTable headers={['Fournisseur', 'Contact', 'Téléphone', 'Catégorie', 'Score', 'Statut', 'Actions']} rows={suppliers.map(item => [<strong key={item.id}>{item.name}</strong>, item.contact, item.phone, item.category, <span className="font-bold">{item.score}/100</span>, <StatusBadge status={item.status} />, <div className="flex gap-1">{canModify && <button type="button" onClick={() => open(item)} className="rounded-lg border px-2 py-1.5 text-[10px] font-bold">Modifier</button>}{canModify && <button type="button" onClick={() => remove(item)} className="rounded-lg border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--destructive))]"><Trash2 size={13} /></button>}</div>])} /></Panel>{modal && <Modal title={modal === 'new' ? 'Ajouter un fournisseur' : 'Modifier le fournisseur'} onClose={() => setModal(null)}><div className="grid gap-4 sm:grid-cols-2"><Field label="Nom du fournisseur" value={form.name} onChange={value => setForm(current => ({ ...current, name: value }))} /><Field label="Contact" value={form.contact} onChange={value => setForm(current => ({ ...current, contact: value }))} /><Field label="Téléphone" value={form.phone} onChange={value => setForm(current => ({ ...current, phone: value }))} /><Field label="Catégorie" value={form.category} onChange={value => setForm(current => ({ ...current, category: value }))} /></div><div className="mt-5 flex justify-end gap-2"><Button onClick={() => setModal(null)}>Annuler</Button><Button primary onClick={save}>Enregistrer</Button></div></Modal>}</div>;
}

function PurchasesPageComplete({ data, query, canCreate, canModify, mutate }: { data: StoreData; query: string; canCreate: boolean; canModify: boolean; mutate: (fn: (draft: StoreData) => void, message?: string) => void }) {
  const { confirm } = useAppDialog();
  type Purchase = StoreData['purchaseOrders'][number];
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ supplier: '', subject: '', amount: '', productId: '', quantity: '1' });
  const save = () => { if (!form.supplier.trim() || !form.subject.trim() || !form.amount || Number(form.amount) <= 0 || (form.productId && Number(form.quantity) <= 0)) return; mutate(draft => draft.purchaseOrders.unshift({ id: uid('purchase'), reference: `BC-${Date.now().toString().slice(-6)}`, supplier: form.supplier.trim(), subject: form.subject.trim(), amount: Number(form.amount), date: 'À l’instant', status: 'BROUILLON', productId: form.productId || undefined, quantity: form.productId ? Number(form.quantity) : undefined }), 'Commande d’achat enregistrée.'); setForm({ supplier: '', subject: '', amount: '', productId: '', quantity: '1' }); setModal(false); };
  const advance = async (order: Purchase) => { const next = order.status === 'BROUILLON' ? 'EN ATTENTE' : order.status === 'EN ATTENTE' ? 'VALIDÉ' : order.status; if (next === order.status) return; if (!await confirm({ title: `${next === 'VALIDÉ' ? 'Valider' : 'Envoyer'} cette commande ?`, description: `La commande ${order.reference} va être ${next === 'VALIDÉ' ? 'validée' : 'envoyée au fournisseur'}.`, confirmLabel: next === 'VALIDÉ' ? 'Valider' : 'Envoyer' })) return; mutate(draft => { const target = draft.purchaseOrders.find(item => item.id === order.id); if (target) { target.status = next; if (next === 'VALIDÉ' && target.productId && target.quantity) { const product = draft.products.find(item => item.id === target.productId); if (product) { product.stock += target.quantity; draft.movements.unshift({ id: uid('movement'), product: product.name, quantity: target.quantity, type: 'ENTRÉE', date: 'À l’instant', user: 'Utilisateur actuel', location: 'Entrepôt principal' }); } } draft.activities.unshift({ id: uid('activity'), user: 'Utilisateur actuel', action: next === 'VALIDÉ' ? 'a validé une commande fournisseur' : 'a envoyé une commande fournisseur', module: 'Achats', object: order.reference, date: 'À l’instant', status: next }); } }, next === 'VALIDÉ' ? 'Commande validée et stock réceptionné.' : 'Commande envoyée au fournisseur.'); };
  const remove = async (order: Purchase) => { if (order.status !== 'BROUILLON' || !await confirm({ title: 'Supprimer cette commande ?', description: `La commande ${order.reference} sera supprimée.`, confirmLabel: 'Supprimer', tone: 'danger' })) return; mutate(draft => { draft.purchaseOrders = draft.purchaseOrders.filter(item => item.id !== order.id); }, 'Commande supprimée.'); };
  const orders = data.purchaseOrders.filter(item => `${item.reference} ${item.supplier} ${item.subject} ${item.status}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-5"><Panel title="Achats" description="Suivez les commandes fournisseurs et leur cycle brouillon, en attente puis validé." action={canCreate ? <Button primary onClick={() => setModal(true)}><Plus size={15} />Nouvel achat</Button> : undefined}><div className="grid gap-3 sm:grid-cols-3"><Metric label="Commandes" value={String(data.purchaseOrders.length)} detail="Sur la période" icon={ClipboardList} /><Metric label="Montant engagé" value={money(data.purchaseOrders.reduce((sum, item) => sum + item.amount, 0))} detail="Commandes affichées" icon={CircleDollarSign} accent /><Metric label="En attente" value={String(data.purchaseOrders.filter(item => item.status === 'EN ATTENTE').length)} detail="Nécessitent un suivi" icon={RefreshCw} warning /></div></Panel><Panel title="Commandes fournisseurs"><DataTable headers={['Référence', 'Fournisseur', 'Objet', 'Article réceptionné', 'Montant', 'Date', 'Statut', 'Actions']} rows={orders.map(order => [<strong key={order.id}>{order.reference}</strong>, order.supplier, order.subject, order.productId ? `${data.products.find(product => product.id === order.productId)?.name ?? 'Article'} × ${order.quantity ?? 0}` : '—', money(order.amount), order.date, <StatusBadge key={`${order.id}-status`} status={order.status} />, <div className="flex flex-wrap gap-1">{canModify && order.status !== 'VALIDÉ' && <button type="button" onClick={() => advance(order)} className="rounded-lg bg-[hsl(var(--primary))] px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--primary-foreground))]">{order.status === 'BROUILLON' ? 'Envoyer' : 'Valider'}</button>}{canModify && order.status === 'BROUILLON' && <button type="button" onClick={() => remove(order)} className="rounded-lg border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--destructive))]"><Trash2 size={13} /></button>}</div>])} /></Panel>{modal && <Modal title="Nouvel achat" onClose={() => setModal(false)}><div className="grid gap-4 sm:grid-cols-2"><Field label="Fournisseur" value={form.supplier} onChange={value => setForm(current => ({ ...current, supplier: value }))} /><Field label="Objet de la commande" value={form.subject} onChange={value => setForm(current => ({ ...current, subject: value }))} /><Field label="Montant estimé" value={form.amount} onChange={value => setForm(current => ({ ...current, amount: value }))} type="number" /><label className="block text-xs font-bold">Article à réceptionner<select value={form.productId} onChange={event => setForm(current => ({ ...current, productId: event.target.value }))} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-2.5 text-sm font-normal"><option value="">Aucun article lié</option>{data.products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select><span className="mt-1 block text-[10px] font-normal text-[hsl(var(--muted-foreground))]">La quantité sera ajoutée au stock lors de la validation.</span></label><Field label="Quantité réceptionnée" value={form.quantity} onChange={value => setForm(current => ({ ...current, quantity: value }))} type="number" /></div><div className="mt-5 flex justify-end gap-2"><Button onClick={() => setModal(false)}>Annuler</Button><Button primary onClick={save}>Enregistrer la commande</Button></div></Modal>}</div>;
}

function ExpensesPageComplete({ state, query, canCreate, canModify, onUpdate }: { state: CommerceState; query: string; canCreate: boolean; canModify: boolean; onUpdate: (fn: (draft: CommerceState) => void, message?: string) => void }) {
  const { confirm } = useAppDialog();
  const blank = { label: '', category: 'Fonctionnement', amount: '', account: state.settings.defaultCash };
  const [modal, setModal] = useState<Expense | 'new' | null>(null);
  const [form, setForm] = useState(blank);
  const open = (expense?: Expense) => { setModal(expense ?? 'new'); setForm(expense ? { label: expense.label, category: expense.category, amount: String(expense.amount), account: expense.account } : blank); };
  const save = () => { const nextAmount = Number(form.amount); if (!form.label.trim() || !form.amount || !Number.isFinite(nextAmount) || nextAmount <= 0) return; onUpdate(draft => { if (modal !== 'new' && modal) { const target = draft.expenses.find(item => item.id === modal.id); if (target) { const oldAccount = draft.cashAccounts.find(account => account.name === target.account); if (oldAccount) oldAccount.balance += target.amount; const newAccount = draft.cashAccounts.find(account => account.name === form.account); if (newAccount) newAccount.balance -= nextAmount; Object.assign(target, { ...form, label: form.label.trim(), amount: nextAmount }); } } else { draft.expenses.unshift({ id: uid('expense'), label: form.label.trim(), category: form.category, amount: nextAmount, date: 'À l’instant', account: form.account }); const account = draft.cashAccounts.find(item => item.name === form.account); if (account) account.balance -= nextAmount; } }, modal !== 'new' && modal ? 'Dépense modifiée.' : 'Dépense enregistrée.'); setModal(null); };
  const remove = async (expense: Expense) => { if (!await confirm({ title: 'Supprimer cette dépense ?', description: `La dépense « ${expense.label} » sera supprimée et son montant recrédité.`, confirmLabel: 'Supprimer', tone: 'danger' })) return; onUpdate(draft => { draft.expenses = draft.expenses.filter(item => item.id !== expense.id); const account = draft.cashAccounts.find(item => item.name === expense.account); if (account) account.balance += expense.amount; }, 'Dépense supprimée.'); };
  const expenses = state.expenses.filter(item => `${item.label} ${item.category} ${item.account}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-5"><Panel title="Dépenses" description="Enregistrez les sorties de trésorerie et suivez leur répartition." action={canCreate ? <Button primary onClick={() => open()}><Plus size={15} />Nouvelle dépense</Button> : undefined}><div className="grid gap-3 sm:grid-cols-3"><Metric label="Total dépenses" value={money(state.expenses.reduce((sum, item) => sum + item.amount, 0))} detail="Dépenses enregistrées" icon={ArrowDownToLine} warning /><Metric label="Opérations" value={String(state.expenses.length)} detail="Lignes comptabilisées" icon={FileText} /><Metric label="Poste principal" value={state.expenses[0]?.category ?? '—'} detail="Dernière catégorie" icon={Tags} /></div></Panel><Panel title="Journal des dépenses"><DataTable headers={['Libellé', 'Catégorie', 'Compte', 'Montant', 'Date', 'Actions']} rows={expenses.map(item => [<strong key={item.id}>{item.label}</strong>, item.category, item.account, money(item.amount), item.date, <div className="flex gap-1">{canModify && <button type="button" onClick={() => open(item)} className="rounded-lg border px-2 py-1.5 text-[10px] font-bold">Modifier</button>}{canModify && <button type="button" onClick={() => remove(item)} className="rounded-lg border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--destructive))]"><Trash2 size={13} /></button>}</div>])} /></Panel>{modal && <Modal title={modal === 'new' ? 'Nouvelle dépense' : 'Modifier la dépense'} onClose={() => setModal(null)}><div className="grid gap-4 sm:grid-cols-2"><Field label="Libellé" value={form.label} onChange={value => setForm(current => ({ ...current, label: value }))} /><Field label="Catégorie" value={form.category} onChange={value => setForm(current => ({ ...current, category: value }))} /><Field label="Montant" value={form.amount} onChange={value => setForm(current => ({ ...current, amount: value }))} type="number" /><Field label="Compte de caisse" value={form.account} onChange={value => setForm(current => ({ ...current, account: value }))} /></div><div className="mt-5 flex justify-end gap-2"><Button onClick={() => setModal(null)}>Annuler</Button><Button primary onClick={save}>Enregistrer</Button></div></Modal>}</div>;
}

function CashPageComplete({ state, query, canCreate, canModify, onUpdate }: { state: CommerceState; query: string; canCreate: boolean; canModify: boolean; onUpdate: (fn: (draft: CommerceState) => void, message?: string) => void }) {
  const { confirm } = useAppDialog();
  const [modal, setModal] = useState<CashAccount | 'new' | null>(null);
  const [form, setForm] = useState({ name: '', responsible: '' });
  const open = (account?: CashAccount) => { setModal(account ?? 'new'); setForm(account ? { name: account.name, responsible: account.responsible } : { name: '', responsible: '' }); };
  const save = () => { if (!form.name.trim()) return; onUpdate(draft => { if (modal !== 'new' && modal) { const target = draft.cashAccounts.find(item => item.id === modal.id); if (target) Object.assign(target, { name: form.name.trim(), responsible: form.responsible.trim() || 'À désigner' }); } else draft.cashAccounts.push({ id: uid('cash'), name: form.name.trim(), balance: 0, responsible: form.responsible.trim() || 'À désigner', active: true }); }, modal !== 'new' && modal ? 'Compte modifié.' : 'Compte de caisse créé.'); setModal(null); };
  const toggle = async (account: CashAccount) => { if (!await confirm({ title: `${account.active ? 'Archiver' : 'Réactiver'} ce compte ?`, description: `Le compte ${account.name} sera ${account.active ? 'archivé' : 'réactivé'}.`, confirmLabel: account.active ? 'Archiver' : 'Réactiver' })) return; onUpdate(draft => { const target = draft.cashAccounts.find(item => item.id === account.id); if (target) target.active = !target.active; }, account.active ? 'Compte archivé.' : 'Compte réactivé.'); };
  const accounts = state.cashAccounts.filter(item => `${item.name} ${item.responsible}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-5"><Panel title="Comptes de caisse" description="Visualisez les liquidités disponibles par compte et leur responsable." action={canCreate ? <Button primary onClick={() => open()}><Plus size={15} />Nouveau compte</Button> : undefined}><div className="grid gap-3 sm:grid-cols-3"><Metric label="Solde total" value={money(state.cashAccounts.filter(item => item.active).reduce((sum, item) => sum + item.balance, 0))} detail="Tous comptes actifs" icon={WalletCards} accent /><Metric label="Comptes actifs" value={String(state.cashAccounts.filter(item => item.active).length)} detail="Trésorerie suivie" icon={Building2} /><Metric label="Dernière caisse" value={state.cashAccounts[0]?.name ?? '—'} detail="Compte par défaut" icon={CircleDollarSign} /></div></Panel><Panel title="Comptes"><DataTable headers={['Compte', 'Responsable', 'Solde', 'État', 'Actions']} rows={accounts.map(item => [<strong key={item.id}>{item.name}</strong>, item.responsible, money(item.balance), <StatusBadge status={item.active ? 'ACTIF' : 'ARCHIVÉ'} />, <div className="flex gap-1">{canModify && <button type="button" onClick={() => open(item)} className="rounded-lg border px-2 py-1.5 text-[10px] font-bold">Modifier</button>}{canModify && <button type="button" onClick={() => toggle(item)} className="rounded-lg border px-2 py-1.5 text-[10px] font-bold">{item.active ? 'Archiver' : 'Réactiver'}</button>}</div>])} /></Panel>{modal && <Modal title={modal === 'new' ? 'Nouveau compte de caisse' : 'Modifier le compte'} onClose={() => setModal(null)}><div className="grid gap-4 sm:grid-cols-2"><Field label="Nom du compte" value={form.name} onChange={value => setForm(current => ({ ...current, name: value }))} placeholder="Ex. Caisse boutique" /><Field label="Responsable" value={form.responsible} onChange={value => setForm(current => ({ ...current, responsible: value }))} /></div><div className="mt-5 flex justify-end gap-2"><Button onClick={() => setModal(null)}>Annuler</Button><Button primary onClick={save}>Enregistrer</Button></div></Modal>}</div>;
}

function CreditPageComplete({ state, query, canCreate, canModify, onUpdate }: { state: CommerceState; query: string; canCreate: boolean; canModify: boolean; onUpdate: (fn: (draft: CommerceState) => void, message?: string) => void }) {
  const { confirm } = useAppDialog();
  const [modal, setModal] = useState<Credit | 'new' | null>(null);
  const [paymentCredit, setPaymentCredit] = useState<Credit | null>(null);
  const [form, setForm] = useState({ client: '', reference: '', amount: '', dueDate: '' });
  const [paymentAmount, setPaymentAmount] = useState('');
  const open = (credit?: Credit) => { setModal(credit ?? 'new'); setForm(credit ? { client: credit.client, reference: credit.reference, amount: String(credit.amount), dueDate: credit.dueDate } : { client: '', reference: `CRD-${Date.now().toString().slice(-6)}`, amount: '', dueDate: '' }); };
  const save = () => { const nextAmount = Number(form.amount); if (!form.client.trim() || !form.reference.trim() || !form.amount || !Number.isFinite(nextAmount) || nextAmount <= 0) return; onUpdate(draft => { draft.credits.unshift({ id: uid('credit'), client: form.client.trim(), reference: form.reference.trim(), amount: nextAmount, paid: 0, dueDate: form.dueDate.trim() || 'À définir', status: 'EN COURS' }); const client = draft.clients.find(item => item.name.toLowerCase() === form.client.trim().toLowerCase()); if (client) client.balance += nextAmount; }, 'Crédit client créé.'); setModal(null); };
  const pay = () => { const nextPayment = Number(paymentAmount); if (!paymentCredit || !paymentAmount || !Number.isFinite(nextPayment) || nextPayment <= 0) return; onUpdate(draft => { const target = draft.credits.find(item => item.id === paymentCredit.id); if (target) { const previousRemaining = target.amount - target.paid; const applied = Math.min(previousRemaining, nextPayment); target.paid += applied; target.status = target.paid >= target.amount ? 'RÉGLÉ' : 'EN COURS'; const client = draft.clients.find(item => item.name.toLowerCase() === target.client.toLowerCase()); if (client) client.balance = Math.max(0, client.balance - applied); } }, 'Règlement client enregistré.'); setPaymentCredit(null); setPaymentAmount(''); };
  const credits = state.credits.filter(item => `${item.client} ${item.reference} ${item.status}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-5"><Panel title="Crédit clients" description="Créez les ventes à terme et enregistrez les règlements partiels ou complets." action={canCreate ? <Button primary onClick={() => open()}><Plus size={15} />Nouveau crédit</Button> : undefined}><div className="grid gap-3 sm:grid-cols-3"><Metric label="Créances ouvertes" value={money(state.credits.filter(item => item.status === 'EN COURS').reduce((sum, item) => sum + item.amount - item.paid, 0))} detail="Reste à encaisser" icon={CreditCard} warning /><Metric label="Dossiers ouverts" value={String(state.credits.filter(item => item.status === 'EN COURS').length)} detail="Clients concernés" icon={Users} /><Metric label="Règlements complets" value={String(state.credits.filter(item => item.status === 'RÉGLÉ').length)} detail="Dossiers soldés" icon={Check} accent /></div></Panel><Panel title="Portefeuille crédit"><DataTable headers={['Référence', 'Client', 'Montant', 'Déjà payé', 'Reste', 'Échéance', 'Statut', 'Action']} rows={credits.map(item => [<strong key={item.id}>{item.reference}</strong>, item.client, money(item.amount), money(item.paid), money(Math.max(0, item.amount - item.paid)), item.dueDate, <StatusBadge key={`${item.id}-status`} status={item.status === 'RÉGLÉ' ? 'CONFIRMÉ' : 'EN ATTENTE'} />, item.status === 'EN COURS' && canModify ? <button type="button" onClick={() => { setPaymentCredit(item); setPaymentAmount(String(item.amount - item.paid)); }} className="rounded-lg bg-[hsl(var(--primary))] px-2.5 py-1.5 text-[10px] font-bold text-[hsl(var(--primary-foreground))]">Enregistrer règlement</button> : '—'])} /></Panel>{modal && <Modal title="Nouveau crédit client" onClose={() => setModal(null)}><div className="grid gap-4 sm:grid-cols-2"><Field label="Client" value={form.client} onChange={value => setForm(current => ({ ...current, client: value }))} /><Field label="Référence" value={form.reference} onChange={value => setForm(current => ({ ...current, reference: value }))} /><Field label="Montant" value={form.amount} onChange={value => setForm(current => ({ ...current, amount: value }))} type="number" /><Field label="Échéance" value={form.dueDate} onChange={value => setForm(current => ({ ...current, dueDate: value }))} placeholder="Ex. 30 juin 2024" /></div><div className="mt-5 flex justify-end gap-2"><Button onClick={() => setModal(null)}>Annuler</Button><Button primary onClick={save}>Créer le crédit</Button></div></Modal>}{paymentCredit && <Modal title={`Règlement ${paymentCredit.reference}`} onClose={() => setPaymentCredit(null)}><Field label="Montant reçu" value={paymentAmount} onChange={setPaymentAmount} type="number" help={`Reste à encaisser : ${money(paymentCredit.amount - paymentCredit.paid)}.`} /><div className="mt-5 flex justify-end gap-2"><Button onClick={() => setPaymentCredit(null)}>Annuler</Button><Button primary onClick={pay}>Enregistrer le règlement</Button></div></Modal>}</div>;
}

function InvoicesPageComplete({ data, query, onToast }: { data: StoreData; query: string; onToast: (message: string) => void }) {
  const invoices = data.sales.filter(item => `${item.reference} ${item.client}`.toLowerCase().includes(query.toLowerCase()));
  const print = (sale: Sale) => { onToast(`Reçu ${sale.reference} prêt à imprimer.`); window.setTimeout(() => window.print(), 100); };
  const exportCsv = () => { const rows = [['Référence', 'Client', 'Montant', 'Date', 'Statut'], ...invoices.map(item => [`FAC-${item.reference.replace('VTE-', '')}`, item.client, String(item.amount), item.date, item.status])]; const csv = rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(';')).join('\n'); const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = 'factures-recus-commerce.csv'; link.click(); URL.revokeObjectURL(url); onToast('Factures exportées en CSV.'); };
  return <div className="space-y-5"><Panel title="Factures & reçus" description="Générez un reçu imprimable ou exportez la liste des pièces commerciales." action={<Button onClick={exportCsv}><FileDown size={15} />Exporter CSV</Button>}><div className="grid gap-3 sm:grid-cols-3"><Metric label="Pièces commerciales" value={String(invoices.length)} detail="Ventes enregistrées" icon={FileCheck2} /><Metric label="Validées" value={String(invoices.filter(item => item.status === 'VALIDÉ').length)} detail="Prêtes à remettre" icon={Check} accent /><Metric label="En brouillon" value={String(invoices.filter(item => item.status === 'BROUILLON').length)} detail="À finaliser" icon={FileText} /></div></Panel><Panel title="Factures et reçus"><DataTable headers={['Référence', 'Client', 'Montant', 'Date', 'Statut', 'Document']} rows={invoices.map(item => [<strong key={item.id}>{`FAC-${item.reference.replace('VTE-', '')}`}</strong>, item.client, money(item.amount), item.date, <StatusBadge key={`${item.id}-status`} status={item.status} />, <button type="button" onClick={() => print(item)} className="rounded-lg border px-2.5 py-1.5 text-[10px] font-bold hover:bg-[hsl(var(--muted))]">Imprimer le reçu</button>])} /></Panel></div>;
}

function ReturnsPageComplete({ data, state, query, canCreate, canModify, mutate, onUpdate }: { data: StoreData; state: CommerceState; query: string; canCreate: boolean; canModify: boolean; mutate: (fn: (draft: StoreData) => void, message?: string) => void; onUpdate: (fn: (draft: CommerceState) => void, message?: string) => void }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ partner: '', amount: '', type: 'RETOUR CLIENT' as ReturnRecord['type'], productId: '', quantity: '1' });
  const save = () => { const quantity = Number(form.quantity); if (!form.partner.trim() || !form.amount || Number(form.amount) <= 0 || (form.productId && (!Number.isFinite(quantity) || quantity <= 0))) return; onUpdate(draft => draft.returns.unshift({ id: uid('return'), reference: `AVR-${Date.now().toString().slice(-6)}`, partner: form.partner.trim(), amount: Number(form.amount), type: form.type, date: 'À l’instant', status: 'BROUILLON', productId: form.productId || undefined, quantity: form.productId ? quantity : undefined }), 'Retour enregistré en brouillon.'); setForm({ partner: '', amount: '', type: 'RETOUR CLIENT', productId: '', quantity: '1' }); setModal(false); };
  const { confirm } = useAppDialog();
  const confirmReturn = async (record: ReturnRecord) => { if (!await confirm({ title: 'Confirmer ce retour ?', description: `Le dossier ${record.reference} sera confirmé.`, confirmLabel: 'Confirmer' })) return; onUpdate(draft => { const item = draft.returns.find(candidate => candidate.id === record.id); if (item) item.status = 'CONFIRMÉ'; }); if (record.productId && record.quantity) mutate(draft => { const product = draft.products.find(candidate => candidate.id === record.productId); if (product) { product.stock += record.type === 'RETOUR CLIENT' ? record.quantity! : -record.quantity!; draft.movements.unshift({ id: uid('movement'), product: product.name, quantity: record.quantity!, type: record.type === 'RETOUR CLIENT' ? 'ENTRÉE' : 'SORTIE', date: 'À l’instant', user: 'Utilisateur actuel', location: 'Entrepôt principal' }); } }, 'Retour confirmé et stock ajusté.'); else onUpdate(() => {}, 'Retour confirmé.'); };
  const remove = async (record: ReturnRecord) => { if (!await confirm({ title: 'Supprimer ce retour ?', description: `Le dossier ${record.reference} sera supprimé.`, confirmLabel: 'Supprimer', tone: 'danger' })) return; onUpdate(draft => { draft.returns = draft.returns.filter(item => item.id !== record.id); }, 'Retour supprimé.'); };
  const returns = state.returns.filter(item => `${item.reference} ${item.partner} ${item.type}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-5"><Panel title="Retours & avoirs" description="Centralisez les retours clients et les avoirs fournisseurs avec un contrôle avant confirmation." action={canCreate ? <Button primary onClick={() => setModal(true)}><Plus size={15} />Nouveau retour</Button> : undefined}><div className="grid gap-3 sm:grid-cols-3"><Metric label="Dossiers" value={String(state.returns.length)} detail="Retours enregistrés" icon={ArrowUpRight} /><Metric label="Montant total" value={money(state.returns.reduce((sum, item) => sum + item.amount, 0))} detail="Avoirs compris" icon={CircleDollarSign} warning /><Metric label="À confirmer" value={String(state.returns.filter(item => item.status === 'BROUILLON').length)} detail="Contrôle requis" icon={ClipboardList} /></div></Panel><Panel title="Historique des retours"><DataTable headers={['Référence', 'Type', 'Partenaire', 'Article', 'Montant', 'Date', 'Statut', 'Actions']} rows={returns.map(item => [<strong key={item.id}>{item.reference}</strong>, item.type, item.partner, item.productId ? `${data.products.find(product => product.id === item.productId)?.name ?? 'Article'} × ${item.quantity ?? 0}` : '—', money(item.amount), item.date, <StatusBadge key={`${item.id}-status`} status={item.status} />, <div className="flex gap-1">{item.status === 'BROUILLON' && canModify && <button type="button" onClick={() => confirmReturn(item)} className="rounded-lg bg-[hsl(var(--primary))] px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--primary-foreground))]">Confirmer</button>}{item.status === 'BROUILLON' && canModify && <button type="button" onClick={() => remove(item)} className="rounded-lg border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--destructive))]"><Trash2 size={13} /></button>}</div>])} /></Panel>{modal && <Modal title="Nouveau retour ou avoir" onClose={() => setModal(false)}><div className="grid gap-4 sm:grid-cols-2"><Field label="Partenaire" value={form.partner} onChange={value => setForm(current => ({ ...current, partner: value }))} /><Field label="Montant" value={form.amount} onChange={value => setForm(current => ({ ...current, amount: value }))} type="number" /><label className="block text-xs font-bold sm:col-span-2">Type<select value={form.type} onChange={event => setForm(current => ({ ...current, type: event.target.value as ReturnRecord['type'] }))} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-2.5 text-sm font-normal"><option value="RETOUR CLIENT">Retour client</option><option value="AVOIR FOURNISSEUR">Avoir fournisseur</option></select></label><label className="block text-xs font-bold">Article lié<select value={form.productId} onChange={event => setForm(current => ({ ...current, productId: event.target.value }))} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-2.5 text-sm font-normal"><option value="">Aucun article lié</option>{data.products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><Field label="Quantité" value={form.quantity} onChange={value => setForm(current => ({ ...current, quantity: value }))} type="number" /></div><div className="mt-5 flex justify-end gap-2"><Button onClick={() => setModal(false)}>Annuler</Button><Button primary onClick={save}>Enregistrer le brouillon</Button></div></Modal>}</div>;
}

function SalesPageFunctional({ data, query, mutate, canCreate, canModify, taxRate, companyId }: { data: StoreData; query: string; mutate: (fn: (draft: StoreData) => void, message?: string) => void; canCreate: boolean; canModify: boolean; taxRate: number; companyId: string }) {
  const { alert, confirm } = useAppDialog();
  const [modal, setModal] = useState<Sale | 'new' | null>(null);
  const [client, setClient] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [discount, setDiscount] = useState('0');
  const [saleTaxRate, setSaleTaxRate] = useState(String(taxRate));
  const [paymentMethod, setPaymentMethod] = useState('Espèces');
  const [paidAmount, setPaidAmount] = useState('');
  const [lines, setLines] = useState<CommerceSaleLine[]>([]);
  const open = (sale?: Sale) => {
    setModal(sale ?? 'new');
    setClient(sale?.client ?? '');
    setManualAmount(sale && !sale.items.length ? String(sale.amount) : '');
    setDiscount(String(sale?.discount ?? 0));
    setSaleTaxRate(String(sale?.taxRate ?? taxRate));
    setPaymentMethod(sale?.paymentMethod ?? 'Espèces');
    setPaidAmount(sale?.paidAmount ? String(sale.paidAmount) : '');
    setLines(sale?.items.map(item => ({ productId: item.productId, quantity: String(item.quantity) })) ?? []);
  };
  const subtotal = lines.reduce((sum, line) => sum + (data.products.find(product => product.id === line.productId)?.price ?? 0) * (Number(line.quantity) || 0), 0) || Number(manualAmount) || 0;
  const discountValue = Math.min(subtotal, Math.max(0, Number(discount) || 0));
  const taxValue = Math.max(0, (subtotal - discountValue) * (Math.max(0, Number(saleTaxRate) || 0) / 100));
  const total = Math.max(0, subtotal - discountValue + taxValue);
  const save = () => {
    const items = lines.map(line => ({ productId: line.productId, quantity: Number(line.quantity) })).filter(item => item.productId && Number.isFinite(item.quantity) && item.quantity > 0);
    if (!client.trim() || total <= 0) return;
    const details = { client: client.trim(), amount: total, items, discount: discountValue, taxRate: Math.max(0, Number(saleTaxRate) || 0), paymentMethod, paidAmount: Math.min(total, Math.max(0, Number(paidAmount) || 0)) };
    mutate(draft => {
      if (modal !== 'new' && modal) {
        const target = draft.sales.find(item => item.id === modal.id);
        if (target) Object.assign(target, details);
      } else draft.sales.unshift({ id: uid('sale'), reference: `VTE-${Date.now().toString().slice(-6)}`, ...details, status: 'BROUILLON', date: 'À l’instant' });
    }, modal !== 'new' && modal ? 'Vente modifiée.' : 'Vente enregistrée en brouillon.');
    setModal(null);
  };
  const validate = async (sale: Sale) => {
    if (!sale.items.length) { await alert({ title: 'Vente incomplète', description: 'Ajoutez au moins un article avant de valider la vente afin de mettre à jour le stock.', confirmLabel: 'Compris' }); return; }
    const requested = new Map<string, number>();
    sale.items.forEach(item => requested.set(item.productId, (requested.get(item.productId) ?? 0) + item.quantity));
    const unavailable = [...requested.entries()].find(([productId, quantity]) => (data.products.find(product => product.id === productId)?.stock ?? 0) < quantity);
    if (unavailable) { await alert({ title: 'Stock insuffisant', description: `Stock insuffisant pour ${data.products.find(product => product.id === unavailable[0])?.name ?? 'cet article'}.`, confirmLabel: 'Compris', tone: 'danger' }); return; }
    if (!await confirm({ title: 'Valider cette vente ?', description: `La vente ${sale.reference} sera validée et le stock sera déduit.`, confirmLabel: 'Valider' })) return;
    mutate(draft => {
      const target = draft.sales.find(item => item.id === sale.id);
      if (!target || target.status === 'VALIDÉ') return;
      target.status = 'VALIDÉ';
      target.items.forEach(item => {
        const product = draft.products.find(candidate => candidate.id === item.productId);
        if (product) {
          product.stock -= item.quantity;
          draft.movements.unshift({ id: uid('movement'), product: product.name, quantity: item.quantity, type: 'SORTIE', date: 'À l’instant', user: 'Utilisateur actuel', location: 'Boutique principale' });
          if (product.stock <= product.threshold) addNotification(draft, { title: 'Stock à surveiller', text: `${product.name} est passé sous son seuil de sécurité.`, audience: 'company', companyId, module: 'stocks', severity: 'warning', href: '/kora/stocks?tab=products' });
        }
      });
      if ((target.paidAmount ?? 0) > 0) draft.payments.unshift({ id: uid('payment'), reference: `PAY-${Date.now().toString().slice(-6)}`, invoice: `FAC-${target.reference.replace('VTE-', '')}`, amount: target.paidAmount ?? 0, status: 'CONFIRMÉ', date: 'À l’instant' });
      draft.activities.unshift({ id: uid('activity'), user: 'Utilisateur actuel', action: 'a validé une vente', module: 'Gestion commerciale', object: target.reference, date: 'À l’instant', status: 'VALIDÉ' });
      addNotification(draft, { title: 'Vente validée', text: `La vente ${target.reference} a été validée et le stock a été mis à jour.`, audience: 'company', companyId, module: 'commerce', severity: 'success', href: '/kora/commerce?tab=sales' });
    }, 'Vente validée, encaissement enregistré et stock mis à jour.');
  };
  const remove = async (sale: Sale) => { if (!await confirm({ title: 'Supprimer ce brouillon ?', description: `Le brouillon ${sale.reference} sera supprimé.`, confirmLabel: 'Supprimer', tone: 'danger' })) return; mutate(draft => { draft.sales = draft.sales.filter(item => item.id !== sale.id); }, 'Vente supprimée.'); };
  const sales = data.sales.filter(item => `${item.reference} ${item.client} ${item.status}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-5">
    <Panel title="Ventes & caisse" description="Composez la vente, appliquez la remise et les taxes, puis encaissez et validez." action={canCreate ? <Button primary onClick={() => open()}><Plus size={15} />Nouvelle vente</Button> : undefined}>
      <div className="grid gap-3 sm:grid-cols-3"><Metric label="Ventes" value={String(data.sales.length)} detail="Brouillons compris" icon={ShoppingCart} /><Metric label="CA validé" value={money(data.sales.filter(item => item.status === 'VALIDÉ').reduce((sum, item) => sum + item.amount, 0))} detail="Ventes confirmées" icon={CircleDollarSign} accent /><Metric label="Encaissements" value={money(data.payments.filter(item => item.status === 'CONFIRMÉ').reduce((sum, item) => sum + item.amount, 0))} detail="Paiements confirmés" icon={WalletCards} /></div>
    </Panel>
    <Panel title="Journal des ventes"><DataTable headers={['Référence', 'Client', 'Montant', 'Encaissement', 'Date', 'Statut', 'Actions']} rows={sales.map(sale => [<strong key={sale.id}>{sale.reference}</strong>, sale.client, money(sale.amount), sale.paidAmount ? `${money(sale.paidAmount)} · ${sale.paymentMethod ?? 'Paiement'}` : 'Non encaissé', sale.date, <StatusBadge key={`${sale.id}-status`} status={sale.status} />, sale.status === 'BROUILLON' ? <div className="flex flex-wrap gap-1">{canModify && <button type="button" onClick={() => open(sale)} className="rounded-lg border px-2 py-1.5 text-[10px] font-bold">Modifier</button>}{canModify && <button type="button" onClick={() => validate(sale)} className="rounded-lg bg-[hsl(var(--primary))] px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--primary-foreground))]">Valider</button>}{canModify && <button type="button" onClick={() => remove(sale)} className="rounded-lg border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--destructive))]"><Trash2 size={13} /></button>}</div> : <span className="text-xs text-[hsl(var(--muted-foreground))]">Stock déduit</span>])} /></Panel>
    {modal && <Modal title={modal === 'new' ? 'Nouvelle vente' : `Modifier ${modal.reference}`} onClose={() => setModal(null)}>
      <div className="space-y-4"><Field label="Client" value={client} onChange={setClient} placeholder="Nom du client" />
        <div className="rounded-xl border p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-bold">Articles</h3><p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">Le stock est contrôlé puis déduit uniquement à la validation.</p></div><button type="button" onClick={() => setLines(current => [...current, { productId: data.products[0]?.id ?? '', quantity: '1' }])} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-[10px] font-bold"><Plus size={13} />Ajouter un article</button></div>
          <div className="mt-3 space-y-2">{lines.map((line, index) => <div key={`${line.productId}-${index}`} className="flex gap-2"><select aria-label={`Article ${index + 1}`} value={line.productId} onChange={event => setLines(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, productId: event.target.value } : item))} className="min-w-0 flex-1 rounded-lg border bg-[hsl(var(--card))] px-2.5 py-2 text-xs">{data.products.map(product => <option key={product.id} value={product.id}>{product.name} · {money(product.price)}</option>)}</select><input aria-label={`Quantité article ${index + 1}`} type="number" min="1" value={line.quantity} onChange={event => setLines(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: event.target.value } : item))} className="w-20 rounded-lg border bg-transparent px-2.5 py-2 text-xs" /><button type="button" aria-label="Retirer l’article" onClick={() => setLines(current => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg p-2 text-[hsl(var(--destructive))]"><Trash2 size={14} /></button></div>)}</div>
          {lines.length === 0 && <Field label="Montant hors article" value={manualAmount} onChange={setManualAmount} type="number" help="Ajoutez des articles pour que le stock soit géré automatiquement." />}<p className="mt-3 text-right text-sm font-bold">Sous-total : {money(subtotal)}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Remise" value={discount} onChange={setDiscount} type="number" /><Field label="Taxes (%)" value={saleTaxRate} onChange={setSaleTaxRate} type="number" /><label className="block text-xs font-bold">Mode de paiement<select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)} className="mt-2 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-2.5 text-sm font-normal"><option>Espèces</option><option>Carte bancaire</option><option>Virement</option><option>Crédit client</option></select></label><Field label="Montant encaissé" value={paidAmount} onChange={setPaidAmount} type="number" help={`Total TTC : ${money(total)}. Le montant est plafonné au total.`} /></div>
        <div className="rounded-xl bg-[hsl(var(--muted)/.5)] p-4 text-right"><p className="text-xs text-[hsl(var(--muted-foreground))]">Total TTC</p><p className="text-2xl font-bold">{money(total)}</p></div><div className="flex justify-end gap-2"><Button onClick={() => setModal(null)}>Annuler</Button><Button primary onClick={save}><Check size={15} />Enregistrer le brouillon</Button></div>
      </div>
    </Modal>}
  </div>;
}

function SalesPage({ data, query, mutate, canCreate, canModify, onToast }: { data: StoreData; query: string; mutate: (fn: (draft: StoreData) => void, message?: string) => void; canCreate: boolean; canModify: boolean; onToast: (message: string) => void }) {
  const { confirm } = useAppDialog();
  const [modal, setModal] = useState<Sale | 'new' | null>(null);
  const [client, setClient] = useState('');
  const [amount, setAmount] = useState('');
  const open = (sale?: Sale) => { setModal(sale ?? 'new'); setClient(sale?.client ?? ''); setAmount(sale ? String(sale.amount) : ''); };
  const save = (event?: FormEvent) => {
    event?.preventDefault();
    if (!client.trim() || !amount || Number(amount) <= 0) return;
    mutate(draft => {
      if (modal !== 'new' && modal) {
        const target = draft.sales.find(item => item.id === modal.id);
        if (target) { target.client = client.trim(); target.amount = Number(amount); }
      } else draft.sales.unshift({ id: uid('sale'), reference: `VTE-${Date.now().toString().slice(-6)}`, client: client.trim(), amount: Number(amount), status: 'BROUILLON', date: 'À l’instant', items: [] });
    }, modal !== 'new' && modal ? 'Vente modifiée.' : 'Vente enregistrée en brouillon.');
    setModal(null);
  };
  const validate = async (sale: Sale) => {
    if (!await confirm({ title: 'Valider cette vente ?', description: `La vente ${sale.reference} sera validée et le stock des articles sera déduit.`, confirmLabel: 'Valider' })) return;
    mutate(draft => {
      const target = draft.sales.find(item => item.id === sale.id);
      if (!target || target.status === 'VALIDÉ') return;
      target.status = 'VALIDÉ';
      target.items.forEach(item => { const product = draft.products.find(candidate => candidate.id === item.productId); if (product) product.stock -= item.quantity; });
      draft.activities.unshift({ id: uid('activity'), user: 'Utilisateur actuel', action: 'a validé une vente', module: 'Gestion commerciale', object: sale.reference, date: 'À l’instant', status: 'VALIDÉ' });
    }, 'Vente validée et stock mis à jour.');
  };
  const remove = async (sale: Sale) => { if (!await confirm({ title: 'Supprimer ce brouillon ?', description: `Le brouillon ${sale.reference} sera supprimé.`, confirmLabel: 'Supprimer', tone: 'danger' })) return; mutate(draft => { draft.sales = draft.sales.filter(item => item.id !== sale.id); }, 'Vente supprimée.'); };
  const sales = data.sales.filter(item => `${item.reference} ${item.client} ${item.status}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-5"><Panel title="Ventes & caisse" description="Saisissez les ventes, validez-les et gardez une trace des encaissements." action={canCreate ? <Button primary onClick={() => open()}><Plus size={15} />Nouvelle vente</Button> : undefined}><div className="grid gap-3 sm:grid-cols-3"><Metric label="Ventes enregistrées" value={String(data.sales.length)} detail="Brouillons compris" icon={ShoppingCart} /><Metric label="CA validé" value={money(data.sales.filter(item => item.status === 'VALIDÉ').reduce((sum, item) => sum + item.amount, 0))} detail="Ventes confirmées" icon={CircleDollarSign} accent /><Metric label="Panier moyen" value={money(data.sales.length ? data.sales.reduce((sum, item) => sum + item.amount, 0) / data.sales.length : 0)} detail="Sur la période affichée" icon={Tags} /></div></Panel><Panel title="Journal des ventes"><DataTable headers={['Référence', 'Client', 'Montant', 'Date', 'Statut', 'Actions']} rows={sales.map(sale => [<strong key={sale.id}>{sale.reference}</strong>, sale.client, money(sale.amount), sale.date, <StatusBadge key={`${sale.id}-badge`} status={sale.status} />, sale.status === 'BROUILLON' && <div className="flex flex-wrap gap-1">{canModify && <button type="button" onClick={() => open(sale)} className="rounded-lg border px-2 py-1.5 text-[10px] font-bold">Modifier</button>}{canCreate && <button type="button" onClick={() => validate(sale)} className="rounded-lg bg-[hsl(var(--primary))] px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--primary-foreground))]">Valider</button>}{canModify && <button type="button" onClick={() => remove(sale)} className="rounded-lg border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--destructive))]"><Trash2 size={13} /></button>}</div>])} /></Panel>{modal && <Modal title={modal === 'new' ? 'Nouvelle vente' : `Modifier ${modal.reference}`} onClose={() => setModal(null)}><form onSubmit={save} className="space-y-4"><Field label="Client" value={client} onChange={setClient} placeholder="Nom du client" help="Le client affiché sur la vente et le reçu." /><Field label="Montant TTC" value={amount} onChange={setAmount} type="number" placeholder="0" help="Saisissez le montant total de la vente." /><div className="flex justify-end gap-2"><Button onClick={() => setModal(null)}>Annuler</Button><Button primary onClick={() => save()}><Check size={15} />Enregistrer</Button></div></form></Modal>}</div>;
}

function ProductsPage({ data, query, mutate, canCreate }: { data: StoreData; query: string; mutate: (fn: (draft: StoreData) => void, message?: string) => void; canCreate: boolean }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', sku: '', category: 'Divers', stock: '0', threshold: '0', price: '0' });
  const products = data.products.filter(item => `${item.name} ${item.sku} ${item.category}`.toLowerCase().includes(query.toLowerCase()));
  const save = () => {
    if (!form.name.trim() || !form.sku.trim()) return;
    mutate(draft => draft.products.unshift({ id: uid('product'), name: form.name.trim(), sku: form.sku.trim(), category: form.category.trim() || 'Divers', stock: Number(form.stock) || 0, threshold: Number(form.threshold) || 0, price: Number(form.price) || 0 }), 'Produit ajouté au catalogue.');
    setForm({ name: '', sku: '', category: 'Divers', stock: '0', threshold: '0', price: '0' }); setModal(false);
  };
  return <div className="space-y-5"><Panel title="Produits & stock" description="Le catalogue commercial s’appuie sur le stock partagé de l’entreprise." action={canCreate ? <Button primary onClick={() => setModal(true)}><Plus size={15} />Nouveau produit</Button> : undefined}><div className="grid gap-3 sm:grid-cols-3"><Metric label="Références" value={String(data.products.length)} detail="Catalogue actif" icon={Boxes} /><Metric label="Unités en stock" value={String(data.products.reduce((sum, item) => sum + item.stock, 0))} detail="Toutes catégories" icon={Package} /><Metric label="Sous seuil" value={String(data.products.filter(item => item.stock <= item.threshold).length)} detail="À réapprovisionner" icon={Archive} warning /></div></Panel><Panel title="Catalogue produits"><DataTable headers={['Produit', 'SKU', 'Catégorie', 'Stock', 'Prix de vente', 'État']} rows={products.map(product => [<strong key={product.id}>{product.name}</strong>, product.sku, product.category, <span className={product.stock <= product.threshold ? 'font-bold text-[hsl(var(--destructive))]' : ''}>{product.stock}</span>, money(product.price), <StatusBadge status={product.stock <= product.threshold ? 'EN ATTENTE' : 'ACTIF'} />])} /></Panel>{modal && <Modal title="Ajouter un produit" onClose={() => setModal(false)}><div className="grid gap-4 sm:grid-cols-2"><Field label="Nom du produit" value={form.name} onChange={value => setForm(current => ({ ...current, name: value }))} /><Field label="Référence SKU" value={form.sku} onChange={value => setForm(current => ({ ...current, sku: value }))} /><Field label="Catégorie" value={form.category} onChange={value => setForm(current => ({ ...current, category: value }))} /><Field label="Stock initial" value={form.stock} onChange={value => setForm(current => ({ ...current, stock: value }))} type="number" /><Field label="Seuil d’alerte" value={form.threshold} onChange={value => setForm(current => ({ ...current, threshold: value }))} type="number" /><Field label="Prix de vente" value={form.price} onChange={value => setForm(current => ({ ...current, price: value }))} type="number" /></div><div className="mt-5 flex justify-end gap-2"><Button onClick={() => setModal(false)}>Annuler</Button><Button primary onClick={save}><Check size={15} />Ajouter</Button></div></Modal>}</div>;
}

function ClientsPage({ state, query, canCreate, onUpdate }: { state: CommerceState; query: string; canCreate: boolean; onUpdate: (fn: (draft: CommerceState) => void, message?: string) => void }) {
  const [modal, setModal] = useState(false); const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });
  const clients = state.clients.filter(client => `${client.name} ${client.phone} ${client.email}`.toLowerCase().includes(query.toLowerCase()));
  const save = () => { if (!form.name.trim()) return; onUpdate(draft => draft.clients.unshift({ id: uid('client'), ...form, name: form.name.trim(), balance: 0 }), 'Client ajouté.'); setForm({ name: '', phone: '', email: '', address: '' }); setModal(false); };
  return <div className="space-y-5"><Panel title="Clients" description="Retrouvez vos clients, leurs coordonnées et leurs encours." action={canCreate ? <Button primary onClick={() => setModal(true)}><Plus size={15} />Nouveau client</Button> : undefined}><div className="grid gap-3 sm:grid-cols-3"><Metric label="Clients actifs" value={String(state.clients.length)} detail="Fiches commerciales" icon={Users} /><Metric label="Clients à crédit" value={String(state.credits.filter(item => item.status === 'EN COURS').length)} detail="Suivi des règlements" icon={CreditCard} warning /><Metric label="Encours total" value={money(state.credits.reduce((sum, item) => sum + Math.max(0, item.amount - item.paid), 0))} detail="À recouvrer" icon={CircleDollarSign} /></div></Panel><Panel title="Répertoire clients"><DataTable headers={['Client', 'Téléphone', 'Email', 'Localisation', 'Encours']} rows={clients.map(client => [<strong key={client.id}>{client.name}</strong>, client.phone || '—', client.email || '—', client.address || '—', money(client.balance)])} /></Panel>{modal && <Modal title="Nouveau client" onClose={() => setModal(false)}><div className="grid gap-4 sm:grid-cols-2"><Field label="Nom du client" value={form.name} onChange={value => setForm(current => ({ ...current, name: value }))} /><Field label="Téléphone" value={form.phone} onChange={value => setForm(current => ({ ...current, phone: value }))} /><Field label="Email" value={form.email} onChange={value => setForm(current => ({ ...current, email: value }))} type="email" /><Field label="Adresse" value={form.address} onChange={value => setForm(current => ({ ...current, address: value }))} /></div><div className="mt-5 flex justify-end gap-2"><Button onClick={() => setModal(false)}>Annuler</Button><Button primary onClick={save}>Ajouter le client</Button></div></Modal>}</div>;
}

function SuppliersPage({ data, query, canCreate, mutate }: { data: StoreData; query: string; canCreate: boolean; mutate: (fn: (draft: StoreData) => void, message?: string) => void }) {
  const suppliers = data.supplierRecords.filter(item => `${item.name} ${item.contact} ${item.category}`.toLowerCase().includes(query.toLowerCase()));
  const [modal, setModal] = useState(false); const [form, setForm] = useState({ name: '', contact: '', phone: '', category: 'Divers' });
  const save = () => { if (!form.name.trim()) return; mutate(draft => draft.supplierRecords.unshift({ id: uid('supplier'), name: form.name.trim(), contact: form.contact.trim(), phone: form.phone.trim(), category: form.category.trim() || 'Divers', score: 0, status: 'ACTIF' }), 'Fournisseur ajouté.'); setForm({ name: '', contact: '', phone: '', category: 'Divers' }); setModal(false); };
  return <div className="space-y-5"><Panel title="Fournisseurs" description="Pilotez le référentiel et la qualité de vos partenaires d’approvisionnement." action={canCreate ? <Button primary onClick={() => setModal(true)}><Plus size={15} />Ajouter</Button> : undefined}><div className="grid gap-3 sm:grid-cols-3"><Metric label="Partenaires actifs" value={String(suppliers.length)} detail="Référentiel entreprise" icon={Store} /><Metric label="Note moyenne" value={`${suppliers.length ? Math.round(suppliers.reduce((sum, item) => sum + item.score, 0) / suppliers.length) : 0}/100`} detail="Évaluation fournisseur" icon={BarChart3} accent /><Metric label="Commandes ouvertes" value={String(data.purchaseOrders.filter(item => item.status !== 'VALIDÉ').length)} detail="À suivre" icon={ClipboardList} /></div></Panel><Panel title="Référentiel fournisseurs"><DataTable headers={['Fournisseur', 'Contact', 'Téléphone', 'Catégorie', 'Score', 'Statut']} rows={suppliers.map(item => [<strong key={item.id}>{item.name}</strong>, item.contact, item.phone, item.category, <span className="font-bold">{item.score}/100</span>, <StatusBadge status={item.status} />])} /></Panel>{modal && <Modal title="Ajouter un fournisseur" onClose={() => setModal(false)}><div className="grid gap-4 sm:grid-cols-2"><Field label="Nom du fournisseur" value={form.name} onChange={value => setForm(current => ({ ...current, name: value }))} /><Field label="Contact" value={form.contact} onChange={value => setForm(current => ({ ...current, contact: value }))} /><Field label="Téléphone" value={form.phone} onChange={value => setForm(current => ({ ...current, phone: value }))} /><Field label="Catégorie" value={form.category} onChange={value => setForm(current => ({ ...current, category: value }))} /></div><div className="mt-5 flex justify-end gap-2"><Button onClick={() => setModal(false)}>Annuler</Button><Button primary onClick={save}>Ajouter le fournisseur</Button></div></Modal>}</div>;
}

function PurchasesPage({ data, query, canCreate, mutate }: { data: StoreData; query: string; canCreate: boolean; mutate: (fn: (draft: StoreData) => void, message?: string) => void }) {
  const orders = data.purchaseOrders.filter(item => `${item.reference} ${item.supplier} ${item.subject}`.toLowerCase().includes(query.toLowerCase()));
  const [modal, setModal] = useState(false); const [form, setForm] = useState({ supplier: '', subject: '', amount: '' });
  const save = () => { if (!form.supplier.trim() || !form.subject.trim() || !form.amount) return; mutate(draft => draft.purchaseOrders.unshift({ id: uid('purchase'), reference: `BC-${Date.now().toString().slice(-6)}`, supplier: form.supplier.trim(), subject: form.subject.trim(), amount: Number(form.amount), date: 'À l’instant', status: 'BROUILLON' }), 'Commande d’achat enregistrée.'); setForm({ supplier: '', subject: '', amount: '' }); setModal(false); };
  return <div className="space-y-5"><Panel title="Achats" description="Suivez les commandes fournisseurs et les réassorts reliés au stock." action={canCreate ? <Button primary onClick={() => setModal(true)}><Plus size={15} />Nouvel achat</Button> : undefined}><div className="grid gap-3 sm:grid-cols-3"><Metric label="Commandes" value={String(data.purchaseOrders.length)} detail="Sur la période" icon={ClipboardList} /><Metric label="Montant engagé" value={money(data.purchaseOrders.reduce((sum, item) => sum + item.amount, 0))} detail="Commandes affichées" icon={CircleDollarSign} accent /><Metric label="En attente" value={String(data.purchaseOrders.filter(item => item.status === 'EN ATTENTE').length)} detail="Nécessitent un suivi" icon={RefreshCw} warning /></div></Panel><Panel title="Commandes fournisseurs"><DataTable headers={['Référence', 'Fournisseur', 'Objet', 'Montant', 'Date', 'Statut']} rows={orders.map(item => [<strong key={item.id}>{item.reference}</strong>, item.supplier, item.subject, money(item.amount), item.date, <StatusBadge key={`${item.id}-status`} status={item.status} />])} /></Panel>{modal && <Modal title="Nouvel achat" onClose={() => setModal(false)}><div className="grid gap-4 sm:grid-cols-2"><Field label="Fournisseur" value={form.supplier} onChange={value => setForm(current => ({ ...current, supplier: value }))} /><Field label="Objet de la commande" value={form.subject} onChange={value => setForm(current => ({ ...current, subject: value }))} /><Field label="Montant estimé" value={form.amount} onChange={value => setForm(current => ({ ...current, amount: value }))} type="number" /></div><div className="mt-5 flex justify-end gap-2"><Button onClick={() => setModal(false)}>Annuler</Button><Button primary onClick={save}>Enregistrer la commande</Button></div></Modal>}</div>;
}

function ExpensesPage({ state, query, canCreate, onUpdate }: { state: CommerceState; query: string; canCreate: boolean; onUpdate: (fn: (draft: CommerceState) => void, message?: string) => void }) {
  const [modal, setModal] = useState(false); const [form, setForm] = useState({ label: '', category: 'Fonctionnement', amount: '', account: state.settings.defaultCash });
  const expenses = state.expenses.filter(item => `${item.label} ${item.category} ${item.account}`.toLowerCase().includes(query.toLowerCase()));
  const save = () => { if (!form.label.trim() || !form.amount || Number(form.amount) <= 0) return; onUpdate(draft => draft.expenses.unshift({ id: uid('expense'), label: form.label.trim(), category: form.category, amount: Number(form.amount), date: 'À l’instant', account: form.account }), 'Dépense enregistrée.'); setModal(false); setForm({ label: '', category: 'Fonctionnement', amount: '', account: state.settings.defaultCash }); };
  return <div className="space-y-5"><Panel title="Dépenses" description="Enregistrez les sorties de trésorerie et suivez leur répartition." action={canCreate ? <Button primary onClick={() => setModal(true)}><Plus size={15} />Nouvelle dépense</Button> : undefined}><div className="grid gap-3 sm:grid-cols-3"><Metric label="Total dépenses" value={money(state.expenses.reduce((sum, item) => sum + item.amount, 0))} detail="Dépenses enregistrées" icon={ArrowDownToLine} warning /><Metric label="Opérations" value={String(state.expenses.length)} detail="Lignes comptabilisées" icon={FileText} /><Metric label="Poste principal" value={state.expenses[0]?.category ?? '—'} detail="Dernière catégorie" icon={Tags} /></div></Panel><Panel title="Journal des dépenses"><DataTable headers={['Libellé', 'Catégorie', 'Compte', 'Montant', 'Date']} rows={expenses.map(item => [<strong key={item.id}>{item.label}</strong>, item.category, item.account, money(item.amount), item.date])} /></Panel>{modal && <Modal title="Nouvelle dépense" onClose={() => setModal(false)}><div className="grid gap-4 sm:grid-cols-2"><Field label="Libellé" value={form.label} onChange={value => setForm(current => ({ ...current, label: value }))} /><Field label="Catégorie" value={form.category} onChange={value => setForm(current => ({ ...current, category: value }))} /><Field label="Montant" value={form.amount} onChange={value => setForm(current => ({ ...current, amount: value }))} type="number" /><Field label="Compte de caisse" value={form.account} onChange={value => setForm(current => ({ ...current, account: value }))} /></div><div className="mt-5 flex justify-end gap-2"><Button onClick={() => setModal(false)}>Annuler</Button><Button primary onClick={save}>Enregistrer la dépense</Button></div></Modal>}</div>;
}

function CashPage({ state, query, canCreate, onUpdate }: { state: CommerceState; query: string; canCreate: boolean; onUpdate: (fn: (draft: CommerceState) => void, message?: string) => void }) {
  const accounts = state.cashAccounts.filter(item => `${item.name} ${item.responsible}`.toLowerCase().includes(query.toLowerCase()));
  const [modal, setModal] = useState(false); const [name, setName] = useState('');
  const save = () => { if (!name.trim()) return; onUpdate(draft => draft.cashAccounts.push({ id: uid('cash'), name: name.trim(), balance: 0, responsible: 'À désigner', active: true }), 'Compte de caisse créé.'); setName(''); setModal(false); };
  return <div className="space-y-5"><Panel title="Comptes de caisse" description="Visualisez les liquidités disponibles par compte et leur responsable." action={canCreate ? <Button primary onClick={() => setModal(true)}><Plus size={15} />Nouveau compte</Button> : undefined}><div className="grid gap-3 sm:grid-cols-3"><Metric label="Solde total" value={money(state.cashAccounts.reduce((sum, item) => sum + item.balance, 0))} detail="Tous comptes actifs" icon={WalletCards} accent /><Metric label="Comptes actifs" value={String(state.cashAccounts.filter(item => item.active).length)} detail="Trésorerie suivie" icon={Building2} /><Metric label="Dernière caisse" value={state.cashAccounts[0]?.name ?? '—'} detail="Compte par défaut" icon={CircleDollarSign} /></div></Panel><Panel title="Comptes"><DataTable headers={['Compte', 'Responsable', 'Solde', 'État']} rows={accounts.map(item => [<strong key={item.id}>{item.name}</strong>, item.responsible, money(item.balance), <StatusBadge status={item.active ? 'ACTIF' : 'ARCHIVÉ'} />])} /></Panel>{modal && <Modal title="Nouveau compte de caisse" onClose={() => setModal(false)}><Field label="Nom du compte" value={name} onChange={setName} placeholder="Ex. Caisse boutique" /><div className="mt-5 flex justify-end gap-2"><Button onClick={() => setModal(false)}>Annuler</Button><Button primary onClick={save}>Créer le compte</Button></div></Modal>}</div>;
}

function CreditPage({ state, query, canModify, onUpdate }: { state: CommerceState; query: string; canModify: boolean; onUpdate: (fn: (draft: CommerceState) => void, message?: string) => void }) {
  const { confirm } = useAppDialog();
  const credits = state.credits.filter(item => `${item.client} ${item.reference} ${item.status}`.toLowerCase().includes(query.toLowerCase()));
  const settle = async (credit: Credit) => { if (!await confirm({ title: 'Confirmer ce règlement ?', description: `Le crédit ${credit.reference} sera marqué comme réglé.`, confirmLabel: 'Confirmer' })) return; onUpdate(draft => { const item = draft.credits.find(candidate => candidate.id === credit.id); if (item) { item.paid = item.amount; item.status = 'RÉGLÉ'; } }, 'Règlement client enregistré.'); };
  return <div className="space-y-5"><Panel title="Crédit clients" description="Suivez les ventes à terme et les règlements reçus." ><div className="grid gap-3 sm:grid-cols-3"><Metric label="Créances ouvertes" value={money(state.credits.filter(item => item.status === 'EN COURS').reduce((sum, item) => sum + item.amount - item.paid, 0))} detail="Reste à encaisser" icon={CreditCard} warning /><Metric label="Dossiers ouverts" value={String(state.credits.filter(item => item.status === 'EN COURS').length)} detail="Clients concernés" icon={Users} /><Metric label="Règlements complets" value={String(state.credits.filter(item => item.status === 'RÉGLÉ').length)} detail="Dossiers soldés" icon={Check} accent /></div></Panel><Panel title="Portefeuille crédit"><DataTable headers={['Référence', 'Client', 'Montant', 'Déjà payé', 'Échéance', 'Statut', 'Action']} rows={credits.map(item => [<strong key={item.id}>{item.reference}</strong>, item.client, money(item.amount), money(item.paid), item.dueDate, <StatusBadge status={item.status === 'RÉGLÉ' ? 'CONFIRMÉ' : 'EN ATTENTE'} />, item.status === 'EN COURS' && canModify ? <button type="button" onClick={() => settle(item)} className="rounded-lg bg-[hsl(var(--primary))] px-2.5 py-1.5 text-[10px] font-bold text-[hsl(var(--primary-foreground))]">Enregistrer règlement</button> : '—'])} /></Panel></div>;
}

function InvoicesPage({ data, query, onToast }: { data: StoreData; query: string; onToast: (message: string) => void }) {
  const invoices = data.sales.filter(item => `${item.reference} ${item.client}`.toLowerCase().includes(query.toLowerCase()));
  const print = (sale: Sale) => { onToast(`Reçu ${sale.reference} prêt à imprimer.`); window.setTimeout(() => window.print(), 100); };
  return <div className="space-y-5"><Panel title="Factures & reçus" description="Générez rapidement une pièce pour chaque vente enregistrée." action={<Button onClick={() => onToast('Sélectionnez une vente pour imprimer son reçu.') }><FileDown size={15} />Exporter</Button>}><div className="grid gap-3 sm:grid-cols-3"><Metric label="Pièces commerciales" value={String(invoices.length)} detail="Ventes enregistrées" icon={FileCheck2} /><Metric label="Validées" value={String(invoices.filter(item => item.status === 'VALIDÉ').length)} detail="Prêtes à remettre" icon={Check} accent /><Metric label="En brouillon" value={String(invoices.filter(item => item.status === 'BROUILLON').length)} detail="À finaliser" icon={FileText} /></div></Panel><Panel title="Factures et reçus"><DataTable headers={['Référence', 'Client', 'Montant', 'Date', 'Statut', 'Document']} rows={invoices.map(item => [<strong key={item.id}>{`FAC-${item.reference.replace('VTE-', '')}`}</strong>, item.client, money(item.amount), item.date, <StatusBadge key={`${item.id}-status`} status={item.status} />, <button type="button" onClick={() => print(item)} className="rounded-lg border px-2.5 py-1.5 text-[10px] font-bold hover:bg-[hsl(var(--muted))]">Imprimer le reçu</button>])} /></Panel></div>;
}

function ReturnsPage({ state, query, canCreate, canModify, onUpdate }: { state: CommerceState; query: string; canCreate: boolean; canModify: boolean; onUpdate: (fn: (draft: CommerceState) => void, message?: string) => void }) {
  const { confirm } = useAppDialog();
  const [modal, setModal] = useState(false); const [form, setForm] = useState({ partner: '', amount: '', type: 'RETOUR CLIENT' as ReturnRecord['type'] });
  const returns = state.returns.filter(item => `${item.reference} ${item.partner} ${item.type}`.toLowerCase().includes(query.toLowerCase()));
  const save = () => { if (!form.partner.trim() || !form.amount) return; onUpdate(draft => draft.returns.unshift({ id: uid('return'), reference: `AVR-${Date.now().toString().slice(-6)}`, partner: form.partner.trim(), amount: Number(form.amount), type: form.type, date: 'À l’instant', status: 'BROUILLON' }), 'Retour enregistré en brouillon.'); setModal(false); };
  const confirmReturn = async (record: ReturnRecord) => { if (!await confirm({ title: 'Confirmer ce retour ?', description: `Le dossier ${record.reference} sera confirmé.`, confirmLabel: 'Confirmer' })) return; onUpdate(draft => { const item = draft.returns.find(candidate => candidate.id === record.id); if (item) item.status = 'CONFIRMÉ'; }, 'Retour confirmé.'); };
  return <div className="space-y-5"><Panel title="Retours & avoirs" description="Centralisez les retours clients et les avoirs fournisseurs." action={canCreate ? <Button primary onClick={() => setModal(true)}><Plus size={15} />Nouveau retour</Button> : undefined}><div className="grid gap-3 sm:grid-cols-3"><Metric label="Dossiers" value={String(state.returns.length)} detail="Retours enregistrés" icon={ArrowUpRight} /><Metric label="Montant total" value={money(state.returns.reduce((sum, item) => sum + item.amount, 0))} detail="Avoirs compris" icon={CircleDollarSign} warning /><Metric label="À confirmer" value={String(state.returns.filter(item => item.status === 'BROUILLON').length)} detail="Contrôle requis" icon={ClipboardList} /></div></Panel><Panel title="Historique des retours"><DataTable headers={['Référence', 'Type', 'Partenaire', 'Montant', 'Date', 'Statut', 'Action']} rows={returns.map(item => [<strong key={item.id}>{item.reference}</strong>, item.type, item.partner, money(item.amount), item.date, <StatusBadge key={`${item.id}-status`} status={item.status} />, item.status === 'BROUILLON' && canModify ? <button type="button" onClick={() => confirmReturn(item)} className="rounded-lg bg-[hsl(var(--primary))] px-2.5 py-1.5 text-[10px] font-bold text-[hsl(var(--primary-foreground))]">Confirmer</button> : '—'])} /></Panel></div>;
}

function ReportsPage({ data, state }: { data: StoreData; state: CommerceState }) {
  const exportCsv = () => { const rows = [['Indicateur', 'Valeur'], ['CA validé', String(data.sales.filter(item => item.status === 'VALIDÉ').reduce((sum, item) => sum + item.amount, 0))], ['Stock', String(data.products.reduce((sum, item) => sum + item.stock * item.price, 0))], ['Dépenses', String(state.expenses.reduce((sum, item) => sum + item.amount, 0))]]; const csv = rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(';')).join('\n'); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv' })); link.download = 'rapport-gestion-commerciale.csv'; link.click(); URL.revokeObjectURL(link.href); };
  return <div className="space-y-5"><Panel title="Rapports" description="Des indicateurs simples pour décider plus vite." action={<Button primary onClick={exportCsv}><FileDown size={15} />Exporter CSV</Button>}><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="CA validé" value={money(data.sales.filter(item => item.status === 'VALIDÉ').reduce((sum, item) => sum + item.amount, 0))} detail="Ventes confirmées" icon={CircleDollarSign} accent /><Metric label="Stock valorisé" value={money(data.products.reduce((sum, item) => sum + item.stock * item.price, 0))} detail="Au prix de vente" icon={Boxes} /><Metric label="Dépenses" value={money(state.expenses.reduce((sum, item) => sum + item.amount, 0))} detail="Sorties enregistrées" icon={ArrowDownToLine} warning /><Metric label="Commandes" value={String(data.purchaseOrders.length)} detail="Fournisseurs" icon={ClipboardList} /></div></Panel><div className="grid gap-5 lg:grid-cols-2"><Panel title="Ventes par statut"><DataTable headers={['Statut', 'Nombre', 'Montant']} rows={(['VALIDÉ', 'BROUILLON', 'EN ATTENTE'] as Status[]).map(status => [<StatusBadge key={status} status={status} />, String(data.sales.filter(item => item.status === status).length), money(data.sales.filter(item => item.status === status).reduce((sum, item) => sum + item.amount, 0))])} /></Panel><Panel title="Top produits"><DataTable headers={['Produit', 'Stock', 'Valeur']} rows={data.products.slice().sort((a, b) => b.stock * b.price - a.stock * a.price).slice(0, 5).map(item => [<strong key={item.id}>{item.name}</strong>, String(item.stock), money(item.stock * item.price)])} /></Panel></div></div>;
}

function NotificationsPage({ data, mutate, query, companyId }: { data: StoreData; mutate: (fn: (draft: StoreData) => void, message?: string) => void; query: string; companyId: string }) {
  const notifications = getVisibleNotifications(data.notifications, { isAdmin: false, companyId }).filter(item => `${item.title} ${item.text}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-5"><Panel title="Notifications" description="Les alertes commerciales et opérationnelles de votre entreprise."><div className="space-y-3">{notifications.map(item => <div key={item.id} className={`flex items-start justify-between gap-4 rounded-xl border p-4 ${item.read ? '' : 'border-[hsl(var(--primary)/.35)] bg-[hsl(var(--primary)/.05)]'}`}><div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--accent)/.2)]"><Bell size={16} /></span><div><p className="text-sm font-bold">{item.title}</p><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{item.text}</p><p className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">{item.date}</p></div></div>{!item.read && <button type="button" onClick={() => mutate(draft => { const notification = draft.notifications.find(candidate => candidate.id === item.id); if (notification) notification.read = true; }, 'Notification marquée comme lue.')} className="shrink-0 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold">Marquer lue</button>}</div>)}{notifications.length === 0 && <Empty text="Aucune notification trouvée." />}</div></Panel></div>;
}

function ActivityPage({ data, query }: { data: StoreData; query: string }) {
  const activities = data.activities.filter(item => `${item.user} ${item.action} ${item.module} ${item.object}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-5"><Panel title="Journal d’activité" description="Chaque opération importante reste traçable dans l’entreprise."><DataTable headers={['Utilisateur', 'Action', 'Module', 'Objet', 'Date', 'Statut']} rows={activities.map(item => [<strong key={item.id}>{item.user}</strong>, item.action, item.module, item.object, item.date, <StatusBadge key={`${item.id}-status`} status={item.status} />])} /></Panel></div>;
}

function TeamPage({ data, query, canModify, onToast, onNavigate }: { data: StoreData; query: string; canModify: boolean; onToast: (message: string) => void; onNavigate?: (path: string) => void }) {
  const employees = data.employees.filter(item => `${item.firstName} ${item.lastName} ${item.email} ${item.role}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-5"><Panel title="Équipe & droits" description="Consultez les collaborateurs et les rôles qui leur sont attribués." action={canModify ? <Button primary onClick={() => onNavigate ? onNavigate('/kora/organisation?tab=roles') : onToast('Les rôles se configurent dans Organisation & accès.')}><Settings size={15} />Configurer les droits</Button> : undefined}><div className="grid gap-3 sm:grid-cols-3"><Metric label="Collaborateurs" value={String(employees.length)} detail="Dans cette entreprise" icon={Users} /><Metric label="Rôles actifs" value={String(new Set(employees.map(item => item.role)).size)} detail="Profils utilisés" icon={BriefcaseBusiness} /><Metric label="Accès commerciaux" value={String(employees.filter(item => item.role.toLowerCase().includes('vendeur') || item.role.toLowerCase().includes('manager')).length)} detail="Rôles à surveiller" icon={UserRound} /></div></Panel><Panel title="Membres de l’équipe"><DataTable headers={['Collaborateur', 'Email', 'Poste', 'Service', 'Rôle', 'Statut']} rows={employees.map(item => [<strong key={item.id}>{item.firstName} {item.lastName}</strong>, item.email, item.position, item.department || '—', item.role, <StatusBadge key={`${item.id}-status`} status={item.status} />])} /></Panel></div>;
}

function SettingsPage({ state, canModify, onUpdate }: { state: CommerceState; canModify: boolean; onUpdate: (fn: (draft: CommerceState) => void, message?: string) => void }) {
  const settings = state.settings;
  return <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><Panel title="Paramètres commerciaux" description="Ces préférences s’appliquent à cette entreprise et à ses reçus."><div className="space-y-5"><Field label="Taux de taxe par défaut (%)" value={settings.taxRate} onChange={value => onUpdate(draft => { draft.settings.taxRate = value; }, 'Taux de taxe mis à jour.')} type="number" readOnly={!canModify} /><Field label="Compte de caisse par défaut" value={settings.defaultCash} onChange={value => onUpdate(draft => { draft.settings.defaultCash = value; }, 'Compte par défaut mis à jour.')} readOnly={!canModify} /><Field label="Pied de reçu" value={settings.receiptFooter} onChange={value => onUpdate(draft => { draft.settings.receiptFooter = value; }, 'Pied de reçu mis à jour.')} readOnly={!canModify} /><label className="flex items-center justify-between gap-4 rounded-xl border p-4 text-sm font-bold"><span><span className="block">Alertes de stock faible</span><span className="mt-1 block text-[11px] font-normal text-[hsl(var(--muted-foreground))]">Afficher les produits sous leur seuil sur le tableau de bord.</span></span><input type="checkbox" disabled={!canModify} checked={settings.lowStockAlerts} onChange={event => onUpdate(draft => { draft.settings.lowStockAlerts = event.target.checked; }, 'Préférence d’alerte mise à jour.')} /></label></div></Panel><Panel title="Bonnes pratiques" action={<FileText size={18} className="text-[hsl(var(--primary))]" />}><div className="space-y-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><p>Validez les ventes après contrôle du client et du montant. La validation déclenche la mise à jour du stock.</p><p>Les actions sensibles demandent une confirmation et les opérations sont conservées dans le journal de l’entreprise.</p><p>Les droits d’équipe se gèrent depuis le parcours Organisation de MAXIMUS.</p></div></Panel></div>;
}

function Panel({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return <section className="surface-panel card-surface overflow-hidden rounded-2xl"><div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-bold">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{description}</p>}</div>{action}</div><div className="p-5">{children}</div></section>;
}
function Metric({ label, value, detail, icon: Icon, accent = false, warning = false }: { label: string; value: string; detail: string; icon: Icon; accent?: boolean; warning?: boolean }) {
  return <div className={`metric-card card-surface rounded-2xl p-5 ${accent ? 'border-[hsl(var(--primary)/.25)]' : ''}`}><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${warning ? 'bg-[hsl(var(--accent)/.2)]' : accent ? 'bg-[hsl(var(--primary)/.11)] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}><Icon size={17} /></span><p className="mt-5 text-xs text-[hsl(var(--muted-foreground))]">{label}</p><p className="mt-1 text-2xl font-bold tracking-[-.05em]">{value}</p><p className="mt-2 text-[11px] text-[hsl(var(--muted-foreground))]">{detail}</p></div>;
}
function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) { return <div className="table-scroll"><table className="data-table w-full min-w-[720px] text-left text-sm"><thead className="bg-[hsl(var(--muted)/.55)] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]"><tr>{headers.map(header => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead><tbody className="divide-y">{rows.map((row, index) => <tr key={index} className="hover:bg-[hsl(var(--muted)/.35)]">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3">{cell}</td>)}</tr>)}</tbody></table></div>; }
function StatusBadge({ status }: { status: Status }) { return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${status === 'VALIDÉ' || status === 'CONFIRMÉ' || status === 'ACTIF' ? 'bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]' : status === 'REFUSÉ' || status === 'SUSPENDU' ? 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]' : 'bg-[hsl(var(--accent)/.2)] text-[hsl(var(--foreground))]'}`}>{status}</span>; }
function Button({ children, onClick, primary = false }: { children: ReactNode; onClick: () => void; primary?: boolean }) { return <button type="button" onClick={onClick} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-bold transition hover:-translate-y-0.5 ${primary ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]'}`}>{children}</button>; }
function Field({ label, value, onChange, type = 'text', placeholder, help, readOnly = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; help?: string; readOnly?: boolean }) { return <label className="block text-xs font-bold">{label}<input type={type} value={value} placeholder={placeholder} readOnly={readOnly} onChange={event => onChange(event.target.value)} className={`mt-2 w-full rounded-lg border bg-transparent px-3 py-2.5 text-sm font-normal outline-none focus:border-[hsl(var(--primary))] ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`} /><span className="mt-1 block text-[10px] font-normal leading-4 text-[hsl(var(--muted-foreground))]">{help ?? `Saisissez ${label.toLowerCase()}.`}</span></label>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) { return <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--foreground)/.35)] p-4 backdrop-blur-sm"><div className="modal-panel card-surface max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6"><div className="modal-header mb-6 flex items-center justify-between"><h2 className="text-xl font-bold">{title}</h2><button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-[hsl(var(--muted))]"><X size={18} /></button></div><div className="modal-body">{children}</div></div></div>; }
function Empty({ text }: { text: string }) { return <div className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">{text}</div>; }