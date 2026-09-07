import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Heart, LockKeyhole, LogIn, MapPin, Menu, Minus, Package, Plus, ShoppingBag, Store, UserRound, X } from 'lucide-react';
import { useLocation } from 'wouter';
import {
  createCustomerApi,
  publicEcommerceApi,
  type EcommerceCustomer,
  type EcommerceCustomerAddress,
  type EcommerceCustomerBootstrap,
  type EcommerceCustomerCartLine,
  type PublicShopBootstrap,
} from '@/lib/ecommerce-api';

type PublicProduct = PublicShopBootstrap['products'][number];
type CartLine = { product: PublicProduct; quantity: number };
type AccountSection = 'dashboard' | 'orders' | 'profile' | 'addresses' | 'favorites';

const money = (value: number, currency: PublicShopBootstrap['store']['currency']) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: currency === 'XOF' ? 0 : 2 }).format(value) + ` ${currency}`;

const readableDate = (value: string) =>
  new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value));

const customerCartToLines = (items: EcommerceCustomerCartLine[], products: PublicProduct[]): CartLine[] =>
  items.flatMap(item => {
    const product = products.find(candidate => candidate.slug === item.productSlug);
    return product ? [{ product, quantity: Math.min(item.quantity, product.stock) }] : [];
  });

const addressText = (address: EcommerceCustomerAddress) =>
  [address.line1, address.line2, address.postalCode, address.city, address.region, address.country].filter(Boolean).join(', ');

