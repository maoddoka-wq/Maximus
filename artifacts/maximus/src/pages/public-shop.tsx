import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock3, Download, Heart, Home, LockKeyhole, LogIn, MapPin, Menu, Minus, Package, Plus, Search, ShoppingBag, Sparkles, Store, Truck, UserRound, X } from 'lucide-react';
import { useLocation, useSearch } from 'wouter';
import {
  createCustomerApi,
  publicEcommerceApi,
  type EcommerceCustomer,
  type EcommerceCustomerAddress,
  type EcommerceCustomerBootstrap,
  type EcommerceCustomerCartLine,
  type EcommerceDeliveryRequest,
  type EcommerceDeliveryServiceType,
  type PublicPaymentStatus,
  type PublicShopBootstrap,
} from '@/lib/ecommerce-api';
import { canInstallPwa, isIosDevice, isStandalonePwa, mountClientManifest, promptPwaInstall, subscribeToPwaInstall } from '@/lib/pwa';

type PublicProduct = PublicShopBootstrap['products'][number];
type PublicRental = PublicShopBootstrap['rentals'][number];
type CartProduct = PublicProduct & { rentalId?: string };
type CartLine = { product: CartProduct; quantity: number };
type AccountSection = 'dashboard' | 'orders' | 'profile' | 'addresses' | 'favorites';
type PaymentSummary = Pick<PublicPaymentStatus, 'reference' | 'total' | 'paymentStatus' | 'failureReason'>;

const money = (value: number, currency: PublicShopBootstrap['store']['currency']) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: currency === 'XOF' ? 0 : 2 }).format(value) + ` ${currency}`;

const readableDate = (value: string) =>
  new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value));

