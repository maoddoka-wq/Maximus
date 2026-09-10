import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Archive,
  ArrowUpRight,
  ArrowDownToLine,
  Clock3,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Copy,
  House,
  LayoutDashboard,
  Megaphone,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShoppingBag,
  Store,
  Tags,
  Truck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  createEcommerceApi,
  type EcommerceBootstrap,
  type EcommerceCategory,
  type EcommerceDeliveryRequest,
  type EcommerceDeliveryRequestStatus,
  type EcommerceDomain,
  type EcommerceOrder,
  type EcommerceOrderStatus,
  type EcommerceProduct,
  type EcommerceRental,
  type EcommerceRentalPeriod,
  type EcommerceRentalStatus,
  type EcommerceStore,
  type SellerWalletBootstrap,
} from '@/lib/ecommerce-api';
import { useQueryTab } from '@/lib/query-tab';
import { useAppDialog } from '@/components/confirm-dialog';
import { showAppToast } from '@/hooks/use-toast';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';

type EcommerceTab = 'dashboard' | 'catalogue' | 'categories' | 'commandes' | 'clients' | 'promotions' | 'location' | 'livraisons' | 'finances' | 'parametres';

const tabs: { id: EcommerceTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'catalogue', label: 'Catalogue', icon: Package },
  { id: 'categories', label: 'Catégories', icon: Tags },
  { id: 'commandes', label: 'Commandes', icon: ClipboardList },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'promotions', label: 'Promotions', icon: Megaphone },
  { id: 'location', label: 'Location', icon: House },
  { id: 'livraisons', label: 'Livraisons', icon: Truck },
  { id: 'finances', label: 'Finances & retraits', icon: Wallet },
  { id: 'parametres', label: 'Paramètres', icon: Settings },
];

const orderStatuses: EcommerceOrderStatus[] = ['NOUVELLE', 'CONFIRMÉE', 'EN PRÉPARATION', 'EXPÉDIÉE', 'LIVRÉE', 'ANNULÉE'];
const allowedNextStatuses = (status: EcommerceOrderStatus): EcommerceOrderStatus[] => ({
  'NOUVELLE': ['NOUVELLE', 'CONFIRMÉE', 'ANNULÉE'],
  'CONFIRMÉE': ['CONFIRMÉE', 'EN PRÉPARATION', 'ANNULÉE'],
  'EN PRÉPARATION': ['EN PRÉPARATION', 'EXPÉDIÉE', 'ANNULÉE'],
  'EXPÉDIÉE': ['EXPÉDIÉE', 'LIVRÉE'],
  'LIVRÉE': ['LIVRÉE'],
  'ANNULÉE': ['ANNULÉE'],
}[status] as EcommerceOrderStatus[]);
const money = (value: number, currency: EcommerceStore['currency'] = 'XOF') =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: currency === 'XOF' ? 0 : 2 }).format(value) + ` ${currency}`;
const dateLabel = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(parsed);
};
const slugify = (value: string) =>
  value.trim().toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function normalizeEcommerceBootstrap(value: EcommerceBootstrap, companyId: string): EcommerceBootstrap {
  const payload = value && typeof value === 'object' ? value : {} as EcommerceBootstrap;
  const orders = Array.isArray(payload.orders)
    ? payload.orders
        .filter(order => Boolean(order && typeof order === 'object'))
        .map(order => ({ ...order, items: Array.isArray(order.items) ? order.items : [] }))
    : [];

  return {
    ...payload,
    store: payload.store ?? {
      id: `store-${companyId || 'unknown'}`,
      companyId,
      slug: '',
      name: 'Votre boutique',
      description: '',
      status: 'DRAFT',
      currency: 'XOF',
      primaryColor: '#D69E2E',
      accentColor: '#172033',
      logoUrl: '',
    },
    domains: Array.isArray(payload.domains) ? payload.domains : [],
    categories: Array.isArray(payload.categories) ? payload.categories : [],
    products: Array.isArray(payload.products) ? payload.products : [],
    rentals: Array.isArray(payload.rentals) ? payload.rentals : [],
    orders,
    deliveryRequests: Array.isArray(payload.deliveryRequests) ? payload.deliveryRequests : [],
  };
}

type ProductForm = {
  name: string;
  slug: string;
  sku: string;
  description: string;
  category: string;
  categoryId: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  productType: 'SALE' | 'DIGITAL';
  imageUrl: string;
  imageFile: File | null;
  digitalFile: File | null;
  featured: boolean;
  status: EcommerceProduct['status'];
};

type RentalForm = {
  name: string;
  description: string;
  category: string;
  categoryId: string;
  imageFile: File | null;
  price: string;
  billingUnit: EcommerceRentalPeriod;
  availability: string;
  status: EcommerceRentalStatus;
};

const blankRental: RentalForm = {
  name: '',
  description: '',
  category: 'Général',
  categoryId: '',
  imageFile: null,
  price: '',
  billingUnit: 'JOUR',
  availability: '0',
  status: 'PUBLISHED',
};

const blankProduct: ProductForm = {
  name: '',
  slug: '',
  sku: '',
  description: '',
  category: 'Divers',
  categoryId: '',
  price: '',
  compareAtPrice: '',
  stock: '0',
  productType: 'SALE',
  imageUrl: '',
  imageFile: null,
  digitalFile: null,
  featured: false,
  status: 'PUBLISHED',
};