export default function PublicShopPage({ slug, domain = false }: { slug?: string; domain?: boolean }) {
  const [location, setLocation] = useLocation();
  const routePath = location.split('?')[0];
  const [data, setData] = useState<PublicShopBootstrap | null>(null);
  const [customer, setCustomer] = useState<EcommerceCustomer | null>(null);
  const [customerData, setCustomerData] = useState<EcommerceCustomerBootstrap | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [submitted, setSubmitted] = useState<{ reference: string; total: number } | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [checkoutForm, setCheckoutForm] = useState({ customerName: '', customerEmail: '', customerPhone: '', shippingAddress: '', note: '' });
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [addressForm, setAddressForm] = useState<Omit<EcommerceCustomerAddress, 'id'>>({
    label: 'Domicile',
    recipientName: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    region: '',
    postalCode: '',
    country: 'Sénégal',
    isDefault: true,
  });
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  const api = useMemo(() => createCustomerApi(slug), [slug]);
  const total = useMemo(() => cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, line) => sum + line.quantity, 0), [cart]);
  const accountSection = useMemo<AccountSection>(() => {
    if (routePath.includes('/compte/commandes')) return 'orders';
    if (routePath.endsWith('/profil')) return 'profile';
    if (routePath.endsWith('/adresses')) return 'addresses';
    if (routePath.endsWith('/favoris')) return 'favorites';
    return 'dashboard';
  }, [routePath]);
  const orderDetailId = useMemo(() => {
    const match = routePath.match(/\/compte\/commandes\/([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  }, [routePath]);
  const isAuthRoute = routePath.endsWith('/connexion') || routePath.endsWith('/inscription-client');
  const isCartRoute = routePath.endsWith('/panier');
  const isAccountRoute = routePath.includes('/compte');

  const shopPath = (suffix = '') => slug ? `/shop/${encodeURIComponent(slug)}${suffix}` : suffix || '/';
  const go = (suffix: string) => {
    setMobileMenu(false);
    setLocation(shopPath(suffix));
  };

  const loadCustomer = async (nextCustomer?: EcommerceCustomer | null) => {
    const current = nextCustomer === undefined ? (await api.session()).customer : nextCustomer;
    setCustomer(current);
    if (!current) {
      setCustomerData(null);
      return;
    }
    setCustomerLoading(true);
    try {
      const bootstrap = await api.bootstrap();
      setCustomerData(bootstrap);
      setCart(customerCartToLines(bootstrap.cart, data?.products ?? []));
      setProfileForm({ name: bootstrap.customer.name, phone: bootstrap.customer.phone });
      const firstAddress = bootstrap.addresses.find(address => address.isDefault) ?? bootstrap.addresses[0];
      if (firstAddress) setCheckoutForm(form => ({ ...form, customerName: bootstrap.customer.name, customerEmail: bootstrap.customer.email, customerPhone: bootstrap.customer.phone, shippingAddress: addressText(firstAddress) }));
      else setCheckoutForm(form => ({ ...form, customerName: bootstrap.customer.name, customerEmail: bootstrap.customer.email, customerPhone: bootstrap.customer.phone }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Votre espace client est indisponible.');
    } finally {
      setCustomerLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const shopLoad = domain
      ? publicEcommerceApi.bootstrapDomain().then(result => {
          if (!('store' in result)) throw new Error('Aucune boutique publiée ne correspond à ce domaine.');
          return result;
        })
      : publicEcommerceApi.bootstrap(slug ?? '');
    void shopLoad
      .then(async result => {
        if (cancelled) return;
        setData(result);
        const session = await api.session();
        if (cancelled) return;
        setCustomer(session.customer);
        if (session.customer) {
          const bootstrap = await api.bootstrap();
          if (cancelled) return;
          setCustomerData(bootstrap);
          setCart(customerCartToLines(bootstrap.cart, result.products));
          setProfileForm({ name: bootstrap.customer.name, phone: bootstrap.customer.phone });
        } else {
          try {
            const saved = JSON.parse(localStorage.getItem(`ecommerce-cart:${slug ?? 'domain'}`) ?? '[]') as Array<{ productSlug: string; quantity: number }>;
            setCart(saved.flatMap(item => {
              const product = result.products.find(candidate => candidate.slug === item.productSlug);
              return product ? [{ product, quantity: Math.min(item.quantity, product.stock) }] : [];
            }));
          } catch {
            setCart([]);
          }
        }
      })
      .catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Boutique indisponible.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [api, domain, slug]);

  useEffect(() => {
    if (customer || !data) return;
    localStorage.setItem(`ecommerce-cart:${slug ?? 'domain'}`, JSON.stringify(cart.map(line => ({ productSlug: line.product.slug, quantity: line.quantity }))));
  }, [cart, customer, data, slug]);

  useEffect(() => {
    if (isAccountRoute && !customer && !loading) go('/connexion');
  }, [customer, isAccountRoute, loading]);

  const syncCart = async (next: CartLine[]) => {
    setCart(next);
    if (!customer) return;
    try {
      const previous = customerData?.cart ?? [];
      const nextSlugs = new Set(next.map(line => line.product.slug));
      for (const line of previous) {
        if (!nextSlugs.has(line.productSlug)) await api.putCartItem(line.productSlug, 0);
      }
      for (const line of next) await api.putCartItem(line.product.slug, line.quantity);
      const refreshed = await api.bootstrap();
      setCustomerData(refreshed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Le panier n’a pas pu être synchronisé.');
    }
  };

  const add = (product: PublicProduct) => {
    const existing = cart.find(line => line.product.slug === product.slug);
    const next = existing
      ? cart.map(line => line.product.slug === product.slug ? { ...line, quantity: Math.min(product.stock, line.quantity + 1) } : line)
      : [...cart, { product, quantity: 1 }];
    void syncCart(next);
  };

  const change = (productSlug: string, delta: number) => {
    const next = cart.flatMap(line => {
      if (line.product.slug !== productSlug) return [line];
      const quantity = line.quantity + delta;
      return quantity <= 0 ? [] : [{ ...line, quantity: Math.min(line.product.stock, quantity) }];
    });
    void syncCart(next);
  };

  const submitAuth = async () => {
    setError('');
    try {
      const result = authMode === 'login'
        ? await api.login({ email: authForm.email, password: authForm.password })
        : await api.register(authForm);
      await loadCustomer(result.customer);
      setNotice('Vous êtes connecté.');
      go('/compte');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La connexion n’a pas abouti.');
    }
  };

  const submitOrder = async () => {
    if (!data || cart.length === 0) return;
    setError('');
    try {
      const order = domain
        ? await publicEcommerceApi.createDomainOrder({ ...checkoutForm, items: cart.map(line => ({ productSlug: line.product.slug, quantity: line.quantity })) })
        : await publicEcommerceApi.createOrder(slug ?? '', { ...checkoutForm, items: cart.map(line => ({ productSlug: line.product.slug, quantity: line.quantity })) });
      setSubmitted(order);
      setCart([]);
      if (customer) {
        await api.clearCart();
        const refreshed = await api.bootstrap();
        setCustomerData(refreshed);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La commande n’a pas pu être envoyée.');
    }
  };

  const toggleFavorite = async (product: PublicProduct) => {
    if (!customer) {
      go('/connexion');
      return;
    }
    try {
      const result = await api.toggleFavorite(product.slug);
      setCustomerData(current => current ? { ...current, favoriteProductSlugs: result.favoriteProductSlugs } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Le favori n’a pas pu être modifié.');
    }
  };

  const saveProfile = async () => {
    try {
      const updated = await api.updateProfile(profileForm);
      setCustomer(updated);
      setCustomerData(current => current ? { ...current, customer: updated } : current);
      setNotice('Profil mis à jour.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Le profil n’a pas pu être enregistré.');
    }
  };

  const savePassword = async () => {
    try {
      await api.changePassword(passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '' });
      setNotice('Mot de passe modifié. Les autres sessions ont été fermées.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Le mot de passe n’a pas pu être modifié.');
    }
  };

  const saveAddress = async () => {
    try {
      const saved = editingAddressId
        ? await api.updateAddress(editingAddressId, addressForm)
        : await api.createAddress(addressForm);
      const refreshed = await api.bootstrap();
      setCustomerData(refreshed);
      setEditingAddressId(null);
      setAddressForm({ label: 'Domicile', recipientName: customer?.name ?? '', phone: customer?.phone ?? '', line1: '', line2: '', city: '', region: '', postalCode: '', country: 'Sénégal', isDefault: false });
      setNotice('Adresse enregistrée.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'L’adresse n’a pas pu être enregistrée.');
    }
  };

  const deleteAddress = async (id: string) => {
    try {
      await api.deleteAddress(id);
      setCustomerData(current => current ? { ...current, addresses: current.addresses.filter(address => address.id !== id) } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'L’adresse n’a pas pu être supprimée.');
    }
  };

  if (loading) return <div className="min-h-screen bg-[hsl(var(--background))] p-6"><div className="mx-auto max-w-6xl animate-pulse"><div className="h-12 w-64 rounded bg-[hsl(var(--muted))]" /><div className="mt-8 h-64 rounded-3xl bg-[hsl(var(--muted))]" /></div></div>;
  if (!data) return <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] p-6"><section className="card-surface max-w-md rounded-2xl p-8 text-center"><Store className="mx-auto text-[hsl(var(--primary))]" size={30} /><h1 className="mt-4 text-xl font-bold">Boutique indisponible</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{error}</p></section></div>;

  const { store, products } = data;
  const selectedOrder = customerData?.orders.find(order => order.id === orderDetailId);
  const publicNav = [
    { label: 'Boutique', path: '' },
    { label: 'Panier', path: '/panier' },
    { label: customer ? 'Mon compte' : 'Se connecter', path: customer ? '/compte' : '/connexion' },
  ];
  const isFavorite = (product: PublicProduct) => customerData?.favoriteProductSlugs.includes(product.slug) ?? false;

  return <div className="min-h-screen bg-[hsl(var(--background))]" style={{ '--shop-primary': store.primaryColor, '--shop-accent': store.accentColor } as React.CSSProperties}>
    <header className="border-b bg-[var(--shop-accent)] text-white">
      <div className="flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <button type="button" onClick={() => go('')} className="flex min-w-0 shrink-0 items-center gap-3 text-left"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--shop-primary)] text-[var(--shop-accent)]"><ShoppingBag size={21} /></span><span className="min-w-0"><span className="block truncate text-lg font-bold">{store.name}</span><span className="block truncate text-xs text-white/65">{store.description}</span></span></button>
        <button type="button" className="rounded-lg p-2 sm:hidden" onClick={() => setMobileMenu(open => !open)} aria-label="Ouvrir le menu"><Menu size={21} /></button>
        <nav className={`${mobileMenu ? 'flex' : 'hidden'} absolute left-4 right-4 top-20 z-20 flex-col gap-1 rounded-2xl bg-[var(--shop-accent)] p-3 shadow-xl sm:static sm:flex sm:flex-row sm:items-center sm:bg-transparent sm:p-0 sm:shadow-none`}>
          {publicNav.map(item => <button type="button" key={item.path} onClick={() => go(item.path)} className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white">{item.label}{item.path === '/panier' && cartCount > 0 ? ` (${cartCount})` : ''}</button>)}
        </nav>
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      {error && <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Fermer"><X size={16} /></button></div>}
      {notice && <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Check size={16} /><span>{notice}</span><button type="button" className="ml-auto" onClick={() => setNotice('')} aria-label="Fermer"><X size={16} /></button></div>}
      {submitted ? <section className="mx-auto max-w-xl rounded-3xl border bg-[hsl(var(--card))] p-8 text-center shadow-sm sm:p-10"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check size={26} /></span><h1 className="mt-5 text-2xl font-bold">Commande confirmée</h1><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Votre commande est enregistrée sous la référence <strong className="text-[hsl(var(--foreground))]">{submitted.reference}</strong>.</p><p className="mt-4 text-lg font-bold" style={{ color: 'var(--shop-primary)' }}>{money(submitted.total, store.currency)}</p><button type="button" onClick={() => { setSubmitted(null); go(''); }} className="mt-7 rounded-xl px-5 py-3 text-sm font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>Continuer mes achats</button></section>
        : isAuthRoute ? <AuthPanel mode={authMode} setMode={setAuthMode} form={authForm} setForm={setAuthForm} onSubmit={() => void submitAuth()} onBack={() => go('')} />
        : isCartRoute ? <CartPanel cart={cart} total={total} store={store} customer={customer} form={checkoutForm} setForm={setCheckoutForm} onChange={change} onSubmit={() => void submitOrder()} onBack={() => go('')} />
        : isAccountRoute && customer ? <AccountPanel section={accountSection} customer={customer} products={products} customerData={customerData} customerLoading={customerLoading} selectedOrder={selectedOrder} profileForm={profileForm} setProfileForm={setProfileForm} passwordForm={passwordForm} setPasswordForm={setPasswordForm} addressForm={addressForm} setAddressForm={setAddressForm} editingAddressId={editingAddressId} setEditingAddressId={setEditingAddressId} onProfile={() => void saveProfile()} onPassword={() => void savePassword()} onAddress={() => void saveAddress()} onDeleteAddress={id => void deleteAddress(id)} onFavorite={product => void toggleFavorite(product)} onOrder={id => { setMobileMenu(false); setLocation(shopPath(id ? `/compte/commandes/${encodeURIComponent(id)}` : '/compte/commandes')); }} onLogout={() => void api.logout().then(() => { setCustomer(null); setCustomerData(null); setCart([]); go(''); })} onNavigate={go} />
       : <><section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em]" style={{ color: 'var(--shop-primary)' }}>Sélection de la boutique</p><h1 className="mt-2 text-3xl font-bold tracking-[-.04em] sm:text-4xl">Trouvez ce qu’il vous faut.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Commandez en ligne et retrouvez vos commandes dans votre espace client.</p></div><button type="button" onClick={() => go('/compte/favoris')} className="inline-flex items-center gap-2 self-start rounded-xl border px-3 py-2.5 text-sm font-bold sm:self-auto"><Heart size={16} />Favoris</button></section>{products.length === 0 ? <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">Aucun produit n’est disponible pour le moment.</div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{products.map(product => <article key={product.slug} className="overflow-hidden rounded-2xl border border-[#e8e0d4] bg-white shadow-sm"><div className="relative flex aspect-[16/9] items-center justify-center bg-[#fbfaf7]">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain p-4 sm:p-5" /> : <Package size={38} className="text-[hsl(var(--muted-foreground))]" />}<button type="button" onClick={() => void toggleFavorite(product)} className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow-sm" aria-label={isFavorite(product) ? 'Retirer des favoris' : 'Ajouter aux favoris'}><Heart size={17} fill={isFavorite(product) ? 'currentColor' : 'none'} className={isFavorite(product) ? 'text-red-600' : ''} /></button></div><div className="border-t border-[#e8e0d4] bg-[#f7f2ea] p-4"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#8c6c37]">{product.category}</p><div className="mt-2 flex items-start justify-between gap-3"><h2 className="min-w-0 text-base font-bold text-[#20252f]">{product.name}</h2><p className="shrink-0 text-base font-bold" style={{ color: 'var(--shop-accent)' }}>{money(product.price, store.currency)}</p></div><p className="mt-2 min-h-10 text-sm leading-5 text-[#655e55]">{product.description || 'Une référence sélectionnée par votre boutique.'}</p><div className="mt-5 flex justify-end"><button type="button" onClick={() => add(product)} className="rounded-xl px-3.5 py-2.5 text-xs font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>Ajouter</button></div></div></article>)}</div>}</>}
    </main>
  </div>;
}

function AuthPanel({ mode, setMode, form, setForm, onSubmit, onBack }: { mode: 'login' | 'register'; setMode: (mode: 'login' | 'register') => void; form: { name: string; email: string; phone: string; password: string }; setForm: (form: { name: string; email: string; phone: string; password: string }) => void; onSubmit: () => void; onBack: () => void }) {
  return <section className="mx-auto max-w-md rounded-3xl border bg-[hsl(var(--card))] p-6 shadow-sm sm:p-8"><button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))]"><ArrowLeft size={15} />Retour à la boutique</button><div className="mt-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--muted))]"><LockKeyhole size={22} /></div><h1 className="mt-5 text-2xl font-bold">{mode === 'login' ? 'Bienvenue dans votre espace' : 'Créer votre compte client'}</h1><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{mode === 'login' ? 'Suivez vos commandes et retrouvez vos informations de livraison.' : 'Votre compte est propre à cette boutique et ne donne accès qu’à vos données.'}</p><div className="mt-6 space-y-3">{mode === 'register' && <><input className="w-full rounded-xl border px-3 py-3 text-sm" placeholder="Nom complet" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /><input className="w-full rounded-xl border px-3 py-3 text-sm" placeholder="Téléphone" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} /></>}<input className="w-full rounded-xl border px-3 py-3 text-sm" placeholder="Email" type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /><input className="w-full rounded-xl border px-3 py-3 text-sm" placeholder="Mot de passe (8 caractères minimum)" type="password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} /></div><button type="button" onClick={onSubmit} className="mt-5 w-full rounded-xl py-3.5 text-sm font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>{mode === 'login' ? 'Se connecter' : 'Créer mon compte'}</button><button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="mt-4 w-full text-sm font-semibold underline underline-offset-4">{mode === 'login' ? 'Créer un compte' : 'J’ai déjà un compte'}</button></section>;
}

function CartPanel({ cart, total, store, customer, form, setForm, onChange, onSubmit, onBack }: { cart: CartLine[]; total: number; store: PublicShopBootstrap['store']; customer: EcommerceCustomer | null; form: { customerName: string; customerEmail: string; customerPhone: string; shippingAddress: string; note: string }; setForm: (form: { customerName: string; customerEmail: string; customerPhone: string; shippingAddress: string; note: string }) => void; onChange: (slug: string, delta: number) => void; onSubmit: () => void; onBack: () => void }) {
  return <section className="mx-auto max-w-3xl"><button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))]"><ArrowLeft size={15} />Continuer mes achats</button><div className="mt-5 rounded-3xl border bg-[hsl(var(--card))] p-5 shadow-sm sm:p-8"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em]" style={{ color: 'var(--shop-primary)' }}>Panier</p><h1 className="mt-1 text-2xl font-bold">Votre commande</h1></div><ShoppingBag size={24} /></div>{cart.length === 0 ? <p className="py-14 text-center text-sm text-[hsl(var(--muted-foreground))]">Votre panier est vide.</p> : <><div className="mt-6 divide-y border-y">{cart.map(line => <div key={line.product.slug} className="flex items-center gap-3 py-4"><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{line.product.name}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{money(line.product.price, store.currency)}</p></div><div className="flex items-center gap-2 rounded-lg border px-2 py-1"><button type="button" onClick={() => onChange(line.product.slug, -1)} aria-label="Retirer une unité"><Minus size={14} /></button><span className="w-5 text-center text-sm font-bold">{line.quantity}</span><button type="button" onClick={() => onChange(line.product.slug, 1)} aria-label="Ajouter une unité"><Plus size={14} /></button></div><p className="w-24 text-right text-sm font-bold">{money(line.product.price * line.quantity, store.currency)}</p></div>)}</div><div className="mt-5 flex items-center justify-between text-lg font-bold"><span>Total</span><span>{money(total, store.currency)}</span></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Nom complet" value={form.customerName} onChange={event => setForm({ ...form, customerName: event.target.value })} /><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Email" type="email" value={form.customerEmail} onChange={event => setForm({ ...form, customerEmail: event.target.value })} /><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Téléphone" value={form.customerPhone} onChange={event => setForm({ ...form, customerPhone: event.target.value })} /><textarea className="rounded-xl border px-3 py-3 text-sm sm:col-span-2" rows={3} placeholder="Adresse de livraison" value={form.shippingAddress} onChange={event => setForm({ ...form, shippingAddress: event.target.value })} /><textarea className="rounded-xl border px-3 py-3 text-sm sm:col-span-2" rows={2} placeholder="Note pour la boutique (facultatif)" value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} /></div>{customer && <p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">Cette commande sera rattachée à votre compte client.</p>}<button type="button" onClick={onSubmit} disabled={!form.customerName.trim() || !form.customerEmail.trim() || !form.shippingAddress.trim() || cart.length === 0} className="mt-6 w-full rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: 'var(--shop-accent)' }}>Envoyer la commande</button></>}</div></section>;
}

function AccountPanel(props: { section: AccountSection; customer: EcommerceCustomer; products: PublicProduct[]; customerData: EcommerceCustomerBootstrap | null; customerLoading: boolean; selectedOrder?: EcommerceCustomerBootstrap['orders'][number]; profileForm: { name: string; phone: string }; setProfileForm: (form: { name: string; phone: string }) => void; passwordForm: { currentPassword: string; newPassword: string }; setPasswordForm: (form: { currentPassword: string; newPassword: string }) => void; addressForm: Omit<EcommerceCustomerAddress, 'id'>; setAddressForm: (form: Omit<EcommerceCustomerAddress, 'id'>) => void; editingAddressId: string | null; setEditingAddressId: (id: string | null) => void; onProfile: () => void; onPassword: () => void; onAddress: () => void; onDeleteAddress: (id: string) => void; onFavorite: (product: PublicProduct) => void; onOrder: (id: string) => void; onLogout: () => void; onNavigate: (path: string) => void }) {
  const { section, customer, customerData, customerLoading } = props;
  const orders = customerData?.orders ?? [];
  const addresses = customerData?.addresses ?? [];
  const favoriteCount = customerData?.favoriteProductSlugs.length ?? 0;
  const tabs = [['dashboard', 'Vue d’ensemble', '/compte'], ['orders', 'Commandes', '/compte/commandes'], ['profile', 'Profil & sécurité', '/compte/profil'], ['addresses', 'Adresses', '/compte/adresses'], ['favorites', `Favoris (${favoriteCount})`, '/compte/favoris']] as const;
  return <section className="grid gap-6 lg:grid-cols-[220px_1fr]"><aside className="rounded-2xl border bg-[hsl(var(--card))] p-3 shadow-sm"><div className="flex items-center gap-3 border-b px-2 pb-4"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--muted))]"><UserRound size={18} /></span><div className="min-w-0"><p className="truncate text-sm font-bold">{customer.name}</p><p className="truncate text-xs text-[hsl(var(--muted-foreground))]">{customer.email}</p></div></div><nav className="mt-3 grid gap-1">{tabs.map(([key, label, path]) => <button type="button" key={key} onClick={() => props.onNavigate(path)} className={`rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${section === key ? 'bg-[var(--shop-accent)] text-white' : 'hover:bg-[hsl(var(--muted))]'}`}>{label}</button>)}<button type="button" onClick={props.onLogout} className="mt-3 border-t px-3 py-3 text-left text-sm font-semibold text-red-700">Se déconnecter</button></nav></aside><div className="min-w-0">{customerLoading ? <div className="rounded-2xl border bg-[hsl(var(--card))] p-8 text-sm text-[hsl(var(--muted-foreground))]">Chargement de votre espace…</div> : section === 'dashboard' ? <><h1 className="text-2xl font-bold">Bonjour {customer.name.split(' ')[0]}.</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Retrouvez vos commandes et vos informations enregistrées.</p><div className="mt-6 grid gap-4 sm:grid-cols-3"><button type="button" onClick={() => props.onNavigate('/compte/commandes')} className="rounded-2xl border bg-[hsl(var(--card))] p-5 text-left shadow-sm"><Package size={19} /><p className="mt-5 text-2xl font-bold">{orders.length}</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Commande(s)</p></button><button type="button" onClick={() => props.onNavigate('/compte/adresses')} className="rounded-2xl border bg-[hsl(var(--card))] p-5 text-left shadow-sm"><MapPin size={19} /><p className="mt-5 text-2xl font-bold">{addresses.length}</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Adresse(s)</p></button><button type="button" onClick={() => props.onNavigate('/compte/favoris')} className="rounded-2xl border bg-[hsl(var(--card))] p-5 text-left shadow-sm"><Heart size={19} /><p className="mt-5 text-2xl font-bold">{favoriteCount}</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Favori(s)</p></button></div></> : section === 'orders' ? <OrderSection orders={orders} selectedOrder={props.selectedOrder} onOrder={props.onOrder} /> : section === 'profile' ? <ProfileSection customer={customer} profileForm={props.profileForm} setProfileForm={props.setProfileForm} passwordForm={props.passwordForm} setPasswordForm={props.setPasswordForm} onProfile={props.onProfile} onPassword={props.onPassword} /> : section === 'addresses' ? <AddressSection addresses={addresses} form={props.addressForm} setForm={props.setAddressForm} editingId={props.editingAddressId} setEditingId={props.setEditingAddressId} customer={customer} onSave={props.onAddress} onDelete={props.onDeleteAddress} /> : <FavoriteSection products={props.products} favoriteSlugs={customerData?.favoriteProductSlugs ?? []} onToggle={props.onFavorite} onNavigate={props.onNavigate} />}</div></section>;
}