async function retryRequest<T>(request: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await request();
    } catch (cause) {
      lastError = cause;
      if (attempt < attempts - 1) {
        await new Promise(resolve => window.setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('La requête a échoué.');
}

const customerCartToLines = (items: EcommerceCustomerCartLine[], products: PublicProduct[]): CartLine[] =>
  items.flatMap(item => {
    const product = products.find(candidate => candidate.slug === item.productSlug);
    return product ? [{ product, quantity: Math.min(item.quantity, product.stock) }] : [];
  });

const rentalToCartProduct = (rental: PublicRental): CartProduct => ({
  slug: rental.productSlug || `rental:${rental.id}`,
  name: rental.name,
  description: rental.description,
  category: rental.category,
  categoryId: rental.categoryId,
  price: rental.price,
  compareAtPrice: null,
  stock: rental.availability,
  imageUrl: rental.imageUrl,
  featured: false,
  productType: 'RENTAL',
  rentalPeriod: rental.billingUnit,
  rentalId: rental.productSlug ? undefined : rental.id,
});

const restoreGuestCart = (
  saved: Array<{ productSlug?: string; rentalId?: string; quantity: number }>,
  shop: PublicShopBootstrap,
): CartLine[] => saved.flatMap(item => {
  if (item.rentalId) {
    const rental = shop.rentals.find(candidate => candidate.id === item.rentalId);
    return rental ? [{ product: rentalToCartProduct(rental), quantity: Math.min(item.quantity, rental.availability) }] : [];
  }
  const product = item.productSlug ? shop.products.find(candidate => candidate.slug === item.productSlug) : undefined;
  return product ? [{ product, quantity: Math.min(item.quantity, product.stock) }] : [];
});

const addressText = (address: EcommerceCustomerAddress) =>
  [address.line1, address.line2, address.postalCode, address.city, address.region, address.country].filter(Boolean).join(', ');

export default function PublicShopPage({ slug, domain = false, clientApp = false }: { slug?: string; domain?: boolean; clientApp?: boolean }) {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const routePath = location.split('?')[0];
  const [data, setData] = useState<PublicShopBootstrap | null>(null);
  const [customer, setCustomer] = useState<EcommerceCustomer | null>(null);
  const [customerData, setCustomerData] = useState<EcommerceCustomerBootstrap | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cartNotice, setCartNotice] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [submitted, setSubmitted] = useState<PaymentSummary | null>(null);
  const [checkoutKey, setCheckoutKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [checkoutForm, setCheckoutForm] = useState({ customerName: '', customerEmail: '', customerPhone: '', shippingAddress: '', note: '' });
  const [deliveryForm, setDeliveryForm] = useState({ requesterName: '', requesterEmail: '', requesterPhone: '', address: '', serviceType: 'STANDARD' as EcommerceDeliveryServiceType, desiredDate: '', note: '' });
  const [deliverySubmitted, setDeliverySubmitted] = useState<EcommerceDeliveryRequest | null>(null);
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
  const [installAvailable, setInstallAvailable] = useState(false);
  const paymentReturn = useMemo(() => {
    const query = new URLSearchParams(search);
    const result = query.get('payment');
    const orderId = query.get('order');
    return result && orderId && ['success', 'error', 'return'].includes(result)
      ? { result: result as 'success' | 'error' | 'return', orderId }
      : null;
  }, [search]);

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
  const isLocationRoute = routePath.endsWith('/location');
  const isDeliveryRoute = routePath.endsWith('/livraison');
  const productDetailSlug = useMemo(() => {
    const match = routePath.match(/\/produit\/([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  }, [routePath]);

  useEffect(() => subscribeToPwaInstall(() => setInstallAvailable(canInstallPwa())), []);

  useEffect(() => {
    try {
      localStorage.setItem('maximus-client-pwa-entry', JSON.stringify({ slug: slug ?? null, domain }));
    } catch {
      // L’installation reste possible même si le navigateur bloque le stockage local.
    }
  }, [domain, slug]);

  useEffect(() => {
    if (!data?.store.name.trim()) return undefined;
    const manifestUrl = domain
      ? '/api/shop-domain/manifest.webmanifest'
      : `/api/shop/${encodeURIComponent(slug ?? data.store.slug)}/manifest.webmanifest`;
    return mountClientManifest(manifestUrl, data.store.name, data.store.logoUrl);
  }, [data?.store.logoUrl, data?.store.name, data?.store.slug, domain, slug]);

  useEffect(() => {
    if (routePath.endsWith('/inscription-client')) setAuthMode('register');
    if (routePath.endsWith('/connexion')) setAuthMode('login');
  }, [routePath]);

  const shopPath = (suffix = '') => clientApp
    ? `/client-app${suffix}`
    : slug ? `/shop/${encodeURIComponent(slug)}${suffix}` : suffix || '/';
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
       setDeliveryForm(form => ({ ...form, requesterName: bootstrap.customer.name, requesterEmail: bootstrap.customer.email, requesterPhone: bootstrap.customer.phone, address: firstAddress ? addressText(firstAddress) : form.address }));
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
    const shopLoad = retryRequest(
      async () => {
        const result = domain
          ? await publicEcommerceApi.bootstrapDomain()
          : await publicEcommerceApi.bootstrap(slug ?? '');
        if (domain && !('store' in result)) throw new Error('Aucune boutique publiée ne correspond à ce domaine.');
        return result as PublicShopBootstrap;
      },
      3,
    );
    void shopLoad
      .then(async result => {
        if (cancelled) return;
        setData(result);
        let session: { customer: EcommerceCustomer | null };
        try {
          session = await retryRequest(() => api.session(), 2);
        } catch {
          if (cancelled) return;
          setCustomer(null);
          setCustomerData(null);
          setError('La boutique est disponible, mais la session client n’a pas pu être restaurée.');
          try {
             const saved = JSON.parse(localStorage.getItem(`ecommerce-cart:${slug ?? 'domain'}`) ?? '[]') as Array<{ productSlug?: string; rentalId?: string; quantity: number }>;
             setCart(restoreGuestCart(saved, result));
          } catch {
            setCart([]);
          }
          return;
        }
        if (cancelled) return;
        setCustomer(session.customer);
        if (session.customer) {
          const bootstrap = await retryRequest(() => api.bootstrap(), 2);
          if (cancelled) return;
          setCustomerData(bootstrap);
          setCart(customerCartToLines(bootstrap.cart, result.products));
          setProfileForm({ name: bootstrap.customer.name, phone: bootstrap.customer.phone });
        } else {
          try {
             const saved = JSON.parse(localStorage.getItem(`ecommerce-cart:${slug ?? 'domain'}`) ?? '[]') as Array<{ productSlug?: string; rentalId?: string; quantity: number }>;
             setCart(restoreGuestCart(saved, result));
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
    localStorage.setItem(`ecommerce-cart:${slug ?? 'domain'}`, JSON.stringify(cart.map(line => line.product.rentalId
      ? { rentalId: line.product.rentalId, quantity: line.quantity }
      : { productSlug: line.product.slug, quantity: line.quantity })));
  }, [cart, customer, data, slug]);

  useEffect(() => {
    if (loading || !data || !paymentReturn) return;
    let cancelled = false;
    const loadPaymentStatus = async () => {
      if (customer) {
        const customerOrderPath = shopPath(`/compte/commandes/${encodeURIComponent(paymentReturn.orderId)}`);
        if (routePath !== customerOrderPath) setLocation(customerOrderPath);
        return;
      }
      for (let attempt = 0; attempt < 6; attempt += 1) {
        try {
          const status = domain
            ? await publicEcommerceApi.domainPaymentStatus(paymentReturn.orderId)
            : await publicEcommerceApi.paymentStatus(slug ?? '', paymentReturn.orderId);
          if (cancelled) return;
          setSubmitted({
            reference: status.reference,
            total: status.total,
            paymentStatus: status.paymentStatus,
            failureReason: status.failureReason,
          });
          if (['PAID', 'FAILED', 'REFUNDED'].includes(status.paymentStatus)) return;
        } catch (cause) {
          if (!cancelled) setError(cause instanceof Error ? cause.message : 'Le statut du paiement est indisponible.');
          return;
        }
        await new Promise(resolve => window.setTimeout(resolve, 1000));
      }
    };
    void loadPaymentStatus();
    return () => { cancelled = true; };
  }, [customer, data, domain, loading, paymentReturn, routePath, slug]);

  useEffect(() => {
    if (isAccountRoute && !customer && !loading) go('/connexion');
  }, [customer, isAccountRoute, loading]);

  const syncCart = async (next: CartLine[]) => {
    setCart(next);
    if (!customer) return;
    try {
      const previous = customerData?.cart ?? [];
      const productLines = next.filter(line => !line.product.rentalId && line.product.productType !== 'RENTAL');
      const nextSlugs = new Set(productLines.map(line => line.product.slug));
      for (const line of previous) {
        if (!nextSlugs.has(line.productSlug)) await api.putCartItem(line.productSlug, 0);
      }
      for (const line of productLines) await api.putCartItem(line.product.slug, line.quantity);
      const refreshed = await api.bootstrap();
      setCustomerData(refreshed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Le panier n’a pas pu être synchronisé.');
    }
  };

  const add = (product: CartProduct) => {
    if (product.stock <= 0) {
      setCartNotice(`${product.name} est actuellement indisponible.`);
      return;
    }
    const existing = cart.find(line => line.product.slug === product.slug);
    const next = existing
      ? cart.map(line => line.product.slug === product.slug ? { ...line, quantity: Math.min(product.stock, line.quantity + 1) } : line)
      : [...cart, { product, quantity: 1 }];
    setCartNotice(`${product.name} a été ajouté au panier.`);
    void syncCart(next);
  };

  const addRental = (rental: PublicRental) => add(rentalToCartProduct(rental));

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
      go('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La connexion n’a pas abouti.');
    }
  };

  const submitOrder = async () => {
    if (!data || cart.length === 0) return;
    setError('');
    const currentKey = checkoutKey ?? crypto.randomUUID();
    setCheckoutKey(currentKey);
    try {
       const order = domain
         ? await publicEcommerceApi.createDomainOrder({ ...checkoutForm, idempotencyKey: currentKey, items: cart.map(line => line.product.rentalId ? { rentalId: line.product.rentalId, quantity: line.quantity } : { productSlug: line.product.slug, quantity: line.quantity }) })
         : await publicEcommerceApi.createOrder(slug ?? '', { ...checkoutForm, idempotencyKey: currentKey, items: cart.map(line => line.product.rentalId ? { rentalId: line.product.rentalId, quantity: line.quantity } : { productSlug: line.product.slug, quantity: line.quantity }) });
      const returnUrl = () => {
        const returnPath = customer
          ? shopPath(`/compte/commandes/${encodeURIComponent(order.id)}`)
          : shopPath('');
        const url = new URL(returnPath, window.location.origin);
        url.searchParams.set('payment', 'return');
        url.searchParams.set('order', order.id);
        return url.toString();
      };
      const payment = domain
        ? await publicEcommerceApi.createDomainPayment(order.id, { redirectUrl: returnUrl() })
        : await publicEcommerceApi.createPayment(slug ?? '', order.id, { redirectUrl: returnUrl() });
      setCheckoutKey(null);
      setCart([]);
      if (customer) {
        await api.clearCart();
        const refreshed = await api.bootstrap();
        setCustomerData(refreshed);
      }
      window.location.assign(payment.checkoutUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La commande n’a pas pu être envoyée.');
    }
  };

  const submitDeliveryRequest = async () => {
    if (!deliveryForm.requesterName.trim() || !deliveryForm.requesterEmail.trim() || !deliveryForm.address.trim()) return;
    setError('');
    try {
      const result = domain
        ? await publicEcommerceApi.createDomainDeliveryRequest(deliveryForm)
        : await publicEcommerceApi.createDeliveryRequest(slug ?? '', deliveryForm);
      setDeliverySubmitted(result);
      setCustomerData(current => current ? { ...current, deliveryRequests: [result, ...current.deliveryRequests] } : current);
      setDeliveryForm(form => ({ ...form, address: '', desiredDate: '', note: '' }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La demande de livraison n’a pas pu être envoyée.');
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

  const installClientApp = async () => {
    if (isIosDevice()) return;
    const installed = await promptPwaInstall();
    if (installed) setNotice('MAXIMUS est maintenant installé sur votre appareil.');
  };

  if (loading) return <div className="min-h-screen bg-[hsl(var(--background))] p-6"><div className="mx-auto max-w-6xl animate-pulse"><div className="h-12 w-64 rounded bg-[hsl(var(--muted))]" /><div className="mt-8 h-64 rounded-3xl bg-[hsl(var(--muted))]" /></div></div>;
  if (!data) return <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] p-6"><section className="card-surface max-w-md rounded-2xl p-8 text-center"><Store className="mx-auto text-[hsl(var(--primary))]" size={30} /><h1 className="mt-4 text-xl font-bold">Boutique indisponible</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{error}</p></section></div>;

  const { store, products: allProducts, rentals } = data;
  const products = allProducts.filter(product => product.productType === 'SALE');
  const enabledFeatures = store.enabledFeatures ?? { location: false, livraisons: false };
  const selectedOrder = customerData?.orders.find(order => order.id === orderDetailId);
  const selectedProduct = productDetailSlug ? products.find(product => product.slug === productDetailSlug) : undefined;
  const categories = [...new Set(products.map(item => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
  const visibleProducts = products.filter(product => categoryFilter === 'ALL' || product.category === categoryFilter).filter(product => {
    const needle = searchQuery.trim().toLocaleLowerCase('fr-FR');
    return !needle || `${product.name} ${product.description} ${product.category}`.toLocaleLowerCase('fr-FR').includes(needle);
  });
   const publicNav = [
    { label: 'Boutique', path: '' },
     ...(enabledFeatures.livraisons ? [{ label: 'Livraison', path: '/livraison' }] : []),
     ...(enabledFeatures.location ? [{ label: 'Location', path: '/location' }] : []),
    { label: 'Panier', path: '/panier' },
    { label: customer ? 'Mon compte' : 'Se connecter', path: customer ? '/compte' : '/connexion' },
  ];
  const isFavorite = (product: PublicProduct) => customerData?.favoriteProductSlugs.includes(product.slug) ?? false;

  return <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-[hsl(var(--background))]" style={{ '--shop-primary': store.primaryColor, '--shop-accent': store.accentColor } as React.CSSProperties}>
    <header className="relative border-b bg-[var(--shop-accent)] text-white">
      <div className="flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-6">
         <button type="button" onClick={() => go('')} className="flex min-w-0 max-w-[calc(100%-3rem)] shrink items-center gap-3 text-left"><span className="flex h-14 min-w-14 max-w-[10rem] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--shop-primary)] px-2 py-1 text-[var(--shop-accent)]">{store.logoUrl ? <img src={store.logoUrl} alt={`Logo de ${store.name}`} className="max-h-full max-w-full object-contain" /> : <ShoppingBag size={21} />}</span><span className="min-w-0"><span className="block truncate text-lg font-bold">{store.name}</span><span className="block truncate text-xs text-white/65">{store.description}</span></span></button>
        <button type="button" className="rounded-lg p-2 sm:hidden" onClick={() => setMobileMenu(open => !open)} aria-label="Ouvrir le menu"><Menu size={21} /></button>
        <nav className={`${mobileMenu ? 'flex' : 'hidden'} absolute left-4 right-4 top-full z-30 flex-col gap-1 rounded-2xl bg-[var(--shop-accent)] p-3 shadow-xl sm:static sm:flex sm:flex-row sm:items-center sm:bg-transparent sm:p-0 sm:shadow-none`}>
          {publicNav.map(item => <button type="button" key={item.path} onClick={() => go(item.path)} className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white">{item.label}{item.path === '/panier' && cartCount > 0 ? ` (${cartCount})` : ''}</button>)}
        </nav>
      </div>
    </header>
     <main className="shop-main mx-auto w-full min-w-0 max-w-6xl overflow-x-hidden px-4 py-8 sm:px-8 sm:py-10">
      {error && <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Fermer"><X size={16} /></button></div>}
      {notice && <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Check size={16} /><span>{notice}</span><button type="button" className="ml-auto" onClick={() => setNotice('')} aria-label="Fermer"><X size={16} /></button></div>}
      {!isStandalonePwa() && (installAvailable || isIosDevice()) && <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-[var(--shop-primary)]/25 bg-[var(--shop-primary)]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--shop-primary)] text-[var(--shop-accent)]"><Download size={18} /></span>
          <div>
            <p className="text-sm font-bold">Installez cette boutique</p>
            <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
              {isIosDevice() ? 'Touchez Partager, puis « Sur l’écran d’accueil » pour retrouver rapidement votre espace client.' : 'Retrouvez la boutique et vos commandes plus rapidement depuis votre écran d’accueil.'}
            </p>
          </div>
        </div>
        {installAvailable && <button type="button" onClick={() => void installClientApp()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>
          <Download size={15} />Installer l’application
        </button>}
      </div>}
       {submitted ? <PaymentResultPanel summary={submitted} currency={store.currency} onContinue={() => { setSubmitted(null); go(''); }} onOrders={customer ? () => { setSubmitted(null); go('/compte/commandes'); } : undefined} />
        : isAuthRoute ? <AuthPanel mode={authMode} setMode={setAuthMode} form={authForm} setForm={setAuthForm} onSubmit={() => void submitAuth()} onBack={() => go('')} />
        : isCartRoute ? <CartPanel cart={cart} total={total} store={store} customer={customer} form={checkoutForm} setForm={setCheckoutForm} onChange={change} onSubmit={() => void submitOrder()} onBack={() => go('')} />
         : isAccountRoute && customer ? <AccountPanel store={store} section={accountSection} customer={customer} products={products} customerData={customerData} customerLoading={customerLoading} selectedOrder={selectedOrder} profileForm={profileForm} setProfileForm={setProfileForm} passwordForm={passwordForm} setPasswordForm={setPasswordForm} addressForm={addressForm} setAddressForm={setAddressForm} editingAddressId={editingAddressId} setEditingAddressId={setEditingAddressId} onProfile={() => void saveProfile()} onPassword={() => void savePassword()} onAddress={() => void saveAddress()} onDeleteAddress={id => void deleteAddress(id)} onFavorite={product => void toggleFavorite(product)} onOrder={id => { setMobileMenu(false); setLocation(shopPath(id ? `/compte/commandes/${encodeURIComponent(id)}` : '/compte/commandes')); }} onLogout={() => void api.logout().then(() => { setCustomer(null); setCustomerData(null); setCart([]); go(''); })} onNavigate={go} />
          : isDeliveryRoute ? enabledFeatures.livraisons ? <DeliveryPage store={store} customer={customer} requests={customerData?.deliveryRequests ?? []} form={deliveryForm} setForm={setDeliveryForm} submitted={deliverySubmitted} onSubmit={() => void submitDeliveryRequest()} onNavigate={go} /> : <FeatureUnavailable title="Livraison non activée" text="Cette entreprise n’a pas encore autorisé la fonctionnalité livraison." onBack={() => go('')} />
          : isLocationRoute ? enabledFeatures.location ? <RentalPage rentals={rentals} store={store} onBack={() => go('')} onAdd={addRental} /> : <FeatureUnavailable title="Location non activée" text="Cette entreprise n’a pas encore autorisé la fonctionnalité location." onBack={() => go('')} />
       : productDetailSlug ? selectedProduct ? <ProductDetail product={selectedProduct} store={store} onBack={() => go('')} onAdd={() => add(selectedProduct)} /> : <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">Ce produit n’est plus disponible.</div>
          : <><section className="mb-8 flex min-w-0 flex-col justify-between gap-5 sm:flex-row sm:items-end"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[.18em]" style={{ color: 'var(--shop-primary)' }}>Sélection de la boutique</p><h1 className="mt-2 text-3xl font-bold tracking-[-.04em] sm:text-4xl">Trouvez ce qu’il vous faut.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Commandez en ligne et retrouvez vos commandes dans votre espace client.</p></div><button type="button" onClick={() => go('/compte/favoris')} className="inline-flex items-center gap-2 self-start rounded-xl border px-3 py-2.5 text-sm font-bold sm:self-auto"><Heart size={16} />Favoris</button></section><div className="mb-7 grid gap-3 sm:grid-cols-[1fr_auto_auto]"><label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={16} /><input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Rechercher dans la boutique" className="w-full rounded-xl border bg-[hsl(var(--card))] py-3 pl-10 pr-3 text-sm" /></label><select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} className="rounded-xl border bg-[hsl(var(--card))] px-3 py-3 text-sm"><option value="ALL">Toutes les catégories</option>{categories.map(category => <option key={category} value={category}>{category}</option>)}</select><button type="button" onClick={() => go('/compte/favoris')} className="inline-flex items-center justify-center gap-2 rounded-xl border bg-[hsl(var(--card))] px-4 py-3 text-sm font-bold"><Heart size={16} fill={customer ? 'currentColor' : 'none'} className={customer ? 'text-red-600' : ''} />{customerData?.favoriteProductSlugs.length ?? 0}</button></div>{products.length === 0 ? <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">Aucun produit disponible dans la boutique pour le moment.</div> : visibleProducts.length === 0 ? <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">Aucun produit ne correspond à votre recherche.</div> : <CatalogSections products={visibleProducts} rentals={[]} categories={categories} store={store} onProduct={product => go(`/produit/${encodeURIComponent(product.slug)}`)} onAdd={add} onFavorite={product => void toggleFavorite(product)} isFavorite={isFavorite} />}</>}
    </main>
     {cartNotice && <div role="status" aria-live="polite" className="fixed inset-x-3 bottom-4 z-40 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-3 py-3 shadow-xl sm:inset-x-auto sm:right-6 sm:w-[min(24rem,calc(100vw-3rem))]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check size={16} /></span><p className="min-w-0 flex-1 text-sm font-semibold text-[#20252f]">{cartNotice}</p><button type="button" onClick={() => go('/panier')} className="shrink-0 rounded-lg px-2.5 py-2 text-xs font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>Voir le panier</button><button type="button" onClick={() => setCartNotice('')} className="shrink-0 rounded-lg p-1.5 text-[hsl(var(--muted-foreground))]" aria-label="Fermer la confirmation"><X size={15} /></button></div>}
  </div>;
}

function PaymentResultPanel({ summary, currency, onContinue, onOrders }: { summary: PaymentSummary; currency: PublicShopBootstrap['store']['currency']; onContinue: () => void; onOrders?: () => void }) {
  const paid = summary.paymentStatus === 'PAID';
  const failed = ['FAILED', 'REFUNDED'].includes(summary.paymentStatus);
  const title = paid ? 'Paiement confirmé' : failed ? 'Paiement non confirmé' : 'Paiement en cours de confirmation';
  const message = paid
    ? 'Votre commande est enregistrée. Le vendeur va maintenant la préparer.'
    : failed
      ? (summary.failureReason || 'Le paiement n’a pas été confirmé. Vous pouvez retourner à la boutique et réessayer.')
      : 'Le paiement a été transmis. Cette page se met à jour dès que DiamanoPay confirme la transaction.';

  return <section className="mx-auto max-w-xl rounded-3xl border bg-[hsl(var(--card))] p-8 text-center shadow-sm sm:p-10">
    <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${paid ? 'bg-emerald-100 text-emerald-700' : failed ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
      {paid ? <Check size={26} /> : failed ? <X size={26} /> : <span className="text-xl font-bold">…</span>}
    </span>
    <h1 className="mt-5 text-2xl font-bold">{title}</h1>
    <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{message}</p>
    <p className="mt-4 text-sm font-semibold">Référence : <strong className="text-[hsl(var(--foreground))]">{summary.reference}</strong></p>
    <p className="mt-2 text-lg font-bold" style={{ color: 'var(--shop-primary)' }}>{money(summary.total, currency)}</p>
    <div className="mt-7 flex flex-wrap justify-center gap-3">
      <button type="button" onClick={onContinue} className="rounded-xl px-5 py-3 text-sm font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>Retour à la boutique</button>
      {onOrders && <button type="button" onClick={onOrders} className="rounded-xl border px-5 py-3 text-sm font-bold">Voir mes commandes</button>}
    </div>
  </section>;
}

function ProductDetail({ product, store, onBack, onAdd }: { product: PublicProduct; store: PublicShopBootstrap['store']; onBack: () => void; onAdd: () => void }) {
  const isRental = product.productType === 'RENTAL';
  const rentalUnit = product.rentalPeriod === 'MOIS' ? 'mois' : product.rentalPeriod === 'SEMAINE' ? 'semaine' : 'jour';
  return <section className="mx-auto max-w-4xl"><button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))]"><ArrowLeft size={15} />Retour à la boutique</button><div className="mt-6 grid gap-6 rounded-3xl border bg-[hsl(var(--card))] p-5 shadow-sm sm:grid-cols-2 sm:p-8"><div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-[hsl(var(--muted)/.5)]">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain p-5" /> : <Package size={54} className="text-[hsl(var(--muted-foreground))]" />}</div><div className="flex flex-col justify-center"><p className="text-xs font-bold uppercase tracking-[.16em]" style={{ color: 'var(--shop-primary)' }}>{isRental ? `LOCATION · ${rentalUnit}` : 'VENTE'} · {product.category}</p><h1 className="mt-3 text-3xl font-bold tracking-[-.04em]">{product.name}</h1><p className="mt-4 text-2xl font-bold" style={{ color: 'var(--shop-accent)' }}>{money(product.price, store.currency)}{isRental && <span className="ml-1 text-sm font-semibold">/ {rentalUnit}</span>}</p>{product.compareAtPrice && product.compareAtPrice > product.price && <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))] line-through">{money(product.compareAtPrice, store.currency)}</p>}<p className="mt-5 whitespace-pre-line text-sm leading-7 text-[hsl(var(--muted-foreground))]">{product.description || 'Une référence sélectionnée par votre boutique.'}</p><p className={`mt-5 text-xs font-semibold ${product.stock > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>{product.stock > 0 ? `${product.stock} unité${product.stock > 1 ? 's' : ''} disponible${product.stock > 1 ? 's' : ''}` : 'Indisponible'}</p><button type="button" onClick={onAdd} disabled={product.stock <= 0} className="mt-6 rounded-xl px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50" style={{ backgroundColor: 'var(--shop-accent)' }}>{product.stock > 0 ? (isRental ? 'Ajouter une demande de location' : 'Ajouter au panier') : 'Indisponible'}</button></div></div></section>;
}

function PublicOfferCard({
  imageUrl,
  icon: Icon,
  badge,
  name,
  description,
  price,
  priceSuffix,
  availability,
  store,
  onOpen,
  onAdd,
  onFavorite,
  favorite = false,
}: {
  imageUrl: string;
  icon: typeof Package;
  badge: string;
  name: string;
  description: string;
  price: string;
  priceSuffix?: string;
  availability?: string;
  store: PublicShopBootstrap['store'];
  onOpen?: () => void;
  onAdd?: () => void;
  onFavorite?: () => void;
  favorite?: boolean;
}) {
  const isAvailable = availability !== 'Indisponible';
  const availabilityLabel = availability ? (isAvailable ? 'Disponible' : 'Indisponible') : undefined;
  return <article className="min-w-0 overflow-hidden rounded-xl border border-[#e8e0d4] bg-white shadow-sm">
    <button type="button" onClick={onOpen} disabled={!onOpen} className="relative flex aspect-[2/1] w-full items-center justify-center overflow-hidden bg-[#fbfaf7] disabled:cursor-default">
      {imageUrl ? <img src={imageUrl} alt={name} className="h-full w-full object-cover" /> : <Icon size={32} className="text-[hsl(var(--muted-foreground))]" />}
      {availabilityLabel && <span className={`absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-[9px] font-bold ${isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{availabilityLabel}</span>}
    </button>
     <div className="border-t border-[#e8e0d4] bg-white p-3.5 sm:p-4">
      <p className="truncate text-[9px] font-bold uppercase tracking-[.14em] text-[#8c6c37]">{badge}</p>
      <div className="mt-1.5 flex min-w-0 items-start justify-between gap-3">
        {onOpen ? <button type="button" onClick={onOpen} className="min-w-0 break-words text-left text-sm font-bold leading-tight text-[#20252f] sm:text-base">{name}</button> : <h3 className="min-w-0 break-words text-sm font-bold leading-tight text-[#20252f] sm:text-base">{name}</h3>}
        <p className="shrink-0 text-right text-xs font-bold text-[#20252f] sm:text-sm">{price}{priceSuffix && <span className="block text-[10px] font-medium text-[#655e55]">{priceSuffix}</span>}</p>
      </div>
      {description && <p className="mt-2 line-clamp-2 min-h-8 text-[11px] leading-4 text-[#655e55]">{description || `Une offre proposée par ${store.name}.`}</p>}
      {availability && <div className="mt-3 flex items-center gap-2 border-t border-[#eee7dc] pt-2 text-[11px] font-semibold text-[#655e55]">
        <Package size={14} className="shrink-0 text-[#8c6c37]" />
        <span>{availability}</span>
        <span className="ml-auto truncate">{badge.split(' · ')[1] || badge}</span>
      </div>}
      {(onAdd || onFavorite) && <div className="mt-3 flex items-center gap-1.5">
        {onFavorite && <button type="button" onClick={onFavorite} className="rounded-lg border p-1.5" aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}><Heart size={14} fill={favorite ? 'currentColor' : 'none'} className={favorite ? 'text-red-600' : ''} /></button>}
        {onAdd && isAvailable && <button type="button" onClick={onAdd} className="flex-1 rounded-lg px-2.5 py-2 text-[11px] font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>Ajouter</button>}
      </div>}
    </div>
  </article>;
}

function CatalogSections({
  products,
  rentals,
  categories,
  store,
  onProduct,
  onAdd,
  onFavorite,
  isFavorite,
}: {
  products: PublicProduct[];
  rentals: PublicRental[];
  categories: string[];
  store: PublicShopBootstrap['store'];
  onProduct: (product: PublicProduct) => void;
  onAdd: (product: PublicProduct) => void;
  onFavorite: (product: PublicProduct) => void;
  isFavorite: (product: PublicProduct) => boolean;
}) {
  return <div className="space-y-10">
    {categories.map(category => {
      const categoryProducts = products.filter(product => product.category === category);
      const categoryRentals = rentals.filter(rental => rental.category === category);
      if (categoryProducts.length === 0 && categoryRentals.length === 0) return null;
      return <section key={category}>
        <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.18em]" style={{ color: 'var(--shop-primary)' }}>Catégorie</p><h2 className="mt-1 text-2xl font-bold">{category}</h2></div><span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">{categoryProducts.length + categoryRentals.length} offre{categoryProducts.length + categoryRentals.length > 1 ? 's' : ''}</span></div>
         <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categoryProducts.map(product => <PublicOfferCard key={`product-${product.slug}`} imageUrl={product.imageUrl} icon={Package} badge={`Produit · ${product.category}`} name={product.name} description={product.description} price={money(product.price, store.currency)} availability={product.stock > 0 ? `${product.stock} disponible${product.stock > 1 ? 's' : ''}` : 'Indisponible'} store={store} onOpen={() => onProduct(product)} onAdd={() => onAdd(product)} onFavorite={() => onFavorite(product)} favorite={isFavorite(product)} />)}
          {categoryRentals.map(rental => <PublicOfferCard key={`rental-${rental.name}`} imageUrl={rental.imageUrl} icon={Home} badge={`Location · ${rental.category}`} name={rental.name} description={rental.description} price={money(rental.price, store.currency)} priceSuffix={`/ ${rental.billingUnit === 'MOIS' ? 'mois' : rental.billingUnit === 'SEMAINE' ? 'semaine' : 'jour'}`} availability={rental.isAvailable ? `${rental.availability} disponible${rental.availability > 1 ? 's' : ''}` : 'Indisponible'} store={store} />)}
        </div>
      </section>;
    })}
  </div>;
}

function DeliveryPage({ store, customer, requests, form, setForm, submitted, onSubmit, onNavigate }: { store: PublicShopBootstrap['store']; customer: EcommerceCustomer | null; requests: EcommerceDeliveryRequest[]; form: { requesterName: string; requesterEmail: string; requesterPhone: string; address: string; serviceType: EcommerceDeliveryServiceType; desiredDate: string; note: string }; setForm: (form: { requesterName: string; requesterEmail: string; requesterPhone: string; address: string; serviceType: EcommerceDeliveryServiceType; desiredDate: string; note: string }) => void; submitted: EcommerceDeliveryRequest | null; onSubmit: () => void; onNavigate: (path: string) => void }) {
  const steps = [
    { icon: ShoppingBag, title: 'Choisissez vos articles', text: 'Ajoutez vos produits au panier et indiquez votre adresse.' },
    { icon: Truck, title: 'Nous préparons votre colis', text: 'La boutique confirme la commande et organise l’acheminement.' },
    { icon: Check, title: 'Suivez la livraison', text: 'Retrouvez chaque évolution dans votre espace client.' },
  ];

  return <section className="mx-auto max-w-5xl">
    <div className="relative overflow-hidden rounded-3xl p-6 text-white shadow-xl sm:p-10" style={{ background: `linear-gradient(120deg, ${store.accentColor}, ${store.primaryColor})` }}>
      <div className="pointer-events-none absolute -right-14 -top-16 h-52 w-52 rounded-full border-[18px] border-white/10" />
      <span className="relative mono text-[10px] font-bold uppercase tracking-[.2em] text-white/70">Service livraison</span>
      <h1 className="relative mt-3 max-w-2xl text-3xl font-bold tracking-[-.05em] sm:text-5xl">Une commande simple, un suivi clair.</h1>
      <p className="relative mt-4 max-w-xl text-sm leading-7 text-white/75">{customer ? `Bonjour ${customer.name.split(' ')[0]}, retrouvez vos commandes et leur progression dans votre espace.` : 'Faites-vous livrer vos achats avec un parcours pensé pour rester simple du panier à la réception.'}</p>
      <button type="button" onClick={() => onNavigate(customer ? '/compte/commandes' : '')} className="relative mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold" style={{ color: store.accentColor }}>{customer ? 'Suivre mes commandes' : 'Voir les produits'}<ArrowRight size={16} /></button>
    </div>
    <div className="mt-6 grid gap-4 md:grid-cols-3">{steps.map(({ icon: Icon, title, text }, index) => <div key={title} className="rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${store.primaryColor}22`, color: store.accentColor }}><Icon size={20} /></span><span className="mt-5 block text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">0{index + 1}</span><h2 className="mt-2 text-lg font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{text}</p></div>)}</div>
    <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <div className="rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[.16em]" style={{ color: store.primaryColor }}>Demander un service</p>
        <h2 className="mt-2 text-2xl font-bold">Besoin d’une livraison ?</h2>
        <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Décrivez votre besoin, même sans passer une commande dans la boutique.</p>
        {submitted ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><Check className="text-emerald-700" size={22} /><p className="mt-3 font-bold text-emerald-900">Demande enregistrée</p><p className="mt-1 text-sm text-emerald-800">Référence : {submitted.reference}. Notre équipe reviendra vers vous pour confirmer le créneau.</p>{customer && <button type="button" onClick={() => onNavigate('/compte')} className="mt-4 text-sm font-bold text-emerald-900 underline">Voir mon espace client</button>}</div> : <div className="mt-5 grid gap-3 sm:grid-cols-2"><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Nom complet" value={form.requesterName} onChange={event => setForm({ ...form, requesterName: event.target.value })} /><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Email" type="email" value={form.requesterEmail} onChange={event => setForm({ ...form, requesterEmail: event.target.value })} /><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Téléphone" value={form.requesterPhone} onChange={event => setForm({ ...form, requesterPhone: event.target.value })} /><select className="rounded-xl border bg-[hsl(var(--card))] px-3 py-3 text-sm" value={form.serviceType} onChange={event => setForm({ ...form, serviceType: event.target.value as EcommerceDeliveryServiceType })}><option value="STANDARD">Livraison standard</option><option value="URGENT">Livraison urgente</option></select><textarea className="rounded-xl border px-3 py-3 text-sm sm:col-span-2" rows={2} placeholder="Adresse complète de livraison" value={form.address} onChange={event => setForm({ ...form, address: event.target.value })} /><label className="text-sm font-semibold">Date souhaitée<input className="mt-1.5 block w-full rounded-xl border px-3 py-3 text-sm font-normal" type="date" value={form.desiredDate} onChange={event => setForm({ ...form, desiredDate: event.target.value })} /></label><textarea className="rounded-xl border px-3 py-3 text-sm" rows={2} placeholder="Précisions (facultatif)" value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} /><button type="button" onClick={onSubmit} disabled={!form.requesterName.trim() || !form.requesterEmail.trim() || !form.address.trim()} className="rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2" style={{ backgroundColor: store.accentColor }}>Envoyer ma demande</button></div>}
      </div>
      <div className="flex items-start gap-3 rounded-2xl border border-[hsl(var(--primary)/.22)] bg-[hsl(var(--primary)/.08)] p-4 text-sm"><Clock3 size={18} className="mt-0.5 shrink-0" style={{ color: store.accentColor }} /><span>Les délais et frais peuvent dépendre de votre zone. L’adresse enregistrée dans votre compte facilite chaque nouvelle demande.</span></div>
    </div>
    {customer && requests.length > 0 && <div className="mt-6 rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[.16em]" style={{ color: store.primaryColor }}>Mon suivi</p><h2 className="mt-2 text-xl font-bold">Mes demandes récentes</h2><div className="mt-4 divide-y">{requests.slice(0, 5).map(request => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-bold">{request.reference}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{request.serviceType === 'URGENT' ? 'Urgente' : 'Standard'}{request.desiredDate ? ` · ${request.desiredDate}` : ''}</p></div><span className="rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-xs font-bold">{request.status}</span></div>)}</div></div>}
  </section>;
}

function RentalProductCard({ rental, store, onAdd }: { rental: PublicRental; store: PublicShopBootstrap['store']; onAdd: () => void }) {
  const unit = rental.billingUnit === 'MOIS' ? 'mois' : rental.billingUnit === 'SEMAINE' ? 'semaine' : 'jour';
  return <article className="overflow-hidden rounded-xl border border-[#e8e0d4] bg-white shadow-sm">
    <div className="relative flex aspect-[2/1] items-center justify-center overflow-hidden bg-[#fbfaf7]">
       {rental.imageUrl ? <img src={rental.imageUrl} alt={rental.name} className="h-full w-full object-cover" /> : <Home size={32} className="text-[hsl(var(--muted-foreground))]" />}
      <span className={`absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-[9px] font-bold ${rental.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{rental.isAvailable ? 'Disponible' : 'Indisponible'}</span>
    </div>
    <div className="p-3.5 sm:p-4">
      <p className="truncate text-[9px] font-bold uppercase tracking-[.14em] text-[#8c6c37]">{rental.category || 'Général'} · Location</p>
      <div className="mt-1.5 flex items-start justify-between gap-3">
        <h2 className="min-w-0 break-words text-sm font-bold leading-tight text-[#20252f] sm:text-base">{rental.name}</h2>
        <p className="shrink-0 text-right text-xs font-bold text-[#20252f] sm:text-sm">{money(rental.price, store.currency)}<span className="block text-[10px] font-medium text-[#655e55]">/ {unit}</span></p>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-[#eee7dc] pt-2 text-[11px] font-semibold text-[#655e55]">
        <Home size={14} className="shrink-0 text-[#8c6c37]" />
        <span>{rental.availability} disponible{rental.availability > 1 ? 's' : ''}</span>
        <span className="ml-auto truncate">{rental.category || 'Général'}</span>
      </div>
      <button type="button" onClick={onAdd} disabled={!rental.isAvailable} className="mt-3 w-full rounded-lg px-2.5 py-2 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50" style={{ backgroundColor: 'var(--shop-accent)' }}>Ajouter au panier</button>
    </div>
  </article>;
}

function RentalPage({ rentals, store, onBack, onAdd }: { rentals: PublicRental[]; store: PublicShopBootstrap['store']; onBack: () => void; onAdd: (rental: PublicRental) => void }) {
  const categories = [...new Set(rentals.map(rental => rental.category || 'Général'))].sort((a, b) => a.localeCompare(b, 'fr'));

  return <section className="mx-auto max-w-6xl">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))]"><ArrowLeft size={15} />Retour à la boutique</button>
    <header className="mt-6 flex flex-col justify-between gap-3 border-b pb-5 sm:flex-row sm:items-end">
      <div><p className="text-[10px] font-bold uppercase tracking-[.18em]" style={{ color: store.primaryColor }}>Offres disponibles</p><h1 className="mt-2 text-2xl font-bold tracking-[-.04em]">Trouvez votre prochaine location</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Des offres séparées des produits de la boutique, avec leur tarif et leur disponibilité.</p></div>
      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">{rentals.length} offre{rentals.length > 1 ? 's' : ''}</span>
    </header>
    {rentals.length === 0
      ? <div className="mt-6 rounded-2xl border border-dashed p-10 text-center"><p className="text-sm font-semibold">Les offres de location arrivent bientôt.</p><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Aucune location publiée n’est disponible dans cette boutique.</p></div>
      : <div className="mt-6 space-y-8">{categories.map(category => {
        const categoryRentals = rentals.filter(rental => (rental.category || 'Général') === category);
        return <section key={category}>
          <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em]" style={{ color: store.primaryColor }}>Catégorie</p><h2 className="mt-1 text-xl font-bold">{category}</h2></div><span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">{categoryRentals.length} offre{categoryRentals.length > 1 ? 's' : ''}</span></div>
           <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{categoryRentals.map(rental => <RentalProductCard key={`${category}-${rental.name}-${rental.billingUnit}`} rental={rental} store={store} onAdd={() => onAdd(rental)} />)}</div>
        </section>;
      })}</div>}
  </section>;
}

function FeatureUnavailable({ title, text, onBack }: { title: string; text: string; onBack: () => void }) {
  return <section className="mx-auto max-w-xl rounded-3xl border bg-[hsl(var(--card))] p-8 text-center shadow-sm"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--muted))]"><LockKeyhole size={21} /></span><h1 className="mt-5 text-2xl font-bold">{title}</h1><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{text}</p><button type="button" onClick={onBack} className="mt-6 rounded-xl px-4 py-3 text-sm font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>Retour à la boutique</button></section>;
}

function AuthPanel({ mode, setMode, form, setForm, onSubmit, onBack }: { mode: 'login' | 'register'; setMode: (mode: 'login' | 'register') => void; form: { name: string; email: string; phone: string; password: string }; setForm: (form: { name: string; email: string; phone: string; password: string }) => void; onSubmit: () => void; onBack: () => void }) {
  return <section className="mx-auto w-full min-w-0 max-w-md rounded-3xl border bg-[hsl(var(--card))] p-5 shadow-sm sm:p-8"><button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))]"><ArrowLeft size={15} />Retour à la boutique</button><div className="mt-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--muted))]"><LockKeyhole size={22} /></div><h1 className="mt-5 break-words text-2xl font-bold">{mode === 'login' ? 'Bienvenue dans votre espace' : 'Créer votre compte client'}</h1><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{mode === 'login' ? 'Suivez vos commandes et retrouvez vos informations de livraison.' : 'Votre compte est propre à cette boutique et ne donne accès qu’à vos données.'}</p><div className="mt-6 min-w-0 space-y-3">{mode === 'register' && <><input className="box-border w-full min-w-0 rounded-xl border px-3 py-3 text-sm" placeholder="Nom complet" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /><input className="box-border w-full min-w-0 rounded-xl border px-3 py-3 text-sm" placeholder="Téléphone" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} /></>}<input className="box-border w-full min-w-0 rounded-xl border px-3 py-3 text-sm" placeholder="Email" type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /><input className="box-border w-full min-w-0 rounded-xl border px-3 py-3 text-sm" placeholder="Mot de passe (8 caractères minimum)" type="password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} /></div><button type="button" onClick={onSubmit} className="mt-5 w-full rounded-xl py-3.5 text-sm font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>{mode === 'login' ? 'Se connecter' : 'Créer mon compte'}</button><button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="mt-4 w-full text-sm font-semibold underline underline-offset-4">{mode === 'login' ? 'Créer un compte' : 'J’ai déjà un compte'}</button></section>;
}

function CartPanel({ cart, total, store, customer, form, setForm, onChange, onSubmit, onBack }: { cart: CartLine[]; total: number; store: PublicShopBootstrap['store']; customer: EcommerceCustomer | null; form: { customerName: string; customerEmail: string; customerPhone: string; shippingAddress: string; note: string }; setForm: (form: { customerName: string; customerEmail: string; customerPhone: string; shippingAddress: string; note: string }) => void; onChange: (slug: string, delta: number) => void; onSubmit: () => void; onBack: () => void }) {
  return <section className="mx-auto max-w-3xl"><button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))]"><ArrowLeft size={15} />Continuer mes achats</button><div className="mt-5 rounded-3xl border bg-[hsl(var(--card))] p-5 shadow-sm sm:p-8"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em]" style={{ color: 'var(--shop-primary)' }}>Panier</p><h1 className="mt-1 text-2xl font-bold">Votre commande</h1></div><ShoppingBag size={24} /></div>{cart.length === 0 ? <p className="py-14 text-center text-sm text-[hsl(var(--muted-foreground))]">Votre panier est vide.</p> : <><div className="mt-6 divide-y border-y">{cart.map(line => <div key={line.product.slug} className="flex items-center gap-3 py-4"><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{line.product.name}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{line.product.productType === 'RENTAL' ? `LOCATION · ${line.product.rentalPeriod === 'MOIS' ? 'mois' : line.product.rentalPeriod === 'SEMAINE' ? 'semaine' : 'jour'}` : 'VENTE'} · {money(line.product.price, store.currency)}</p></div><div className="flex items-center gap-2 rounded-lg border px-2 py-1"><button type="button" onClick={() => onChange(line.product.slug, -1)} aria-label="Retirer une unité"><Minus size={14} /></button><span className="w-5 text-center text-sm font-bold">{line.quantity}</span><button type="button" onClick={() => onChange(line.product.slug, 1)} aria-label="Ajouter une unité"><Plus size={14} /></button></div><p className="w-24 text-right text-sm font-bold">{money(line.product.price * line.quantity, store.currency)}</p></div>)}</div><div className="mt-5 flex items-center justify-between text-lg font-bold"><span>Total</span><span>{money(total, store.currency)}</span></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Nom complet" value={form.customerName} onChange={event => setForm({ ...form, customerName: event.target.value })} /><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Email" type="email" value={form.customerEmail} onChange={event => setForm({ ...form, customerEmail: event.target.value })} /><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Téléphone" value={form.customerPhone} onChange={event => setForm({ ...form, customerPhone: event.target.value })} /><textarea className="rounded-xl border px-3 py-3 text-sm sm:col-span-2" rows={3} placeholder="Adresse de livraison" value={form.shippingAddress} onChange={event => setForm({ ...form, shippingAddress: event.target.value })} /><textarea className="rounded-xl border px-3 py-3 text-sm sm:col-span-2" rows={2} placeholder="Note pour la boutique (facultatif)" value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} /></div>{customer && <p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">Cette commande sera rattachée à votre compte client.</p>}<button type="button" onClick={onSubmit} disabled={!form.customerName.trim() || !form.customerEmail.trim() || !form.shippingAddress.trim() || cart.length === 0} className="mt-6 w-full rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: 'var(--shop-accent)' }}>Envoyer la commande</button></>}</div></section>;
}

function AccountPanel(props: { store: PublicShopBootstrap['store']; section: AccountSection; customer: EcommerceCustomer; products: PublicProduct[]; customerData: EcommerceCustomerBootstrap | null; customerLoading: boolean; selectedOrder?: EcommerceCustomerBootstrap['orders'][number]; profileForm: { name: string; phone: string }; setProfileForm: (form: { name: string; phone: string }) => void; passwordForm: { currentPassword: string; newPassword: string }; setPasswordForm: (form: { currentPassword: string; newPassword: string }) => void; addressForm: Omit<EcommerceCustomerAddress, 'id'>; setAddressForm: (form: Omit<EcommerceCustomerAddress, 'id'>) => void; editingAddressId: string | null; setEditingAddressId: (id: string | null) => void; onProfile: () => void; onPassword: () => void; onAddress: () => void; onDeleteAddress: (id: string) => void; onFavorite: (product: PublicProduct) => void; onOrder: (id: string) => void; onLogout: () => void; onNavigate: (path: string) => void }) {
  const { section, customer, customerData, customerLoading } = props;
  const orders = customerData?.orders ?? [];
  const addresses = customerData?.addresses ?? [];
  const favoriteCount = customerData?.favoriteProductSlugs.length ?? 0;
  const deliveryRequests = customerData?.deliveryRequests ?? [];
  const tabs = [['dashboard', 'Vue d’ensemble', '/compte'], ['orders', 'Commandes', '/compte/commandes'], ['profile', 'Profil & sécurité', '/compte/profil'], ['addresses', 'Adresses', '/compte/adresses'], ['favorites', `Favoris (${favoriteCount})`, '/compte/favoris']] as const;
  return <section className="grid gap-6 lg:grid-cols-[220px_1fr]"><aside className="rounded-2xl border bg-[hsl(var(--card))] p-3 shadow-sm"><div className="flex items-center gap-3 border-b px-2 pb-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[hsl(var(--muted))]">{props.store.logoUrl ? <img src={props.store.logoUrl} alt={`Logo de ${props.store.name}`} className="h-full w-full object-contain p-1" /> : <UserRound size={18} />}</span><div className="min-w-0"><p className="truncate text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Mon espace client</p><p className="truncate text-sm font-bold">{customer.name}</p><p className="truncate text-xs text-[hsl(var(--muted-foreground))]">{customer.email}</p></div></div><nav className="mt-3 grid gap-1">{tabs.map(([key, label, path]) => <button type="button" key={key} onClick={() => props.onNavigate(path)} className={`rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${section === key ? 'bg-[var(--shop-accent)] text-white' : 'hover:bg-[hsl(var(--muted))]'}`}>{label}</button>)}<button type="button" onClick={props.onLogout} className="mt-3 border-t px-3 py-3 text-left text-sm font-semibold text-red-700">Se déconnecter</button></nav></aside><div className="min-w-0">{customerLoading ? <div className="rounded-2xl border bg-[hsl(var(--card))] p-8 text-sm text-[hsl(var(--muted-foreground))]">Chargement de votre espace…</div> : section === 'dashboard' ? <CustomerDashboard customer={customer} orders={orders} addresses={addresses} favoriteCount={favoriteCount} deliveryRequests={deliveryRequests} store={props.store} onNavigate={props.onNavigate} /> : section === 'orders' ? <OrderSection orders={orders} selectedOrder={props.selectedOrder} onOrder={props.onOrder} /> : section === 'profile' ? <ProfileSection customer={customer} profileForm={props.profileForm} setProfileForm={props.setProfileForm} passwordForm={props.passwordForm} setPasswordForm={props.setPasswordForm} onProfile={props.onProfile} onPassword={props.onPassword} /> : section === 'addresses' ? <AddressSection addresses={addresses} form={props.addressForm} setForm={props.setAddressForm} editingId={props.editingAddressId} setEditingId={props.setEditingAddressId} customer={customer} onSave={props.onAddress} onDelete={props.onDeleteAddress} /> : <FavoriteSection products={props.products} favoriteSlugs={customerData?.favoriteProductSlugs ?? []} onToggle={props.onFavorite} onNavigate={props.onNavigate} />}</div></section>;
}

function CustomerDashboard({ customer, orders, addresses, favoriteCount, deliveryRequests, store, onNavigate }: { customer: EcommerceCustomer; orders: EcommerceCustomerBootstrap['orders']; addresses: EcommerceCustomerAddress[]; favoriteCount: number; deliveryRequests: EcommerceDeliveryRequest[]; store: PublicShopBootstrap['store']; onNavigate: (path: string) => void }) {
  const firstName = customer.name.split(' ')[0];
  const activeOrders = orders.filter(order => !['LIVRÉE', 'ANNULÉE'].includes(order.status));
  const paidTotal = orders.filter(order => order.paymentStatus === 'PAID').reduce((sum, order) => sum + order.total, 0);
  const latest = orders[0];
  const initials = customer.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
  const progress = latest ? ({ 'NOUVELLE': 15, 'CONFIRMÉE': 35, 'EN PRÉPARATION': 58, 'EXPÉDIÉE': 82, 'LIVRÉE': 100, 'ANNULÉE': 0 }[latest.status] ?? 0) : 0;

  return <div className="space-y-5 fade-up">
    <div className="relative overflow-hidden rounded-3xl p-6 text-white shadow-xl sm:p-8" style={{ background: `linear-gradient(120deg, ${store.accentColor}, ${store.primaryColor})` }}>
      <div className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full border-[20px] border-white/10" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold">{initials}</span><div><p className="text-xs font-semibold text-white/65">Votre espace personnel</p><h1 className="mt-1 text-2xl font-bold tracking-[-.04em]">Bonjour {firstName}.</h1><p className="mt-1 text-sm text-white/70">Tout ce qui compte pour vos commandes, au même endroit.</p></div></div>
        <span className="inline-flex items-center gap-2 self-start rounded-full bg-white/12 px-3 py-2 text-xs font-bold"><span className="h-2 w-2 rounded-full bg-emerald-300" />Compte actif</span>
      </div>
      <div className="relative mt-7 flex flex-wrap gap-x-8 gap-y-3 text-xs text-white/70"><span>{orders.length} commande{orders.length > 1 ? 's' : ''}</span><span>{addresses.length} adresse{addresses.length > 1 ? 's' : ''} enregistrée{addresses.length > 1 ? 's' : ''}</span><span>{money(paidTotal, store.currency)} dépensés</span></div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardStat icon={Package} label="Commandes" value={orders.length} detail={activeOrders.length ? `${activeOrders.length} en cours` : 'Aucune en cours'} onClick={() => onNavigate('/compte/commandes')} />
      <DashboardStat icon={Truck} label="Demandes livraison" value={deliveryRequests.length} detail={deliveryRequests[0]?.status ?? 'Aucune demande'} onClick={() => onNavigate('/livraison')} />
      <DashboardStat icon={Heart} label="Favoris" value={favoriteCount} detail="Produits enregistrés" onClick={() => onNavigate('/compte/favoris')} />
      <DashboardStat icon={MapPin} label="Adresses" value={addresses.length} detail="Pour commander plus vite" onClick={() => onNavigate('/compte/adresses')} />
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em]" style={{ color: store.primaryColor }}>Dernier mouvement</p><h2 className="mt-2 text-xl font-bold">Votre commande récente</h2></div><button type="button" onClick={() => onNavigate('/compte/commandes')} className="text-xs font-bold" style={{ color: store.accentColor }}>Tout voir <ArrowRight className="inline" size={14} /></button></div>{latest ? <div className="mt-6 rounded-2xl border bg-[hsl(var(--muted)/.28)] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-bold">{latest.reference}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{readableDate(latest.createdAt)} · {latest.items.length} article{latest.items.length > 1 ? 's' : ''}</p></div><span className="rounded-full bg-[hsl(var(--primary)/.14)] px-3 py-1 text-[11px] font-bold" style={{ color: store.accentColor }}>{latest.status}</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-[hsl(var(--border))]"><div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: store.primaryColor }} /></div><div className="mt-2 flex justify-between text-[10px] font-semibold text-[hsl(var(--muted-foreground))]"><span>Préparation</span><span>Expédition</span><span>Livraison</span></div><div className="mt-5 flex items-center justify-between text-sm"><span className="text-[hsl(var(--muted-foreground))]">{latest.paymentStatus === 'PAID' ? 'Paiement confirmé' : 'Paiement en attente'}</span><strong>{money(latest.total, store.currency)}</strong></div></div> : <div className="mt-6 rounded-2xl border border-dashed p-8 text-center"><Sparkles className="mx-auto" size={22} style={{ color: store.primaryColor }} /><p className="mt-3 text-sm font-semibold">Votre prochaine commande apparaîtra ici.</p><button type="button" onClick={() => onNavigate('')} className="mt-4 rounded-xl px-4 py-2.5 text-xs font-bold text-white" style={{ backgroundColor: store.accentColor }}>Découvrir la boutique</button></div>}</section>
      <section className="rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm sm:p-6"><p className="text-xs font-bold uppercase tracking-[.16em]" style={{ color: store.primaryColor }}>Accès rapides</p><h2 className="mt-2 text-xl font-bold">Gagnez du temps</h2><div className="mt-5 grid gap-2">{[['/compte/favoris', Heart, 'Mes favoris', 'Retrouvez vos sélections'], ['/compte/adresses', MapPin, 'Mes adresses', 'Préparez vos livraisons'], ['/compte/profil', UserRound, 'Mon profil', 'Gardez vos infos à jour']].map(([path, Icon, label, text]) => <button type="button" key={path as string} onClick={() => onNavigate(path as string)} className="flex items-center gap-3 rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-[var(--shop-primary)]"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--muted))]" style={{ color: store.accentColor }}><Icon size={17} /></span><span className="min-w-0 flex-1"><strong className="block text-sm">{label as string}</strong><span className="mt-0.5 block text-xs text-[hsl(var(--muted-foreground))]">{text as string}</span></span><ArrowRight size={14} className="text-[hsl(var(--muted-foreground))]" /></button>)}</div></section>
    </div>
  </div>;
}

function DashboardStat({ icon: Icon, label, value, detail, onClick }: { icon: typeof Package; label: string; value: number; detail: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-2xl border bg-[hsl(var(--card))] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--shop-primary)]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--muted))]"><Icon size={17} /></span><p className="mt-4 text-xs font-bold text-[hsl(var(--muted-foreground))]">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{detail}</p></button>;
}

function FavoriteSection({ products, favoriteSlugs, onToggle, onNavigate }: { products: PublicProduct[]; favoriteSlugs: string[]; onToggle: (product: PublicProduct) => void; onNavigate: (path: string) => void }) {
  const favorites = products.filter(product => favoriteSlugs.includes(product.slug));

  return <div><h1 className="text-2xl font-bold">Vos favoris</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Les produits enregistrés dans votre compte sur cette boutique.</p>{favorites.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed p-10 text-center text-sm text-[hsl(var(--muted-foreground))]">Aucun produit favori disponible actuellement.</div> : <div className="mt-6 grid gap-3 sm:grid-cols-2">{favorites.map(product => <div key={product.slug} className="flex items-center gap-4 rounded-2xl border bg-[hsl(var(--card))] p-4 shadow-sm"><div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[hsl(var(--muted))]">{product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-cover" /> : <Package size={20} />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{product.name}</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{product.price}</p></div><button type="button" onClick={() => onToggle(product)} className="rounded-lg border p-2 text-red-600" aria-label="Retirer des favoris"><Heart size={17} fill="currentColor" /></button></div>)}</div>}<button type="button" onClick={() => onNavigate('')} className="mt-6 rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>Voir la boutique</button></div>;
}

function OrderSection({ orders, selectedOrder, onOrder }: { orders: EcommerceCustomerBootstrap['orders']; selectedOrder?: EcommerceCustomerBootstrap['orders'][number]; onOrder: (id: string) => void }) {
  return <><div className="flex items-end justify-between gap-3"><div><h1 className="text-2xl font-bold">Vos commandes</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Le statut du paiement, de la préparation et de la livraison communiqué par la boutique.</p></div></div>{selectedOrder ? <div className="mt-6 rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm"><button type="button" onClick={() => onOrder('')} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft size={15} />Toutes les commandes</button><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-[hsl(var(--muted-foreground))]">{readableDate(selectedOrder.createdAt)}</p><h2 className="mt-1 text-xl font-bold">{selectedOrder.reference}</h2></div><div className="text-right"><p className="text-sm font-bold">{selectedOrder.status}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Paiement : {selectedOrder.paymentStatus}</p></div></div><div className="mt-6 divide-y border-y">{selectedOrder.items.map(item => <div key={item.id} className="flex items-center justify-between gap-4 py-4 text-sm"><div className="flex min-w-0 items-center gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[hsl(var(--muted))]">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : item.productType === 'RENTAL' ? <Home size={18} /> : <Package size={18} />}</span><span className="min-w-0"><strong className="block truncate">{item.productName}</strong><small className="text-xs text-[hsl(var(--muted-foreground))]">{item.productType === 'RENTAL' ? 'Location' : 'Produit'} · × {item.quantity}</small></span></div><strong>{item.lineTotal}</strong></div>)}</div><div className="mt-5 flex justify-between font-bold"><span>Total</span><span>{money(selectedOrder.total, 'XOF')}</span></div><p className="mt-5 rounded-xl bg-[hsl(var(--muted)/.5)] p-4 text-sm">{selectedOrder.shippingAddress}</p></div> : orders.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed p-10 text-center text-sm text-[hsl(var(--muted-foreground))]">Aucune commande liée à ce compte.</div> : <div className="mt-6 grid gap-3">{orders.map(order => <button type="button" key={order.id} onClick={() => onOrder(order.id)} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-[hsl(var(--card))] p-5 text-left shadow-sm hover:border-[var(--shop-primary)]"><div><p className="text-sm font-bold">{order.reference}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{readableDate(order.createdAt)} · {order.items.length} article(s)</p></div><div className="text-right"><p className="text-sm font-bold">{order.total}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{order.status} · Paiement {order.paymentStatus}</p></div></button>)}</div>}</>;
}

function ProfileSection({ customer, profileForm, setProfileForm, passwordForm, setPasswordForm, onProfile, onPassword }: { customer: EcommerceCustomer; profileForm: { name: string; phone: string }; setProfileForm: (form: { name: string; phone: string }) => void; passwordForm: { currentPassword: string; newPassword: string }; setPasswordForm: (form: { currentPassword: string; newPassword: string }) => void; onProfile: () => void; onPassword: () => void }) {
  return <div className="grid gap-5 xl:grid-cols-2"><section className="rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm"><h1 className="text-xl font-bold">Profil</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Vos informations servent uniquement à cette boutique.</p><div className="mt-5 grid gap-3"><input className="rounded-xl border px-3 py-3 text-sm" value={profileForm.name} onChange={event => setProfileForm({ ...profileForm, name: event.target.value })} /><input className="rounded-xl border px-3 py-3 text-sm" value={customer.email} disabled /><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Téléphone" value={profileForm.phone} onChange={event => setProfileForm({ ...profileForm, phone: event.target.value })} /></div><button type="button" onClick={onProfile} className="mt-5 rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>Enregistrer</button></section><section className="rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm"><h2 className="text-xl font-bold">Sécurité</h2><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Changez votre mot de passe. Les sessions existantes seront révoquées.</p><div className="mt-5 grid gap-3"><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Mot de passe actuel" type="password" value={passwordForm.currentPassword} onChange={event => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} /><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Nouveau mot de passe" type="password" value={passwordForm.newPassword} onChange={event => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} /></div><button type="button" onClick={onPassword} className="mt-5 rounded-xl border px-4 py-2.5 text-sm font-bold">Changer le mot de passe</button></section></div>;
}

function AddressSection({ addresses, form, setForm, editingId, setEditingId, customer, onSave, onDelete }: { addresses: EcommerceCustomerAddress[]; form: Omit<EcommerceCustomerAddress, 'id'>; setForm: (form: Omit<EcommerceCustomerAddress, 'id'>) => void; editingId: string | null; setEditingId: (id: string | null) => void; customer: EcommerceCustomer; onSave: () => void; onDelete: (id: string) => void }) {
  const reset = () => { setEditingId(null); setForm({ label: 'Domicile', recipientName: customer.name, phone: customer.phone, line1: '', line2: '', city: '', region: '', postalCode: '', country: 'Sénégal', isDefault: false }); };
  return <div><div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold">Adresses</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Gérez vos adresses de livraison enregistrées.</p></div><button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>Nouvelle adresse</button></div><div className="mt-6 grid gap-3">{addresses.map(address => <div key={address.id} className="rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h2 className="font-bold">{address.label}</h2>{address.isDefault && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800">Par défaut</span>}</div><p className="mt-2 text-sm">{address.recipientName} · {address.phone}</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{addressText(address)}</p></div><div className="flex gap-2"><button type="button" onClick={() => { setEditingId(address.id); setForm(address); }} className="rounded-lg border px-3 py-2 text-xs font-bold">Modifier</button><button type="button" onClick={() => onDelete(address.id)} className="rounded-lg border px-3 py-2 text-xs font-bold text-red-700">Supprimer</button></div></div></div>)}</div>{(editingId || addresses.length === 0) && <div className="mt-6 rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">{editingId ? 'Modifier l’adresse' : 'Ajouter une adresse'}</h2><button type="button" onClick={reset} aria-label="Annuler"><X size={18} /></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{(['label', 'recipientName', 'phone', 'line1', 'line2', 'city', 'region', 'postalCode', 'country'] as const).map(field => <input key={field} className="rounded-xl border px-3 py-3 text-sm" placeholder={{ label: 'Libellé', recipientName: 'Nom du destinataire', phone: 'Téléphone', line1: 'Adresse', line2: 'Complément', city: 'Ville', region: 'Région', postalCode: 'Code postal', country: 'Pays' }[field]} value={form[field]} onChange={event => setForm({ ...form, [field]: event.target.value })} />)}</div><label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isDefault} onChange={event => setForm({ ...form, isDefault: event.target.checked })} />Utiliser comme adresse par défaut</label><button type="button" onClick={onSave} className="mt-5 rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>Enregistrer l’adresse</button></div>}</div>;
}