export default function EcommerceModulePage({
  companyId,
  canCreate = true,
  canModify = true,
  allowedFeatureIds,
  singleModuleNavigation = false,
  preview = false,
}: {
  companyId: string;
  canCreate?: boolean;
  canModify?: boolean;
  allowedFeatureIds?: string[];
  singleModuleNavigation?: boolean;
  preview?: boolean;
}) {
  const [data, setData] = useState<EcommerceBootstrap | null>(null);
  const [walletData, setWalletData] = useState<SellerWalletBootstrap | null>(null);
  const visibleTabs = allowedFeatureIds ? tabs.filter(item => allowedFeatureIds.includes(item.id) || (item.id === 'categories' && allowedFeatureIds.includes('catalogue'))) : tabs;
  const visibleTabIds = visibleTabs.map(item => item.id);
  const [tab, setTab] = useQueryTab({ tabs: visibleTabIds, defaultTab: visibleTabIds[0] ?? 'dashboard' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState('');
  const api = createEcommerceApi(companyId);

  const load = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    if (preview) {
      setData({
        store: {
          id: `preview-store-${companyId || 'module'}`,
          companyId: companyId || 'module-preview',
          slug: 'aperçu-boutique',
          name: 'Aperçu boutique',
          description: 'Aperçu administratif sans données de production.',
          status: 'DRAFT',
          currency: 'XOF',
          primaryColor: '#D69E2E',
          accentColor: '#172033',
          logoUrl: '',
        },
        domains: [],
        categories: [],
        products: [],
        rentals: [],
        orders: [],
        deliveryRequests: [],
      });
      setWalletData(null);
      setError('');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const nextData = normalizeEcommerceBootstrap(await api.bootstrap(), companyId);
      setData(nextData);
      setWalletData(visibleTabIds.includes('finances') ? await api.wallet() : null);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger l’espace e-commerce.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, [companyId, preview]);
  useAutoRefresh(() => load(true), { enabled: !preview && Boolean(data), intervalMs: 30_000 });

  const run = async <T,>(action: () => Promise<T>, success: string, actionKey = 'action'): Promise<T | undefined> => {
    if (pendingAction) return undefined;
    setPendingAction(actionKey);
    try {
      const result = await action();
      await load(true);
      showAppToast(success, 'success');
      setError('');
      return result;
    } catch (cause) {
      showAppToast(cause instanceof Error ? cause.message : 'Opération impossible.', 'error');
      return undefined;
    } finally {
      setPendingAction('');
    }
  };

  if (loading) return <LoadingState />;
  if (!data) return <ErrorState message={error} onRetry={() => void load()} />;

  const store = data.store;
  const publicShopUrl = `/shop/${encodeURIComponent(store.slug || slugify(store.name) || 'boutique')}`;
  const navigate = (next: EcommerceTab) => setTab(next);

  return (
    <div className="space-y-5" data-testid="ecommerce-module">
      {error && <div className="flex items-center justify-between gap-3 rounded-xl border border-[hsl(var(--destructive)/.28)] bg-[hsl(var(--destructive)/.07)] px-4 py-3 text-sm text-[hsl(var(--destructive))]"><span>{error}</span><button type="button" aria-label="Fermer le message" onClick={() => setError('')}><X size={16} /></button></div>}
      <section className="rounded-2xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))]">
        <div className="grid min-w-0 gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:px-4">
          <div className="order-2 flex min-w-0 items-center gap-2 sm:order-1 sm:col-start-1">
            <a
              href={publicShopUrl}
              target="_blank"
              rel="noreferrer"
              data-testid="button-open-public-shop"
              title="Ouvrir la boutique publique"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[hsl(var(--sidebar-border))] px-3 py-2.5 text-xs font-bold text-[hsl(var(--sidebar-foreground)/.9)] hover:bg-[hsl(var(--sidebar-accent))]"
            >
              <ArrowUpRight size={14} />Ouvrir
            </a>
          </div>
          <div className="order-1 flex min-w-0 justify-center px-2 sm:order-2 sm:col-start-2">
            <span className="truncate text-center text-xl font-black tracking-[-.04em] text-white drop-shadow-sm sm:text-2xl lg:text-3xl">
              {store.name || 'Votre boutique'}
            </span>
          </div>
          <button type="button" onClick={() => void load(true)} className="order-3 inline-flex shrink-0 items-center justify-center gap-2 justify-self-end rounded-lg border border-[hsl(var(--sidebar-border))] px-3 py-2.5 text-xs font-bold text-[hsl(var(--sidebar-foreground)/.8)] hover:bg-[hsl(var(--sidebar-accent))] sm:col-start-3" title="Actualiser">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />Actualiser
          </button>
        </div>
      </section>

      {!singleModuleNavigation && <section className="rounded-2xl border bg-[hsl(var(--card))] p-2 shadow-sm">
        <nav aria-label="Fonctionnalités e-commerce" className="flex flex-wrap gap-1.5">
          {visibleTabs.map(item => {
            const Icon = item.icon;
            return <button key={item.id} type="button" data-testid={`ecommerce-tab-${item.id}`} onClick={() => navigate(item.id)} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${tab === item.id ? 'border-[hsl(var(--primary)/.3)] bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]' : 'border-transparent text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/.45)] hover:text-[hsl(var(--foreground))]'}`}><Icon size={15} />{item.label}</button>;
          })}
        </nav>
      </section>}

      {visibleTabs.length === 0 ? <Empty icon={ShoppingBag} title="Aucune fonctionnalité disponible" text="Votre rôle n’a pas encore reçu de fonctionnalité e-commerce." /> : <>
      {tab === 'dashboard' && <Dashboard data={data} onTab={navigate} />}
      {tab === 'catalogue' && <Catalogue data={data} canCreate={canCreate} canModify={canModify} run={run} />}
      {tab === 'categories' && <CategoryManager data={data} canCreate={canCreate} canModify={canModify} run={run} />}
      {tab === 'commandes' && <Orders data={data} canModify={canModify} run={run} />}
      {tab === 'clients' && <Clients data={data} />}
      {tab === 'promotions' && <Promotions />}
       {tab === 'location' && <RentalPanel data={data} canCreate={canCreate} canModify={canModify} run={run} />}
      {tab === 'livraisons' && <Deliveries data={data} canModify={canModify} run={run} />}
      {tab === 'finances' && walletData && <WalletPanel data={walletData} currency={store.currency} canModify={canModify} run={run} pendingAction={pendingAction} />}
      {tab === 'parametres' && <SettingsPanel store={store} domains={data.domains} canModify={canModify} run={run} />}
      </>}
    </div>
  );
}

function LoadingState() {
  return <div className="card-surface min-h-80 rounded-2xl p-5 sm:p-7" aria-label="Chargement de la boutique"><div className="h-3 w-36 animate-pulse rounded bg-[hsl(var(--muted))]" /><div className="mt-4 h-8 w-72 animate-pulse rounded bg-[hsl(var(--muted))]" /><div className="mt-3 h-4 max-w-xl animate-pulse rounded bg-[hsl(var(--muted)/.72)]" /><div className="mt-8 grid gap-3 sm:grid-cols-3"><div className="h-28 animate-pulse rounded-xl bg-[hsl(var(--muted))]" /><div className="h-28 animate-pulse rounded-xl bg-[hsl(var(--muted))]" /><div className="h-28 animate-pulse rounded-xl bg-[hsl(var(--muted))]" /></div><div className="mt-5 h-52 animate-pulse rounded-xl bg-[hsl(var(--muted)/.7)]" /></div>;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="card-surface rounded-2xl p-8"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]"><Store size={20} /></div><h2 className="mt-4 text-lg font-bold">La boutique n’est pas disponible</h2><p className="mt-2 max-w-lg text-sm leading-6 text-[hsl(var(--muted-foreground))]">{message || 'Une erreur inattendue empêche le chargement de cet espace.'}</p><button type="button" onClick={onRetry} className="btn mt-5 inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"><RefreshCw size={14} />Réessayer</button></div>;
}

function Dashboard({ data, onTab }: { data: EcommerceBootstrap; onTab: (tab: EcommerceTab) => void }) {
  const activeProducts = data.products.filter(product => product.status !== 'ARCHIVED');
  const published = activeProducts.filter(product => product.status === 'PUBLISHED').length;
  const pending = data.orders.filter(order => !['LIVRÉE', 'ANNULÉE'].includes(order.status)).length;
   const revenue = data.orders.filter(order => order.status !== 'ANNULÉE' && order.paymentStatus === 'PAID').reduce((sum, order) => sum + order.total, 0);
  const lowStock = activeProducts.filter(product => product.stock <= 5);
  return <div className="space-y-5 fade-up">
    <div className="mobile-kpi-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Chiffre d’affaires" value={money(revenue, data.store.currency)} detail="Commandes non annulées" icon={CircleDollarSign} accent />
      <Metric label="Commandes à traiter" value={String(pending)} detail="Dans le flux opérationnel" icon={ClipboardList} />
      <Metric label="Catalogue publié" value={`${published}/${activeProducts.length}`} detail="Références visibles en ligne" icon={ShoppingBag} />
      <Metric label="Stock à surveiller" value={String(lowStock.length)} detail="5 unités ou moins" icon={Package} warning={lowStock.length > 0} />
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <Panel title="Commandes récentes" description="Le dernier mouvement de votre boutique, au même endroit." action={<button type="button" onClick={() => onTab('commandes')} className="text-xs font-bold text-[hsl(var(--primary))]">Voir toutes les commandes <ChevronRight className="inline" size={14} /></button>}>
        {data.orders.length === 0 ? <Empty icon={ClipboardList} title="Pas encore de commande" text="Les commandes de votre boutique apparaîtront ici dès la première vente." action={<button type="button" onClick={() => onTab('catalogue')} className="text-xs font-bold text-[hsl(var(--primary))]">Vérifier le catalogue</button>} /> : <div className="divide-y">{data.orders.slice(0, 5).map(order => <OrderRow key={order.id} order={order} currency={data.store.currency} />)}</div>}
      </Panel>
      <Panel title="À surveiller" description="Les signaux qui méritent votre attention." action={<button type="button" onClick={() => onTab('catalogue')} className="text-xs font-bold text-[hsl(var(--primary))]">Catalogue <ChevronRight className="inline" size={14} /></button>}>
        <div className="space-y-3">
          {lowStock.length === 0 && <Empty icon={Check} title="Tout est sous contrôle" text="Aucune référence ne se trouve sous le seuil de surveillance." />}
          {lowStock.slice(0, 5).map(product => <div key={product.id} className="flex items-center gap-3 rounded-xl border border-[hsl(var(--accent)/.3)] bg-[hsl(var(--accent)/.08)] p-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--accent)/.2)] text-[hsl(var(--foreground))]"><Package size={16} /></span><div className="min-w-0"><p className="truncate text-sm font-bold">{product.name}</p><p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{product.stock} unité{product.stock > 1 ? 's' : ''} restante{product.stock > 1 ? 's' : ''}</p></div><span className="mono ml-auto text-xs font-bold">{product.sku}</span></div>)}
        </div>
        <div className="mt-5 rounded-xl border border-dashed p-4"><p className="mono text-[9px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Vitrine</p><p className="mt-2 text-sm font-bold">Votre boutique est {data.store.status === 'PUBLISHED' ? 'ouverte au public' : 'en préparation'}.</p><button type="button" onClick={() => onTab('parametres')} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[hsl(var(--primary))]">Gérer la vitrine <ArrowUpRight size={13} /></button></div>
      </Panel>
    </div>
    <Panel title="Performance du catalogue" description="Une lecture rapide de la couverture de votre assortiment.">
      <div className="grid gap-3 sm:grid-cols-3">
        <Insight label="Références actives" value={activeProducts.length} detail="Non archivées" />
        <Insight label="Produits vedettes" value={activeProducts.filter(product => product.featured).length} detail="Mis en avant" />
        <Insight label="Catégories" value={new Set(activeProducts.map(product => product.category)).size} detail="Dans le catalogue" />
      </div>
    </Panel>
  </div>;
}

function RentalPanel({ data, canCreate, canModify, run }: { data: EcommerceBootstrap; canCreate: boolean; canModify: boolean; run: (action: () => Promise<unknown>, success: string) => Promise<unknown | undefined> }) {
  const { confirm, alert } = useAppDialog();
  const [editing, setEditing] = useState<EcommerceRental | 'new' | null>(null);
  const [form, setForm] = useState<RentalForm>(blankRental);
  const rentals = data.rentals;
  const activeRentals = rentals.filter(rental => rental.status !== 'ARCHIVED');
  const open = (rental?: EcommerceRental) => {
    setEditing(rental ?? 'new');
    setForm(rental ? { name: rental.name, description: rental.description, category: rental.category, categoryId: rental.categoryId ?? '', imageFile: null, price: String(rental.price), billingUnit: rental.billingUnit, availability: String(rental.availability), status: rental.status } : blankRental);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const price = Number(form.price);
    const availability = Number(form.availability);
    if (!form.name.trim() || (!form.categoryId && !form.category.trim()) || !Number.isInteger(price) || price < 0 || !Number.isInteger(availability) || availability < 0) {
      await alert({ title: 'Informations incomplètes', description: 'Renseignez un nom, un tarif et une disponibilité valides.', confirmLabel: 'Compris' });
      return;
    }
    const category = data.categories.find(item => item.id === form.categoryId);
    const body = { name: form.name.trim(), description: form.description.trim(), category: category?.name ?? form.category.trim(), categoryId: form.categoryId || null, price, billingUnit: form.billingUnit, availability, status: form.status };
    const result = editing === 'new'
      ? await run(() => createEcommerceApi(data.store.companyId).createRental(body), 'Location ajoutée.')
      : editing ? await run(() => createEcommerceApi(data.store.companyId).updateRental(editing.id, body), 'Location mise à jour.') : undefined;
    if (result) setEditing(null);
    if (result && form.imageFile) {
      await run(() => createEcommerceApi(data.store.companyId).uploadRentalImage((result as EcommerceRental).id, form.imageFile as File), 'Location et photo enregistrées.');
    }
  };
  const archive = async (rental: EcommerceRental) => {
    if (!await confirm({ title: 'Archiver cette location ?', description: `« ${rental.name} » ne sera plus affichée dans la vitrine.`, confirmLabel: 'Archiver', tone: 'danger' })) return;
    await run(() => createEcommerceApi(data.store.companyId).archiveRental(rental.id), 'Location archivée.');
  };
  const setAvailability = async (rental: EcommerceRental, value: string) => {
    const availability = Number(value);
    if (Number.isInteger(availability) && availability >= 0) await run(() => createEcommerceApi(data.store.companyId).updateRentalAvailability(rental.id, availability), 'Disponibilité mise à jour.');
  };

  return <div className="space-y-5 fade-up">
    <section className="overflow-hidden rounded-2xl border border-[hsl(var(--primary)/.22)] bg-[linear-gradient(135deg,hsl(var(--primary)/.14),hsl(var(--card))_55%)] p-5 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><span className="mono text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--primary))]">Location & réservation</span><h2 className="mt-2 text-2xl font-bold tracking-[-.04em]">Gérez vos offres indépendamment du catalogue.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Chaque location possède ses propres tarifs, disponibilités et statuts. Elle ne crée ni ne modifie aucun produit vendu.</p></div>
        {canCreate && <button type="button" onClick={() => open()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-xs font-bold text-[hsl(var(--primary-foreground))]"><Plus size={15} />Ajouter une location</button>}
      </div>
    </section>
    <div className="grid gap-4 sm:grid-cols-3"><Metric label="Offres actives" value={String(activeRentals.length)} detail="Brouillons et publiées" icon={House} accent /><Metric label="Disponibles" value={String(activeRentals.filter(rental => rental.isAvailable).length)} detail="Avec une capacité positive" icon={CheckCircle2} /><Metric label="Visibles en ligne" value={String(activeRentals.filter(rental => rental.status === 'PUBLISHED').length)} detail="Statut publié" icon={Megaphone} /></div>
    <Panel title="Offres de location" description="Les fiches restent indépendantes du catalogue produit et se conservent après actualisation.">
        {activeRentals.length === 0 ? <Empty icon={House} title="Aucune location" text="Créez votre première offre autonome pour l’afficher dans la rubrique Location." action={canCreate ? <button type="button" onClick={() => open()} className="text-xs font-bold text-[hsl(var(--primary))]">Ajouter une location</button> : undefined} /> : <div className="table-scroll"><table className="w-full text-left text-sm"><thead><tr><th className="px-4">Location</th><th className="px-4">Tarif</th><th className="px-4">Disponibilité</th><th className="px-4">Statut</th><th className="px-4">Actions</th></tr></thead><tbody className="divide-y">{activeRentals.map(rental => <tr key={rental.id}><td className="px-4 py-3"><div className="flex items-center gap-3">{rental.imageUrl ? <img src={rental.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><House size={17} /></span>}<span className="min-w-0"><strong className="block truncate">{rental.name}</strong><small className="text-xs text-[hsl(var(--muted-foreground))]">{rental.category} · par {rental.billingUnit === 'MOIS' ? 'mois' : rental.billingUnit === 'SEMAINE' ? 'semaine' : 'jour'}</small></span></div></td><td className="px-4 py-3 font-bold">{money(rental.price, data.store.currency)}</td><td className="px-4 py-3"><input aria-label={`Disponibilité de ${rental.name}`} type="number" min="0" value={rental.availability} disabled={!canModify} onChange={event => void setAvailability(rental, event.target.value)} className="w-24 rounded-lg border bg-transparent px-2.5 py-2 text-sm font-bold disabled:opacity-50" /></td><td className="px-4 py-3"><StatusPill value={rental.status === 'PUBLISHED' && rental.isAvailable ? 'Disponible' : rental.status} /></td><td className="px-4 py-3"><div className="flex flex-wrap justify-end gap-1.5">{canModify && <button type="button" onClick={() => open(rental)} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-bold"><Pencil size={13} />Modifier</button>}{canModify && <button type="button" onClick={() => void archive(rental)} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-bold text-[hsl(var(--destructive))]"><Archive size={13} />Archiver</button>}</div></td></tr>)}</tbody></table></div>}
    </Panel>
     {editing && <RentalModal editing={editing} form={form} categories={data.categories} setForm={setForm} onClose={() => setEditing(null)} onSave={save} />}
  </div>;
}

function RentalModal({ editing, form, categories, setForm, onClose, onSave }: { editing: EcommerceRental | 'new'; form: RentalForm; categories: EcommerceCategory[]; setForm: (value: RentalForm) => void; onClose: () => void; onSave: (event: FormEvent) => void }) {
  const patch = (updates: Partial<RentalForm>) => setForm({ ...form, ...updates });
  return <Modal large title={editing === 'new' ? 'Ajouter une location' : `Modifier ${editing.name}`} onClose={onClose}><form onSubmit={onSave} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Nom de la location" required value={form.name} onChange={value => patch({ name: value })} placeholder="Ex. Maison familiale" /><label className="block text-xs font-bold">Catégorie<select value={form.categoryId} onChange={event => patch({ categoryId: event.target.value, category: event.target.options[event.target.selectedIndex]?.text ?? form.category })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm"><option value="">Sans catégorie</option>{categories.filter(category => category.isActive).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><Field label="Catégorie libre" value={form.categoryId ? categories.find(category => category.id === form.categoryId)?.name ?? form.category : form.category} onChange={value => patch({ category: value, categoryId: '' })} placeholder="Ex. Habitat" /><Field label="Tarif" required type="number" value={form.price} onChange={value => patch({ price: value })} placeholder="0" /><label className="block text-xs font-bold">Unité de facturation<select value={form.billingUnit} onChange={event => patch({ billingUnit: event.target.value as EcommerceRentalPeriod })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm"><option value="JOUR">Par jour</option><option value="SEMAINE">Par semaine</option><option value="MOIS">Par mois</option></select></label><Field label="Disponibilité" required type="number" value={form.availability} onChange={value => patch({ availability: value })} placeholder="0" /><label className="block text-xs font-bold">Statut<select value={form.status} onChange={event => patch({ status: event.target.value as EcommerceRentalStatus })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm"><option value="DRAFT">Brouillon</option><option value="PUBLISHED">Publié</option><option value="ARCHIVED">Archivé</option></select></label><label className="block text-xs font-bold">Photo de la location<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => patch({ imageFile: event.target.files?.[0] ?? null })} className="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[hsl(var(--muted))] file:px-2.5 file:py-1.5 file:text-xs file:font-bold" /><span className="mt-1 block text-[11px] font-normal text-[hsl(var(--muted-foreground))]">JPG, PNG ou WebP · 5 Mo maximum</span>{form.imageFile && <span className="mt-1 block truncate text-[11px] font-semibold text-[hsl(var(--primary))]">{form.imageFile.name}</span>}{editing !== 'new' && editing.imageUrl && !form.imageFile && <img src={editing.imageUrl} alt="" className="mt-2 h-16 w-16 rounded-lg object-cover" />}</label></div><label className="block text-xs font-bold">Description<textarea value={form.description} onChange={event => patch({ description: event.target.value })} rows={4} placeholder="Décrivez ce qui est loué et les conditions utiles." className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" /></label><div className="modal-footer flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2.5 text-xs font-bold">Annuler</button><button type="submit" className="rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"><Check className="mr-1 inline" size={14} />Enregistrer</button></div></form></Modal>;
}

function WalletPanel({ data, currency, canModify, run, pendingAction }: { data: SellerWalletBootstrap; currency: EcommerceStore['currency']; canModify: boolean; run: (action: () => Promise<unknown>, success: string, actionKey?: string) => Promise<unknown | undefined>; pendingAction: string }) {
  const [account, setAccount] = useState({ mobile: data.wallet.payoutMobile, beneficiaryName: data.wallet.payoutName });
  const [amount, setAmount] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const api = createEcommerceApi(data.wallet.companyId);
  const available = data.wallet.availableBalance;
  const fee = data.withdrawalFee.amount;
  const maximumAmount = Math.max(0, available - fee);
  const requestedAmount = Number(amount);
  const amountExceedsBalance = Number.isInteger(requestedAmount) && requestedAmount + fee > available;
  const canRequestWithdrawal = Number.isInteger(requestedAmount)
    && requestedAmount >= 1000
    && !amountExceedsBalance
    && account.mobile.trim() !== ''
    && account.beneficiaryName.trim() !== '';

  const saveAccount = async (event: FormEvent) => {
    event.preventDefault();
    if (!account.mobile.trim() || !account.beneficiaryName.trim()) return;
    setSavingAccount(true);
    await run(() => api.updatePayoutAccount({ provider: 'WAVE', mobile: account.mobile.trim(), beneficiaryName: account.beneficiaryName.trim() }), 'Compte de retrait enregistré.');
    setSavingAccount(false);
  };

  const withdraw = async (event: FormEvent) => {
    event.preventDefault();
    if (!canRequestWithdrawal) return;
    const result = await run(() => api.requestWithdrawal({ amount: requestedAmount, provider: 'WAVE', mobile: account.mobile.trim(), beneficiaryName: account.beneficiaryName.trim() }), 'Demande de retrait envoyée.');
    if (result) setAmount('');
  };

  return <div className="space-y-5 fade-up">
    <section className="flex flex-col gap-4 rounded-2xl border border-[hsl(var(--primary)/.22)] bg-[hsl(var(--primary)/.06)] p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="mono text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--primary))]">Contrôle des paiements</p>
        <h2 className="mt-1 text-lg font-bold">Ne comptabiliser que l’argent confirmé</h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-[hsl(var(--muted-foreground))]">Le solde est crédité uniquement après confirmation DiamanoPay. Cette vérification récupère aussi les paiements confirmés dont le webhook n’est pas arrivé.</p>
      </div>
      <button type="button" disabled={!canModify || Boolean(pendingAction)} onClick={() => void run(async () => {
        const result = await api.reconcilePayments();
        return result;
      }, 'Paiements vérifiés auprès de DiamanoPay.', 'reconcile')} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border bg-[hsl(var(--background))] px-4 py-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw size={15} className={pendingAction === 'reconcile' ? 'animate-spin' : ''} />{pendingAction === 'reconcile' ? 'Vérification…' : 'Vérifier les paiements'}</button>
    </section>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <WalletMetric label="Solde disponible" value={money(data.wallet.availableBalance, currency)} detail="Retirable maintenant" icon={Wallet} accent />
       <WalletMetric label="Solde en attente" value={money(data.wallet.pendingBalance, currency)} detail={data.maturityPolicy.label} icon={Clock3} />
      <WalletMetric label="Retraits réservés" value={money(data.wallet.reservedBalance, currency)} detail="En cours de traitement" icon={ArrowDownToLine} />
      <WalletMetric label="Total crédité" value={money(data.wallet.totalCredited, currency)} detail="Ventes confirmées" icon={CircleDollarSign} />
    </div>
     <div className="rounded-xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.06)] px-4 py-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
       Règle de maturation active : <strong className="text-[hsl(var(--foreground))]">{data.maturityPolicy.label}</strong>
     </div>
     <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.28)] px-4 py-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
       Répartition des ventes : <strong className="text-[hsl(var(--foreground))]">{data.commissionPolicy.providerPercent} % DiamanoPay</strong>, <strong className="text-[hsl(var(--foreground))]">{data.commissionPolicy.maximusPercent} % MAXIMUS</strong> et <strong className="text-[hsl(var(--foreground))]">{data.commissionPolicy.sellerPercent} % vendeur</strong>.
     </div>
    <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
       <Panel title="Demander un retrait" description="Les retraits sont envoyés vers un compte Wave vérifié. Les frais sont ajoutés au montant débité. Minimum : 1 000 XOF.">
        <form onSubmit={withdraw} className="space-y-4">
          <Field label="Montant à retirer" type="number" value={amount} onChange={setAmount} placeholder="Ex. 25000" />
          <div className="rounded-xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.06)] p-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
             Disponible : <strong className="text-[hsl(var(--foreground))]">{money(available, currency)}</strong>. Frais : <strong className="text-[hsl(var(--foreground))]">{money(fee, currency)}</strong>. Le montant demandé et les frais doivent être couverts par le solde disponible. Retrait maximal actuel : <strong className="text-[hsl(var(--foreground))]">{money(maximumAmount, currency)}</strong>.
          </div>
            {amountExceedsBalance && requestedAmount >= 1000 && <p role="alert" className="rounded-lg bg-[hsl(var(--destructive)/.1)] p-3 text-xs font-semibold text-[hsl(var(--destructive))]">Ce retrait est impossible : le solde ne couvre pas le montant demandé et les frais.</p>}
            <button type="submit" disabled={!canModify || !canRequestWithdrawal} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-3 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-50"><ArrowDownToLine size={15} />Demander le retrait</button>
        </form>
      </Panel>
      <Panel title="Compte de retrait" description="Ces coordonnées sont utilisées uniquement pour les payouts de cette entreprise.">
        <form onSubmit={saveAccount} className="space-y-4">
          <div className="rounded-xl border bg-[hsl(var(--muted)/.35)] p-3 text-xs font-semibold"><span className="inline-flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600" />Fournisseur : Wave</span></div>
          <Field label="Nom du bénéficiaire" value={account.beneficiaryName} onChange={value => setAccount(current => ({ ...current, beneficiaryName: value }))} placeholder="Nom affiché sur le compte mobile" />
          <Field label="Numéro mobile Wave" value={account.mobile} onChange={value => setAccount(current => ({ ...current, mobile: value }))} placeholder="+221 77 000 00 00" />
          <button type="submit" disabled={!canModify || savingAccount || !account.mobile.trim() || !account.beneficiaryName.trim()} className="rounded-lg border px-4 py-3 text-xs font-bold disabled:opacity-50">{savingAccount ? 'Enregistrement…' : 'Enregistrer le compte'}</button>
        </form>
      </Panel>
    </div>
    <Panel title="Historique des retraits" description="Les dernières demandes de retrait de cette entreprise.">
       {data.withdrawals.length === 0 ? <Empty icon={ArrowDownToLine} title="Aucun retrait" text="Les demandes de retrait apparaîtront ici." /> : <div className="table-scroll"><table className="w-full text-left text-sm"><thead><tr><th className="px-4">Date</th><th className="px-4">Reçu</th><th className="px-4">Frais</th><th className="px-4">Débité</th><th className="px-4">Compte</th><th className="px-4">Statut</th></tr></thead><tbody className="divide-y">{data.withdrawals.map(withdrawal => <tr key={withdrawal.id}><td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]">{dateLabel(withdrawal.requestedAt)}</td><td className="px-4 py-3 font-bold">{money(withdrawal.netAmount, currency)}</td><td className="px-4 py-3">{money(withdrawal.fee, currency)}</td><td className="px-4 py-3 font-bold">{money(withdrawal.totalDebit, currency)}</td><td className="px-4 py-3 text-xs">{withdrawal.mobile}</td><td className="px-4 py-3"><StatusPill value={withdrawal.status} /></td></tr>)}</tbody></table></div>}
    </Panel>
  </div>;
}

function WalletMetric({ label, value, detail, icon: Icon, accent = false }: { label: string; value: string; detail: string; icon: typeof Wallet; accent?: boolean }) {
  return <div className={`card-surface rounded-2xl border p-4 ${accent ? 'border-[hsl(var(--primary)/.3)]' : ''}`}><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'}`}><Icon size={17} /></span><p className="mt-4 text-xs font-bold text-[hsl(var(--muted-foreground))]">{label}</p><p className="mt-1 text-xl font-bold tracking-tight">{value}</p><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{detail}</p></div>;
}

function Catalogue({ data, canCreate, canModify, run }: { data: EcommerceBootstrap; canCreate: boolean; canModify: boolean; run: (action: () => Promise<unknown>, success: string) => Promise<unknown | undefined> }) {
  const { confirm, alert } = useAppDialog();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'ALL' | EcommerceProduct['status']>('ALL');
  const [modal, setModal] = useState<EcommerceProduct | 'new' | null>(null);
  const [form, setForm] = useState<ProductForm>(blankProduct);
  const filtered = data.products
    .filter(product => product.productType !== 'RENTAL')
    .filter(product => status === 'ALL' || product.status === status)
    .filter(product => `${product.name} ${product.sku} ${product.category}`.toLocaleLowerCase('fr-FR').includes(query.toLocaleLowerCase('fr-FR')));
  const open = (product?: EcommerceProduct) => {
    setModal(product ?? 'new');
    setForm(product ? { name: product.name, slug: product.slug, sku: product.sku, description: product.description, category: product.category, categoryId: product.categoryId ?? '', price: String(product.price), compareAtPrice: product.compareAtPrice === null ? '' : String(product.compareAtPrice), stock: String(product.stock), productType: product.productType === 'DIGITAL' ? 'DIGITAL' : 'SALE', imageUrl: product.imageUrl, imageFile: null, digitalFile: null, featured: product.featured, status: product.status } : blankProduct);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const price = Number(form.price);
    const stock = form.productType === 'DIGITAL' ? 0 : Number(form.stock);
    const compareAtPrice = form.compareAtPrice.trim() ? Number(form.compareAtPrice) : null;
    if (!form.name.trim() || !form.sku.trim() || !Number.isFinite(price) || price < 0 || !Number.isFinite(stock) || stock < 0 || (compareAtPrice !== null && (!Number.isFinite(compareAtPrice) || compareAtPrice < 0))) {
      await alert({ title: 'Informations incomplètes', description: 'Renseignez un nom, une référence et un prix valides. Le stock ne concerne pas les produits numériques.', confirmLabel: 'Compris' });
      return;
    }
    if (form.productType === 'DIGITAL' && !(form.digitalFile || (modal !== 'new' && modal?.digitalFileName))) {
      await alert({ title: 'Fichier numérique obligatoire', description: 'Ajoutez le fichier qui sera remis au client après confirmation du paiement.', confirmLabel: 'Compris' });
      return;
    }
    const productType = form.productType;
    const body = { name: form.name.trim(), ...(form.slug.trim() ? { slug: slugify(form.slug) } : {}), sku: form.sku.trim(), description: form.description.trim(), category: form.category.trim() || 'Divers', categoryId: form.categoryId || null, price, compareAtPrice, stock, productType, rentalPeriod: null, imageUrl: form.imageUrl.trim(), featured: form.featured, status: form.status };
    const api = createEcommerceApi(data.store.companyId);
    const saved = modal === 'new'
      ? await run(() => api.createProduct(body), 'Produit ajouté au catalogue.')
      : modal
        ? await run(() => api.updateProduct(modal.id, body), 'Produit mis à jour.')
        : undefined;
    if (!saved) return;
    const savedProduct = saved as EcommerceProduct;
    if (form.imageFile) {
      await run(() => api.uploadProductImage(savedProduct.id, form.imageFile as File), 'Produit et photo enregistrés.');
    }
    if (form.digitalFile) {
      await run(() => api.uploadDigitalProductFile(savedProduct.id, form.digitalFile as File), 'Produit numérique et fichier enregistrés.');
    }
    setModal(null);
  };
  const archive = async (product: EcommerceProduct) => {
    if (!await confirm({ title: 'Archiver ce produit ?', description: `« ${product.name} » ne sera plus proposé dans le catalogue actif.`, confirmLabel: 'Archiver', tone: 'danger' })) return;
    await run(() => createEcommerceApi(data.store.companyId).archiveProduct(product.id), 'Produit archivé.');
  };
  return <div className="space-y-5 fade-up">
    <Panel title="Catalogue en ligne" description="Organisez les références qui alimentent directement votre vitrine." action={canCreate ? <button type="button" onClick={() => open()} className="btn inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-3.5 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"><Plus size={15} />Ajouter un produit</button> : undefined}>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher par nom, référence ou catégorie" className="w-full rounded-lg border bg-transparent py-2.5 pl-9 pr-3 text-sm" /></label><select value={status} onChange={event => setStatus(event.target.value as typeof status)} className="rounded-lg border bg-[hsl(var(--card))] px-3 py-2.5 text-sm"><option value="ALL">Tous les statuts</option><option value="PUBLISHED">Publié</option><option value="DRAFT">Brouillon</option><option value="ARCHIVED">Archivé</option></select></div>
        {filtered.length === 0 ? <Empty icon={Package} title={query || status !== 'ALL' ? 'Aucun produit trouvé' : 'Votre catalogue est vide'} text={query || status !== 'ALL' ? 'Modifiez vos filtres pour retrouver une référence.' : 'Ajoutez votre première référence pour commencer à vendre en ligne.'} action={canCreate && !query ? <button type="button" onClick={() => open()} className="text-xs font-bold text-[hsl(var(--primary))]">Ajouter un produit</button> : undefined} /> : <div className="table-scroll"><table className="w-full text-left text-sm"><thead><tr><th className="px-4">Produit</th><th className="px-4">Référence</th><th className="px-4">Prix</th><th className="px-4">Stock</th><th className="px-4">Statut</th><th className="px-4">Actions</th></tr></thead><tbody className="divide-y">{filtered.map(product => <tr key={product.id}><td className="px-4 py-3"><div className="flex items-center gap-3">{product.imageUrl ? <img src={product.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><Package size={17} /></span>}<span className="min-w-0"><strong className="block truncate">{product.name}</strong><small className="text-xs text-[hsl(var(--muted-foreground))]">{product.category}{product.featured ? ' · Vedette' : ''}</small></span></div></td><td className="mono px-4 py-3 text-xs">{product.sku}</td><td className="px-4 py-3 font-bold">{money(product.price, data.store.currency)}</td><td className={`px-4 py-3 font-bold ${product.stock <= 5 ? 'text-[hsl(var(--destructive))]' : ''}`}>{product.stock}</td><td className="px-4 py-3"><StatusPill value={product.status} /></td><td className="px-4 py-3"><div className="flex flex-wrap justify-end gap-1.5">{canModify && product.status !== 'ARCHIVED' && <button type="button" title="Modifier" aria-label={`Modifier ${product.name}`} onClick={() => open(product)} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-bold hover:bg-[hsl(var(--muted))]"><Pencil size={13} />Modifier</button>}{canModify && product.status !== 'ARCHIVED' && <button type="button" title="Archiver" aria-label={`Archiver ${product.name}`} onClick={() => void archive(product)} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-bold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--muted))]"><Archive size={13} />Archiver</button>}</div></td></tr>)}</tbody></table></div>}
    </Panel>
    {modal && <ProductModal modal={modal} form={form} categories={data.categories} setForm={setForm} onClose={() => setModal(null)} onSave={save} />}
  </div>;
}

function ProductModal({ modal, form, categories, setForm, onClose, onSave }: { modal: EcommerceProduct | 'new'; form: ProductForm; categories: EcommerceCategory[]; setForm: (value: ProductForm) => void; onClose: () => void; onSave: (event: FormEvent) => void }) {
  const patch = (updates: Partial<ProductForm>) => setForm({ ...form, ...updates });
  const [, setSlugManuallyEdited] = useState(modal !== 'new');
  const changeName = (value: string) => patch({ name: value, ...(modal === 'new' ? { slug: slugify(value) } : {}) });
  return <Modal large title={modal === 'new' ? 'Nouveau produit' : `Modifier ${modal.name}`} onClose={onClose}>
    <form onSubmit={onSave} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom du produit" required value={form.name} onChange={changeName} placeholder="Ex. Sacoche Atlas" />
        <Field label="Référence SKU" required value={form.sku} onChange={value => patch({ sku: value })} placeholder="ATLAS-001" />
        <label className="block text-xs font-bold">Catégorie
          <select value={form.categoryId} onChange={event => { const categoryId = event.target.value; const category = categories.find(item => item.id === categoryId); patch({ categoryId, category: category?.name ?? form.category }); }} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm"><option value="">Sans catégorie</option>{categories.filter(category => category.isActive).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
        </label>
        <Field label="Slug public (optionnel)" value={form.slug} onChange={value => { setSlugManuallyEdited(true); patch({ slug: value }); }} placeholder="généré automatiquement si vide" />
        <label className="block text-xs font-bold">Type de produit<select value={form.productType} onChange={event => patch({ productType: event.target.value as ProductForm['productType'], stock: event.target.value === 'DIGITAL' ? '0' : form.stock })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm"><option value="SALE">Physique</option><option value="DIGITAL">Numérique</option></select></label>
        <Field label="Prix de vente" required type="number" value={form.price} onChange={value => patch({ price: value })} placeholder="0" />
        <Field label="Prix barré" type="number" value={form.compareAtPrice} onChange={value => patch({ compareAtPrice: value })} placeholder="Optionnel" />
        {form.productType !== 'DIGITAL' ? <Field label="Stock disponible" required type="number" value={form.stock} onChange={value => patch({ stock: value })} placeholder="0" /> : <label className="block rounded-lg border border-dashed bg-[hsl(var(--muted)/.35)] px-3 py-2.5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Stock physique<div className="mt-1 text-sm font-bold text-[hsl(var(--foreground))]">Non applicable</div></label>}
        <label className="block text-xs font-bold">Photo du produit<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => patch({ imageFile: event.target.files?.[0] ?? null })} className="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[hsl(var(--muted))] file:px-2.5 file:py-1.5 file:text-xs file:font-bold" /><span className="mt-1 block text-[11px] font-normal text-[hsl(var(--muted-foreground))]">JPG, PNG ou WebP · 5 Mo maximum · envoyée à l’enregistrement</span>{form.imageFile && <span className="mt-1 block truncate text-[11px] font-semibold text-[hsl(var(--primary))]">{form.imageFile.name}</span>}{form.imageUrl && !form.imageFile && <img src={form.imageUrl} alt="" className="mt-2 h-16 w-16 rounded-lg object-cover" />}</label>
        {form.productType === 'DIGITAL' && <label className="block text-xs font-bold sm:col-span-2">Fichier remis après paiement<input type="file" accept=".pdf,.zip,.epub,.docx,.xlsx,.pptx,.csv,.mp3,.mp4,.png,.jpg,.jpeg,application/pdf,application/zip,audio/mpeg,video/mp4" onChange={event => patch({ digitalFile: event.target.files?.[0] ?? null })} className="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[hsl(var(--muted))] file:px-2.5 file:py-1.5 file:text-xs file:font-bold" /><span className="mt-1 block text-[11px] font-normal text-[hsl(var(--muted-foreground))]">PDF, ZIP, EPUB, bureautique, audio ou vidéo · 50 Mo maximum · téléchargement débloqué après paiement confirmé.</span>{form.digitalFile ? <span className="mt-1 block truncate text-[11px] font-semibold text-[hsl(var(--primary))]">{form.digitalFile.name}</span> : modal !== 'new' && modal.digitalFileName ? <span className="mt-1 block truncate text-[11px] font-semibold text-emerald-700">Fichier actuel : {modal.digitalFileName}</span> : null}</label>}
      </div>
       <label className="block text-xs font-bold">Description<textarea value={form.description} onChange={event => patch({ description: event.target.value })} rows={3} placeholder="Quelques mots utiles pour l’acheteur..." className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-bold">Statut<select value={form.status} onChange={event => patch({ status: event.target.value as ProductForm['status'] })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm"><option value="DRAFT">Brouillon</option><option value="PUBLISHED">Publié</option><option value="ARCHIVED">Archivé</option></select></label><label className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-xs font-bold"><input type="checkbox" checked={form.featured} onChange={event => patch({ featured: event.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" />Mettre en avant dans la boutique</label></div>
      <div className="modal-footer flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2.5 text-xs font-bold">Annuler</button><button type="submit" className="rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"><Check className="mr-1 inline" size={14} />Enregistrer</button></div>
    </form>
  </Modal>;
}

function CategoryManager({ data, canCreate, canModify, run }: { data: EcommerceBootstrap; canCreate: boolean; canModify: boolean; run: (action: () => Promise<unknown>, success: string) => Promise<unknown | undefined> }) {
  const { confirm } = useAppDialog();
  const [editing, setEditing] = useState<EcommerceCategory | 'new' | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', isActive: true, sortOrder: 0 });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const open = (category?: EcommerceCategory) => {
    setEditing(category ?? 'new');
    setSlugManuallyEdited(Boolean(category));
    setForm(category
      ? { name: category.name, slug: category.slug, description: category.description, isActive: category.isActive, sortOrder: category.sortOrder }
      : { name: '', slug: '', description: '', isActive: true, sortOrder: data.categories.length });
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    const body = { ...form, name: form.name.trim(), slug: slugify(form.slug || form.name), description: form.description.trim() };
    const result = editing === 'new'
      ? await run(() => createEcommerceApi(data.store.companyId).createCategory(body), 'Catégorie créée.')
      : editing ? await run(() => createEcommerceApi(data.store.companyId).updateCategory(editing.id, body), 'Catégorie mise à jour.') : undefined;
    if (result) setEditing(null);
  };
  const remove = async (category: EcommerceCategory) => {
    if (!await confirm({ title: 'Supprimer cette catégorie ?', description: `Les produits seront conservés sans catégorie : « ${category.name} ».`, confirmLabel: 'Supprimer', tone: 'danger' })) return;
    await run(() => createEcommerceApi(data.store.companyId).deleteCategory(category.id), 'Catégorie supprimée.');
  };
     return <div className="space-y-5 fade-up">
    <Panel title="Catégories" description="Structurez le catalogue avec des catégories réutilisables et persistantes." action={canCreate ? <button type="button" onClick={() => open()} className="btn inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-3.5 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"><Plus size={15} />Ajouter une catégorie</button> : undefined}>
      {data.categories.length === 0 ? <Empty icon={Tags} title="Aucune catégorie" text="Créez une catégorie pour mieux organiser vos produits." /> : <div className="table-scroll"><table className="w-full text-left text-sm"><thead><tr><th className="px-4">Nom</th><th className="px-4">Slug</th><th className="px-4">Ordre</th><th className="px-4">Statut</th><th className="px-4">Actions</th></tr></thead><tbody className="divide-y">{data.categories.map(category => <tr key={category.id}><td className="px-4 py-3 font-bold">{category.name}</td><td className="mono px-4 py-3 text-xs">{category.slug}</td><td className="px-4 py-3">{category.sortOrder}</td><td className="px-4 py-3">{category.isActive ? 'Active' : 'Inactive'}</td><td className="px-4 py-3"><div className="flex gap-2">{canModify && <button type="button" onClick={() => open(category)} className="rounded-lg border px-2.5 py-2 text-xs font-bold"><Pencil size={13} className="mr-1 inline" />Modifier</button>}{canModify && <button type="button" onClick={() => void remove(category)} className="rounded-lg border px-2.5 py-2 text-xs font-bold text-[hsl(var(--destructive))]">Supprimer</button>}</div></td></tr>)}</tbody></table></div>}
    </Panel>
     {editing && <Modal title={editing === 'new' ? 'Nouvelle catégorie' : 'Modifier la catégorie'} onClose={() => setEditing(null)}><form onSubmit={save} className="space-y-4"><Field label="Nom" required value={form.name} onChange={value => setForm({ ...form, name: value, ...(!slugManuallyEdited ? { slug: slugify(value) } : {}) })} placeholder="Ex. Accessoires" /><Field label="Slug" value={form.slug} onChange={value => { setSlugManuallyEdited(true); setForm({ ...form, slug: value }); }} placeholder="généré automatiquement" /><label className="block text-xs font-bold">Description<textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} rows={3} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" /></label><div className="grid gap-3 sm:grid-cols-2"><Field label="Ordre" type="number" value={String(form.sortOrder)} onChange={value => setForm({ ...form, sortOrder: Math.max(0, Number(value) || 0) })} /><label className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-bold"><input type="checkbox" checked={form.isActive} onChange={event => setForm({ ...form, isActive: event.target.checked })} />Catégorie active</label></div><div className="modal-footer flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="rounded-lg border px-4 py-2.5 text-xs font-bold">Annuler</button><button type="submit" className="rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]">Enregistrer</button></div></form></Modal>}
  </div>;
}

function Orders({ data, canModify, run }: { data: EcommerceBootstrap; canModify: boolean; run: (action: () => Promise<unknown>, success: string) => Promise<unknown | undefined> }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | EcommerceOrderStatus>('ALL');
  const allOrders = Array.isArray(data.orders) ? data.orders : [];
  const orders = allOrders.filter(order => (filter === 'ALL' || order.status === filter) && `${order.reference ?? ''} ${order.customerName ?? ''} ${order.customerEmail ?? ''}`.toLocaleLowerCase('fr-FR').includes(query.toLocaleLowerCase('fr-FR')));
  const changeStatus = (order: EcommerceOrder, status: EcommerceOrderStatus) => run(() => createEcommerceApi(data.store.companyId).updateOrderStatus(order.id, status), 'Statut de commande mis à jour.');
  return <div className="space-y-5 fade-up"><Panel title="Commandes" description="Suivez chaque vente, du premier clic à la livraison."><div className="mb-5 flex flex-col gap-3 lg:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher par référence, nom ou e-mail" className="w-full rounded-lg border bg-transparent py-2.5 pl-9 pr-3 text-sm" /></label><select value={filter} onChange={event => setFilter(event.target.value as typeof filter)} className="rounded-lg border bg-[hsl(var(--card))] px-3 py-2.5 text-sm"><option value="ALL">Tous les statuts</option>{orderStatuses.map(item => <option key={item} value={item}>{item}</option>)}</select></div>{orders.length === 0 ? <Empty icon={ClipboardList} title={allOrders.length ? 'Aucune commande trouvée' : 'Aucune commande pour le moment'} text={allOrders.length ? 'Modifiez votre recherche ou le filtre de statut.' : 'Les ventes de votre boutique apparaîtront ici dès la première vente.'} /> : <div className="table-scroll"><table className="w-full text-left text-sm"><thead><tr><th className="px-4">Commande</th><th className="px-4">Client</th><th className="px-4">Articles</th><th className="px-4">Total</th><th className="px-4">Statut</th><th className="px-4">Mise à jour</th></tr></thead><tbody className="divide-y">{orders.map(order => { const items = Array.isArray(order.items) ? order.items : []; return <tr key={order.id}><td className="px-4 py-4"><strong className="block">{order.reference}</strong><small className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">{dateLabel(order.createdAt)}</small></td><td className="px-4 py-4"><strong className="block">{order.customerName}</strong><small className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">{order.customerEmail}</small></td><td className="px-4 py-4 text-xs">{items.reduce((sum, item) => sum + item.quantity, 0)} article{items.length > 1 ? 's' : ''}</td><td className="px-4 py-4 font-bold">{money(order.total, data.store.currency)}</td><td className="px-4 py-4"><StatusPill value={order.status} /></td><td className="px-4 py-4">{canModify ? <select aria-label={`Changer le statut de ${order.reference}`} value={order.status} onChange={event => void changeStatus(order, event.target.value as EcommerceOrderStatus)} className="rounded-lg border bg-[hsl(var(--card))] px-2 py-2 text-xs font-bold">{allowedNextStatuses(order.status).map(item => <option key={item} value={item}>{item}</option>)}</select> : <span className="text-xs text-[hsl(var(--muted-foreground))]">Lecture seule</span>}</td></tr>; })}</tbody></table></div>}</Panel></div>;
}

function Clients({ data }: { data: EcommerceBootstrap }) {
  const clients = useMemo(() => {
    const map = new Map<string, { name: string; email: string; phone: string; orders: number; total: number; lastOrder: string }>();
    data.orders.forEach(order => {
      const key = order.customerEmail || order.customerName;
      const previous = map.get(key);
      map.set(key, { name: order.customerName, email: order.customerEmail, phone: order.customerPhone, orders: (previous?.orders ?? 0) + 1, total: (previous?.total ?? 0) + order.total, lastOrder: previous?.lastOrder && new Date(previous.lastOrder) > new Date(order.createdAt) ? previous.lastOrder : order.createdAt });
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [data.orders]);
  return <div className="space-y-5 fade-up"><Panel title="Clients" description="Une vue consolidée des acheteurs issus de votre boutique.">{clients.length === 0 ? <Empty icon={Users} title="Votre fichier client est vide" text="Les coordonnées apparaîtront automatiquement après les premières commandes." /> : <div className="table-scroll"><table className="w-full text-left text-sm"><thead><tr><th className="px-4">Client</th><th className="px-4">Contact</th><th className="px-4">Commandes</th><th className="px-4">Valeur cumulée</th><th className="px-4">Dernière commande</th></tr></thead><tbody className="divide-y">{clients.map(client => <tr key={client.email || client.name}><td className="px-4 py-4 font-bold">{client.name}</td><td className="px-4 py-4"><span className="block text-xs">{client.email || 'E-mail non renseigné'}</span><span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">{client.phone || 'Téléphone non renseigné'}</span></td><td className="px-4 py-4">{client.orders}</td><td className="px-4 py-4 font-bold">{money(client.total, data.store.currency)}</td><td className="px-4 py-4 text-xs text-[hsl(var(--muted-foreground))]">{dateLabel(client.lastOrder)}</td></tr>)}</tbody></table></div>}</Panel></div>;
}

function Promotions() {
  return <div className="fade-up"><Panel title="Promotions" description="Préparez vos temps forts commerciaux sans perdre de vue la cohérence de votre catalogue."><div className="mx-auto max-w-2xl py-8 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><Megaphone size={24} /></span><h2 className="mt-5 text-xl font-bold">Les promotions arrivent dans votre cockpit</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">Cette vue est prête pour vos futures campagnes. En attendant, gérez vos prix et vos prix barrés directement depuis le catalogue.</p></div></Panel></div>;
}

function Deliveries({ data, canModify, run }: { data: EcommerceBootstrap; canModify: boolean; run: (action: () => Promise<unknown>, success: string) => Promise<unknown | undefined> }) {
  const shipments = data.orders.filter(order => !['NOUVELLE', 'CONFIRMÉE', 'ANNULÉE'].includes(order.status));
  const change = (order: EcommerceOrder, status: EcommerceOrderStatus) => run(() => createEcommerceApi(data.store.companyId).updateOrderStatus(order.id, status), 'Flux de livraison mis à jour.');
  const changeRequest = (request: EcommerceDeliveryRequest, status: EcommerceDeliveryRequestStatus) => run(() => createEcommerceApi(data.store.companyId).updateDeliveryRequestStatus(request.id, status), 'Demande de livraison mise à jour.');
  return <div className="space-y-5 fade-up">
    <Panel title="Demandes de services" description="Les clients peuvent demander une livraison même sans panier.">
      {data.deliveryRequests.length === 0 ? <Empty icon={Truck} title="Aucune demande de livraison" text="Les demandes déposées depuis la vitrine apparaîtront ici." /> : <div className="grid gap-3 md:grid-cols-2">{data.deliveryRequests.map(request => <div key={request.id} className="rounded-xl border p-4 transition hover:border-[hsl(var(--primary)/.3)] hover:shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="mono text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">{request.reference}</p><h3 className="mt-1 font-bold">{request.requesterName}</h3><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{request.requesterEmail} · {request.requesterPhone || 'Téléphone non renseigné'}</p></div><StatusPill value={request.status} /></div><p className="mt-3 text-sm">{request.address}</p><p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">{request.serviceType === 'URGENT' ? 'Demande urgente' : 'Livraison standard'}{request.desiredDate ? ` · souhaitée le ${dateLabel(request.desiredDate)}` : ''}</p>{request.note && <p className="mt-2 rounded-lg bg-[hsl(var(--muted)/.45)] p-2 text-xs">{request.note}</p>}<div className="mt-4 flex items-center justify-between gap-3 border-t pt-3"><span className="text-xs text-[hsl(var(--muted-foreground))]">{dateLabel(request.createdAt)}</span>{canModify && <select aria-label={`Changer le statut de ${request.reference}`} value={request.status} onChange={event => void changeRequest(request, event.target.value as EcommerceDeliveryRequestStatus)} className="rounded-lg border bg-[hsl(var(--card))] px-2 py-2 text-xs font-bold">{(['DEMANDEE', 'CONFIRMEE', 'EN_COURS', 'LIVREE', 'ANNULEE'] as EcommerceDeliveryRequestStatus[]).map(item => <option key={item} value={item}>{item}</option>)}</select>}</div></div>)}</div>}
    </Panel>
    <Panel title="Livraisons de commandes" description="Le flux des commandes qui ont quitté le bureau pour rejoindre vos clients.">
      {shipments.length === 0 ? <Empty icon={Truck} title="Aucune livraison de commande en cours" text="Les commandes en préparation et expédiées seront suivies ici." /> : <div className="grid gap-3 md:grid-cols-2">{shipments.map(order => <div key={order.id} className="rounded-xl border p-4 transition hover:border-[hsl(var(--primary)/.3)] hover:shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="mono text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">{order.reference}</p><h3 className="mt-1 font-bold">{order.customerName}</h3></div><StatusPill value={order.status} /></div><p className="mt-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{order.shippingAddress || 'Adresse de livraison non renseignée'}</p><div className="mt-4 flex items-center justify-between gap-3 border-t pt-3"><span className="text-xs font-bold">{money(order.total, data.store.currency)}</span>{canModify && <select aria-label={`Avancer la livraison ${order.reference}`} value={order.status} onChange={event => void change(order, event.target.value as EcommerceOrderStatus)} className="rounded-lg border bg-[hsl(var(--card))] px-2 py-2 text-xs font-bold">{orderStatuses.filter(item => !['NOUVELLE', 'ANNULÉE'].includes(item)).map(item => <option key={item} value={item}>{item}</option>)}</select>}</div></div>)}</div>}
    </Panel>
  </div>;
}

function SettingsPanel({ store, domains, canModify, run }: { store: EcommerceStore; domains: EcommerceDomain[]; canModify: boolean; run: (action: () => Promise<unknown>, success: string) => Promise<unknown | undefined> }) {
  const [form, setForm] = useState({
    name: store.name,
    slug: store.slug,
    description: store.description,
    status: store.status,
    currency: store.currency,
    primaryColor: store.primaryColor,
    accentColor: store.accentColor,
  });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [copied, setCopied] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  useEffect(() => {
    setForm({
      name: store.name,
      slug: store.slug,
      description: store.description,
      status: store.status,
      currency: store.currency,
      primaryColor: store.primaryColor,
       accentColor: store.accentColor,
    });
    setSlugManuallyEdited(false);
    setLogoFile(null);
  }, [store]);
  const patch = (updates: Partial<typeof form>) => setForm(current => ({ ...current, ...updates }));
  const publicUrl = `${window.location.origin}/shop/${encodeURIComponent(slugify(form.slug || form.name) || 'boutique')}`;
  const save = (event: FormEvent) => {
    event.preventDefault();
    const selectedLogo = logoFile;
    const api = createEcommerceApi(store.companyId);
    void run(async () => {
      await api.updateStore(form);
      if (selectedLogo) await api.uploadStoreLogo(selectedLogo);
    }, selectedLogo ? 'Paramètres et logo de la boutique enregistrés.' : 'Paramètres de la boutique enregistrés.');
  };
  const copyPublicUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  const addDomain = (event: FormEvent) => {
    event.preventDefault();
    const domain = domainInput.trim();
    if (!domain) return;
    void run(() => createEcommerceApi(store.companyId).createDomain(domain), 'Domaine ajouté. Configurez le DNS puis lancez la vérification.');
    setDomainInput('');
  };
  const verifyDomain = (domain: EcommerceDomain) => {
    void run(() => createEcommerceApi(store.companyId).verifyDomain(domain.id), `Domaine ${domain.domain} vérifié.`);
  };
  const removeDomain = (domain: EcommerceDomain) => {
    void run(() => createEcommerceApi(store.companyId).deleteDomain(domain.id), 'Domaine retiré de la boutique.');
  };
  return <div className="space-y-5 fade-up">
    <Panel title="Paramètres de la boutique" description="Ces informations structurent votre vitrine publique et votre expérience d’achat.">
      <form onSubmit={save} className="max-w-3xl space-y-5">
         <div className="grid gap-4 sm:grid-cols-2"><Field label="Nom de la boutique" required value={form.name} onChange={value => patch({ name: value, ...(slugManuallyEdited ? {} : { slug: slugify(value) }) })} disabled={!canModify} /><Field label="Adresse publique (slug)" required value={form.slug} onChange={value => { setSlugManuallyEdited(true); patch({ slug: value }); }} disabled={!canModify} /><label className="block text-xs font-bold">Logo de la boutique<div className="mt-1.5 flex items-center gap-3 rounded-lg border px-3 py-2.5"><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[hsl(var(--muted))]">{store.logoUrl ? <img src={store.logoUrl} alt={`Logo de ${store.name}`} className="h-full w-full object-contain" /> : <Store size={16} className="text-[hsl(var(--muted-foreground))]" />}</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={!canModify} onChange={event => setLogoFile(event.target.files?.[0] ?? null)} className="min-w-0 flex-1 text-xs" /></div>{logoFile && <span className="mt-1 block truncate text-[11px] font-normal text-[hsl(var(--muted-foreground))]">{logoFile.name}</span>}</label><label className="block text-xs font-bold">Devise<select disabled={!canModify} value={form.currency} onChange={event => patch({ currency: event.target.value as EcommerceStore['currency'] })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm"><option value="XOF">XOF — Franc CFA</option><option value="EUR">EUR — Euro</option><option value="USD">USD — Dollar américain</option></select></label><label className="block text-xs font-bold">Statut de la boutique<select disabled={!canModify} value={form.status} onChange={event => patch({ status: event.target.value as EcommerceStore['status'] })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm"><option value="DRAFT">Brouillon</option><option value="PUBLISHED">Publiée</option><option value="SUSPENDED">Suspendue</option></select></label></div>
        <div className="rounded-xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.04)] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="min-w-0 flex-1 text-xs font-bold">Lien public de la boutique<input readOnly value={publicUrl} className="mt-1.5 w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))]" /></label><div className="flex gap-2"><button type="button" onClick={() => void copyPublicUrl()} className="btn inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-bold"><Copy size={14} />{copied ? 'Copié' : 'Copier'}</button><a href={publicUrl} target="_blank" rel="noreferrer" className="btn inline-flex items-center rounded-lg border px-3 py-2.5 text-xs font-bold">Ouvrir</a></div></div><p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">Ce lien se met à jour avec le nom ou le slug de la boutique. La vitrine sera accessible publiquement lorsqu’elle sera publiée.</p></div>
        <label className="block text-xs font-bold">Description publique<textarea disabled={!canModify} value={form.description} onChange={event => patch({ description: event.target.value })} rows={4} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" /></label>
        <div className="grid gap-4 sm:grid-cols-2"><ColorField label="Couleur principale" value={form.primaryColor} onChange={value => patch({ primaryColor: value })} disabled={!canModify} /><ColorField label="Couleur d’accent" value={form.accentColor} onChange={value => patch({ accentColor: value })} disabled={!canModify} /></div>
         <div className="flex flex-wrap justify-end gap-2 border-t pt-5"><button type="button" disabled={!canModify || !logoFile} onClick={() => { if (!logoFile) return; void run(() => createEcommerceApi(store.companyId).uploadStoreLogo(logoFile), 'Logo de la boutique enregistré.'); }} className="btn inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"><Store size={14} />Enregistrer le logo</button><button type="submit" disabled={!canModify} className="btn inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-50"><Check size={14} />Enregistrer les paramètres</button></div>
      </form>
    </Panel>
     <Panel title="Domaine personnalisé" description="Connectez le domaine acheté par votre entreprise à cette boutique publique, avec HTTPS géré par Render.">
      <div className="space-y-5">
         <div className="rounded-xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.04)] p-4 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
           <p className="font-bold text-[hsl(var(--foreground))]">Procédure de connexion</p>
           <p className="mt-1">Ajoutez d’abord le domaine dans la configuration Custom Domains de Render pour que le certificat HTTPS soit provisionné, puis renseignez ici le domaine et appliquez l’enregistrement DNS indiqué ci-dessous.</p>
           <p className="mt-1">Après propagation DNS et activation du certificat, cliquez sur « Vérifier ». La boutique doit rester publiée pour répondre sur ce domaine.</p>
         </div>
        <form onSubmit={addDomain} className="flex flex-col gap-3 sm:flex-row">
          <Field label="Nom de domaine" value={domainInput} onChange={setDomainInput} placeholder="boutique.exemple.sn" disabled={!canModify} />
          <button type="submit" disabled={!canModify || !domainInput.trim()} className="self-end rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-50">Ajouter le domaine</button>
        </form>
         {domains.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-sm text-[hsl(var(--muted-foreground))]">Aucun domaine personnalisé n’est encore connecté.</p> : <div className="space-y-3">{domains.map(domain => <div key={domain.id} className="rounded-xl border p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><strong>{domain.domain}</strong><StatusPill value={domain.status === 'ACTIVE' ? 'ACTIVE' : 'PENDING'} /></div><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{domain.status === 'ACTIVE' ? 'La boutique répond sur ce domaine après configuration de l’hébergement.' : 'En attente de la configuration DNS.'}</p></div><div className="flex gap-2"><button type="button" disabled={!canModify} onClick={() => verifyDomain(domain)} className="rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50">Vérifier</button><button type="button" disabled={!canModify} onClick={() => removeDomain(domain)} className="rounded-lg border border-[hsl(var(--destructive)/.35)] px-3 py-2 text-xs font-bold text-[hsl(var(--destructive))] disabled:opacity-50">Retirer</button></div></div><div className="mt-4 grid gap-3 rounded-lg bg-[hsl(var(--muted)/.35)] p-3 text-xs sm:grid-cols-2"><div><p className="font-bold">Enregistrement TXT de vérification</p><p className="mt-1 break-all text-[hsl(var(--muted-foreground))]">Nom : {domain.verificationName}</p><p className="mt-1 break-all text-[hsl(var(--muted-foreground))]">Valeur : {domain.verificationValue}</p></div><div><p className="font-bold">Cible DNS Render</p><p className="mt-1 break-all text-[hsl(var(--muted-foreground))]">Cible : {domain.targetHost}</p><p className="mt-1 text-[hsl(var(--muted-foreground))]">Pour un sous-domaine, configurez le CNAME demandé par Render vers cette cible. Pour un domaine racine, utilisez les enregistrements A/ANAME indiqués par Render. Ajoutez aussi le TXT ci-dessus si votre registrar le permet, attendez la propagation, puis cliquez sur Vérifier.</p></div></div>{domain.lastError && <p className="mt-3 text-xs text-[hsl(var(--destructive))]">{domain.lastError}</p>}</div>)}</div>}
      </div>
    </Panel>
  </div>;
}

function ColorField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean }) {
  return <label className="block text-xs font-bold">{label}<div className="mt-1.5 flex gap-2"><input type="color" value={value || '#d8a21b'} onChange={event => onChange(event.target.value)} disabled={disabled} className="h-11 w-12 rounded-lg border p-1" /><input value={value} onChange={event => onChange(event.target.value)} disabled={disabled} className="min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-sm" placeholder="#D8A21B" /></div></label>;
}

function OrderRow({ order, currency }: { order: EcommerceOrder; currency: EcommerceStore['currency'] }) {
  return <div className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--primary))]"><ShoppingBag size={16} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{order.reference} <span className="font-normal text-[hsl(var(--muted-foreground))]">· {order.customerName}</span></p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{dateLabel(order.createdAt)}</p></div><div className="text-right"><p className="text-sm font-bold">{money(order.total, currency)}</p><StatusPill value={order.status} /></div></div>;
}

function Panel({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return <section className="card-surface overflow-hidden rounded-2xl"><header className="section-heading border-b px-5 py-4 sm:px-6"><div><h2 className="font-bold">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{description}</p>}</div>{action}</header><div className="p-5 sm:p-6">{children}</div></section>;
}

function Metric({ label, value, detail, icon: Icon, accent, warning }: { label: string; value: string; detail: string; icon: typeof CircleDollarSign; accent?: boolean; warning?: boolean }) {
  return <div className={`metric-card card-surface rounded-xl p-4 ${accent ? 'border-[hsl(var(--primary)/.3)]' : ''}`}><div className="flex items-start justify-between gap-2"><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${warning ? 'bg-[hsl(var(--accent)/.18)] text-[hsl(var(--foreground))]' : 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]'}`}><Icon size={17} /></span><span className="mono text-[9px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Live</span></div><p className="mt-5 text-xs text-[hsl(var(--muted-foreground))]">{label}</p><p className="mt-1 text-2xl font-bold tracking-[-.04em]">{value}</p><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{detail}</p></div>;
}

function Insight({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div className="rounded-xl border bg-[hsl(var(--muted)/.25)] p-4"><p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{detail}</p></div>;
}

function Empty({ icon: Icon, title, text, action }: { icon: typeof Package; title: string; text: string; action?: ReactNode }) {
  return <div className="rounded-xl border border-dashed bg-[hsl(var(--muted)/.18)] px-5 py-10 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><Icon size={19} /></span><h3 className="mt-4 text-sm font-bold">{title}</h3><p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-[hsl(var(--muted-foreground))]">{text}</p>{action && <div className="mt-4">{action}</div>}</div>;
}

function StatusPill({ value }: { value: string }) {
  const positive = ['PUBLISHED', 'LIVRÉE', 'Disponible'];
  const warning = ['DRAFT', 'NOUVELLE', 'CONFIRMÉE', 'EN PRÉPARATION'];
  const danger = ['ARCHIVED', 'ANNULÉE'];
  const tone = positive.includes(value) ? 'bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]' : warning.includes(value) ? 'bg-[hsl(var(--accent)/.16)] text-[hsl(var(--foreground))]' : danger.includes(value) ? 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]';
  return <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[.06em] ${tone}`}>{value}</span>;
}

function Field({ label, value, onChange, placeholder, type = 'text', required, disabled }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean; disabled?: boolean }) {
  if (label === 'Slug' || label === 'Slug public (optionnel)') {
    return <div className="rounded-lg border bg-[hsl(var(--muted)/.28)] px-3 py-2.5"><span className="block text-[11px] font-bold text-[hsl(var(--muted-foreground))]">Slug généré automatiquement</span><span className="mono mt-1 block truncate text-xs">{value || 'Sera créé à partir du nom'}</span></div>;
  }
  return <label className="block text-xs font-bold">{label}{required && <span className="ml-1 text-[hsl(var(--destructive))]">*</span>}<input required={required} disabled={disabled} type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60" /></label>;
}

function Modal({ title, onClose, children, large = false }: { title: string; onClose: () => void; children: ReactNode; large?: boolean }) {
  return <div className="modal-backdrop fixed inset-0 z-40 flex items-center justify-center bg-[hsl(var(--foreground)/.4)] p-4 backdrop-blur-sm" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" className={`modal-panel card-surface w-full rounded-2xl p-5 fade-up sm:p-6 ${large ? 'max-h-[92vh] max-w-5xl overflow-y-auto sm:p-8' : 'max-w-2xl'}`}><header className="modal-header flex items-center justify-between gap-4"><h2 className="text-lg font-bold">{title}</h2><button type="button" aria-label="Fermer" onClick={onClose} className="rounded-lg p-2 hover:bg-[hsl(var(--muted))]"><X size={17} /></button></header><div className="modal-body pt-5">{children}</div></section></div>;
}