function FavoriteSection({ products, favoriteSlugs, onToggle, onNavigate }: { products: PublicProduct[]; favoriteSlugs: string[]; onToggle: (product: PublicProduct) => void; onNavigate: (path: string) => void }) {
  const favorites = products.filter(product => favoriteSlugs.includes(product.slug));

  return <div><h1 className="text-2xl font-bold">Vos favoris</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Les produits enregistrés dans votre compte sur cette boutique.</p>{favorites.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed p-10 text-center text-sm text-[hsl(var(--muted-foreground))]">Aucun produit favori disponible actuellement.</div> : <div className="mt-6 grid gap-3 sm:grid-cols-2">{favorites.map(product => <div key={product.slug} className="flex items-center gap-4 rounded-2xl border bg-[hsl(var(--card))] p-4 shadow-sm"><div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[hsl(var(--muted))]">{product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-cover" /> : <Package size={20} />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{product.name}</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{product.price}</p></div><button type="button" onClick={() => onToggle(product)} className="rounded-lg border p-2 text-red-600" aria-label="Retirer des favoris"><Heart size={17} fill="currentColor" /></button></div>)}</div>}<button type="button" onClick={() => onNavigate('')} className="mt-6 rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>Voir la boutique</button></div>;
}

function OrderSection({ orders, selectedOrder, onOrder }: { orders: EcommerceCustomerBootstrap['orders']; selectedOrder?: EcommerceCustomerBootstrap['orders'][number]; onOrder: (id: string) => void }) {
  return <><div className="flex items-end justify-between gap-3"><div><h1 className="text-2xl font-bold">Vos commandes</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Le statut de préparation et de livraison communiqué par la boutique.</p></div></div>{selectedOrder ? <div className="mt-6 rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm"><button type="button" onClick={() => onOrder('')} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft size={15} />Toutes les commandes</button><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-[hsl(var(--muted-foreground))]">{readableDate(selectedOrder.createdAt)}</p><h2 className="mt-1 text-xl font-bold">{selectedOrder.reference}</h2></div><div className="text-right"><p className="text-sm font-bold">{selectedOrder.status}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Paiement : {selectedOrder.paymentStatus}</p></div></div><div className="mt-6 divide-y border-y">{selectedOrder.items.map(item => <div key={item.id} className="flex justify-between gap-4 py-4 text-sm"><span>{item.productName} × {item.quantity}</span><strong>{item.lineTotal}</strong></div>)}</div><div className="mt-5 flex justify-between font-bold"><span>Total</span><span>{selectedOrder.total}</span></div><p className="mt-5 rounded-xl bg-[hsl(var(--muted)/.5)] p-4 text-sm">{selectedOrder.shippingAddress}</p></div> : orders.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed p-10 text-center text-sm text-[hsl(var(--muted-foreground))]">Aucune commande liée à ce compte.</div> : <div className="mt-6 grid gap-3">{orders.map(order => <button type="button" key={order.id} onClick={() => onOrder(order.id)} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-[hsl(var(--card))] p-5 text-left shadow-sm hover:border-[var(--shop-primary)]"><div><p className="text-sm font-bold">{order.reference}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{readableDate(order.createdAt)} · {order.items.length} article(s)</p></div><div className="text-right"><p className="text-sm font-bold">{order.total}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{order.status}</p></div></button>)}</div>}</>;
}

function ProfileSection({ customer, profileForm, setProfileForm, passwordForm, setPasswordForm, onProfile, onPassword }: { customer: EcommerceCustomer; profileForm: { name: string; phone: string }; setProfileForm: (form: { name: string; phone: string }) => void; passwordForm: { currentPassword: string; newPassword: string }; setPasswordForm: (form: { currentPassword: string; newPassword: string }) => void; onProfile: () => void; onPassword: () => void }) {
  return <div className="grid gap-5 xl:grid-cols-2"><section className="rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm"><h1 className="text-xl font-bold">Profil</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Vos informations servent uniquement à cette boutique.</p><div className="mt-5 grid gap-3"><input className="rounded-xl border px-3 py-3 text-sm" value={profileForm.name} onChange={event => setProfileForm({ ...profileForm, name: event.target.value })} /><input className="rounded-xl border px-3 py-3 text-sm" value={customer.email} disabled /><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Téléphone" value={profileForm.phone} onChange={event => setProfileForm({ ...profileForm, phone: event.target.value })} /></div><button type="button" onClick={onProfile} className="mt-5 rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>Enregistrer</button></section><section className="rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm"><h2 className="text-xl font-bold">Sécurité</h2><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Changez votre mot de passe. Les sessions existantes seront révoquées.</p><div className="mt-5 grid gap-3"><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Mot de passe actuel" type="password" value={passwordForm.currentPassword} onChange={event => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} /><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Nouveau mot de passe" type="password" value={passwordForm.newPassword} onChange={event => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} /></div><button type="button" onClick={onPassword} className="mt-5 rounded-xl border px-4 py-2.5 text-sm font-bold">Changer le mot de passe</button></section></div>;
}

function AddressSection({ addresses, form, setForm, editingId, setEditingId, customer, onSave, onDelete }: { addresses: EcommerceCustomerAddress[]; form: Omit<EcommerceCustomerAddress, 'id'>; setForm: (form: Omit<EcommerceCustomerAddress, 'id'>) => void; editingId: string | null; setEditingId: (id: string | null) => void; customer: EcommerceCustomer; onSave: () => void; onDelete: (id: string) => void }) {
  const reset = () => { setEditingId(null); setForm({ label: 'Domicile', recipientName: customer.name, phone: customer.phone, line1: '', line2: '', city: '', region: '', postalCode: '', country: 'Sénégal', isDefault: false }); };
  return <div><div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold">Adresses</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Gérez vos adresses de livraison enregistrées.</p></div><button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>Nouvelle adresse</button></div><div className="mt-6 grid gap-3">{addresses.map(address => <div key={address.id} className="rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h2 className="font-bold">{address.label}</h2>{address.isDefault && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800">Par défaut</span>}</div><p className="mt-2 text-sm">{address.recipientName} · {address.phone}</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{addressText(address)}</p></div><div className="flex gap-2"><button type="button" onClick={() => { setEditingId(address.id); setForm(address); }} className="rounded-lg border px-3 py-2 text-xs font-bold">Modifier</button><button type="button" onClick={() => onDelete(address.id)} className="rounded-lg border px-3 py-2 text-xs font-bold text-red-700">Supprimer</button></div></div></div>)}</div>{(editingId || addresses.length === 0) && <div className="mt-6 rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">{editingId ? 'Modifier l’adresse' : 'Ajouter une adresse'}</h2><button type="button" onClick={reset} aria-label="Annuler"><X size={18} /></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{(['label', 'recipientName', 'phone', 'line1', 'line2', 'city', 'region', 'postalCode', 'country'] as const).map(field => <input key={field} className="rounded-xl border px-3 py-3 text-sm" placeholder={{ label: 'Libellé', recipientName: 'Nom du destinataire', phone: 'Téléphone', line1: 'Adresse', line2: 'Complément', city: 'Ville', region: 'Région', postalCode: 'Code postal', country: 'Pays' }[field]} value={form[field]} onChange={event => setForm({ ...form, [field]: event.target.value })} />)}</div><label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isDefault} onChange={event => setForm({ ...form, isDefault: event.target.checked })} />Utiliser comme adresse par défaut</label><button type="button" onClick={onSave} className="mt-5 rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>Enregistrer l’adresse</button></div>}</div>;
}