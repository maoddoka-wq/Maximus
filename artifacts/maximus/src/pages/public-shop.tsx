import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, Building2, CarFront, Check, ChevronDown, Clock3, Copy, Download, Heart, Home, LockKeyhole, LogIn, Mail, MapPin, MessageCircle, Minus, Package, Phone, Plus, RefreshCw, Search, Share2, ShieldCheck, ShoppingBag, Sparkles, Store, Truck, UserRound, X } from 'lucide-react';
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
  type EcommerceCarReservation,
  type EcommerceCarReservationStatus,
  type EcommerceCarTripType,
  type PaymentProvider,
  type PublicPaymentStatus,
  type PublicShopBootstrap,
} from '@/lib/ecommerce-api';
import { ApiRequestError } from '@/lib/api-request';
import { publicImmobilierApi } from '@/lib/immobilier-api';
import { createPublicTransportApi, type PublicTransportPlace, type PublicTransportQuote, type PublicTransportShareTrip, type PublicTransportTrip } from '@/lib/transport-api';
import { isDestinationPlaceCommitted } from '@/lib/transport-place-selection';
import { buildPublicTransportShareUrl, parsePublicTransportShareUrl } from '@/lib/transport-share-link';
import { TaxiRouteMap } from '@/components/taxi-route-map';
import { canInstallPwa, clientPwaPath, clientPwaStorageKey, isIosDevice, isStandalonePwa, mountClientManifest, promptPwaInstall, subscribeToPwaInstall } from '@/lib/pwa';
import { tokens as transportDesignTokens } from '@workspace/maximus-transport-public/tokens';
import { showAppToast } from '@workspace/maximus-design-system/hooks/use-toast';
import { Button } from '@workspace/maximus-design-system/components/ui/button';
import { Button as TransportButton } from '@workspace/maximus-transport-public/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/maximus-transport-public/components/ui/card';
import { Input } from '@workspace/maximus-transport-public/components/ui/input';
import { Label } from '@workspace/maximus-transport-public/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@workspace/maximus-design-system/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/maximus-design-system/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@workspace/maximus-design-system/components/ui/dropdown-menu';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';

type PublicProduct = PublicShopBootstrap['products'][number];
type PublicRental = PublicShopBootstrap['rentals'][number];
type CartProduct = PublicProduct & { rentalId?: string };
type CartLine = { product: CartProduct; quantity: number };
type AccountSection = 'dashboard' | 'orders' | 'profile' | 'addresses' | 'favorites';
type PaymentSummary = Pick<PublicPaymentStatus, 'reference' | 'total' | 'paymentStatus' | 'orderStatus' | 'failureReason'>;

const cartQuantity = (product: CartProduct | PublicProduct, quantity: number) =>
  product.fulfillmentType === 'DIGITAL' ? 1 : Math.min(quantity, product.stock);

const money = (value: number, currency: PublicShopBootstrap['store']['currency']) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: currency === 'XOF' ? 0 : 2 }).format(value) + ` ${currency}`;

const publicHexColor = /^#[0-9a-f]{6}$/i;

function colorLuminance(hex: string): number {
  const channels = [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = channels.map(channel => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function readableOn(hex: string): string {
  return colorLuminance(hex) > 0.36 ? '#172033' : '#ffffff';
}

function publicShopTheme(store: PublicShopBootstrap['store']) {
  const configuredPrimary = publicHexColor.test(store.primaryColor) ? store.primaryColor.toLowerCase() : '';
  const primary = configuredPrimary && configuredPrimary !== '#000000' ? configuredPrimary : '#2563eb';
  const configuredAccent = publicHexColor.test(store.accentColor) ? store.accentColor.toLowerCase() : '';
  const accent = configuredAccent && configuredAccent !== '#000000' ? configuredAccent : primary;

  return {
    primary,
    accent,
    primaryForeground: readableOn(primary),
    accentForeground: readableOn(accent),
  };
}

function publicTransportTheme(transportColors: { primaryColor?: string; accentColor?: string } | null) {
  const configuredPrimary = publicHexColor.test(transportColors?.primaryColor ?? '')
    ? transportColors?.primaryColor?.toLowerCase() ?? ''
    : '';
  const primary = configuredPrimary && configuredPrimary !== '#000000' ? configuredPrimary : '#161d27';
  const configuredAccent = publicHexColor.test(transportColors?.accentColor ?? '')
    ? transportColors?.accentColor?.toLowerCase() ?? ''
    : '';
  const accent = configuredAccent && configuredAccent !== '#000000' ? configuredAccent : '#f2b705';

  return {
    primary,
    accent,
    primaryForeground: readableOn(primary),
    accentForeground: readableOn(accent),
  };
}

function hexToHslChannels(hex: string): string {
  const red = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const green = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  let hue = 0;
  let saturation = 0;
  if (delta > 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return `${Math.round(hue * 10) / 10} ${Math.round(saturation * 1000) / 10}% ${Math.round(lightness * 1000) / 10}%`;
}

function transportDesignVariables(theme: ReturnType<typeof publicTransportTheme>): React.CSSProperties {
  const palette = transportDesignTokens.color.light;
  const fontSans = transportDesignTokens.fontFamily.sans.join(', ');
  const fontMono = transportDesignTokens.fontFamily.mono.join(', ');

  return {
    '--background': hexToHslChannels(palette.background),
    '--foreground': hexToHslChannels(palette.foreground),
    '--border': hexToHslChannels(palette.border),
    '--input': hexToHslChannels(palette.input),
    '--card': hexToHslChannels(palette.card),
    '--card-foreground': hexToHslChannels(palette.cardForeground),
    '--card-border': palette.border,
    '--popover': hexToHslChannels(palette.popover),
    '--popover-foreground': hexToHslChannels(palette.popoverForeground),
    '--secondary': hexToHslChannels(palette.secondary),
    '--secondary-foreground': hexToHslChannels(palette.secondaryForeground),
    '--secondary-border': palette.secondary,
    '--muted': hexToHslChannels(palette.muted),
    '--muted-foreground': hexToHslChannels(palette.mutedForeground),
    '--destructive': hexToHslChannels(palette.destructive),
    '--destructive-foreground': hexToHslChannels(palette.destructiveForeground),
    '--destructive-border': palette.destructive,
    '--sidebar': hexToHslChannels(palette.sidebar),
    '--sidebar-foreground': hexToHslChannels(palette.sidebarForeground),
    '--primary': hexToHslChannels(theme.accent),
    '--primary-foreground': hexToHslChannels(theme.accentForeground),
    '--primary-border': theme.accent,
    '--accent': hexToHslChannels(theme.primary),
    '--accent-foreground': hexToHslChannels(theme.primaryForeground),
    '--accent-border': theme.primary,
    '--ring': hexToHslChannels(theme.accent),
    '--button-outline': `hsl(${hexToHslChannels(palette.foreground)} / 0.12)`,
    '--font-sans': fontSans,
    '--font-mono': fontMono,
    '--radius': transportDesignTokens.radius,
  } as React.CSSProperties;
}

const readableDate = (value: string) =>
  new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value));

async function retryRequest<T>(request: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await request();
    } catch (cause) {
      lastError = cause;
      const retryable = cause instanceof ApiRequestError && cause.status === 0;
      if (retryable && attempt < attempts - 1) {
        await new Promise(resolve => window.setTimeout(resolve, 250 * (attempt + 1)));
      } else {
        throw cause;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('La requête a échoué.');
}

const customerCartToLines = (items: EcommerceCustomerCartLine[], products: PublicProduct[]): CartLine[] =>
  items.flatMap(item => {
    const product = products.find(candidate => candidate.slug === item.productSlug);
    return product ? [{ product, quantity: cartQuantity(product, item.quantity) }] : [];
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
  fulfillmentType: 'PHYSICAL',
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
  return product ? [{ product, quantity: cartQuantity(product, item.quantity) }] : [];
});

const addressText = (address: EcommerceCustomerAddress) =>
  [address.line1, address.line2, address.postalCode, address.city, address.region, address.country].filter(Boolean).join(', ');

const whatsappNumber = (value: string) => {
  const digits = value.trim().replace(/\D/g, '');
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('221')) return digits;
  if (digits.startsWith('0')) return `221${digits.slice(1)}`;
  return digits;
};

const DAKAR_BOUNDS = {
  minLatitude: 14.55,
  maxLatitude: 14.95,
  minLongitude: -17.65,
  maxLongitude: -16.95,
};

const isWithinDakar = (latitude: number, longitude: number) =>
  latitude >= DAKAR_BOUNDS.minLatitude
  && latitude <= DAKAR_BOUNDS.maxLatitude
  && longitude >= DAKAR_BOUNDS.minLongitude
  && longitude <= DAKAR_BOUNDS.maxLongitude;

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
  const [cartNotice, setCartNotice] = useState('');
  const [logoPreviewOpen, setLogoPreviewOpen] = useState(false);
  const [submitted, setSubmitted] = useState<PaymentSummary | null>(null);
  const [checkoutKey, setCheckoutKey] = useState<string | null>(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [submittingDelivery, setSubmittingDelivery] = useState(false);
  const [customerActionPending, setCustomerActionPending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [checkoutForm, setCheckoutForm] = useState({ customerName: '', customerEmail: '', customerPhone: '', shippingAddress: '', note: '' });
  const [orderAttachments, setOrderAttachments] = useState<File[]>([]);
  const [checkoutDeliveryZoneId, setCheckoutDeliveryZoneId] = useState('');
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('WAVE');
  const [deliveryForm, setDeliveryForm] = useState({ requesterName: '', requesterEmail: '', requesterPhone: '', address: '', deliveryZoneId: '', serviceType: 'STANDARD' as EcommerceDeliveryServiceType, desiredDate: '', note: '' });
  const [deliverySubmitted, setDeliverySubmitted] = useState<EcommerceDeliveryRequest | null>(null);
  const [immobilierSubmitted, setImmobilierSubmitted] = useState(false);
  const [immobilierForm, setImmobilierForm] = useState({ listingId: '', requestType: 'CONTACT' as 'CONTACT' | 'VISIT', name: '', email: '', phone: '', preferredDate: '', message: '' });
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
  const [manifestReady, setManifestReady] = useState(false);
  const paymentReturn = useMemo(() => {
    const query = new URLSearchParams(search);
    const result = query.get('payment');
    const orderId = query.get('order');
    return result && orderId && ['success', 'error', 'return'].includes(result)
      ? { result: result as 'success' | 'error' | 'return', orderId }
      : null;
  }, [search]);

  const api = useMemo(() => createCustomerApi(slug), [slug]);
  const shopStorageKey = useMemo(() => clientPwaStorageKey(slug, domain), [domain, slug]);
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
  const isTransportRoute = routePath.endsWith('/transport');
  const isDeliveryRoute = routePath.endsWith('/livraison');
  const isImmobilierRoute = routePath.endsWith('/immobilier');
  const productDetailSlug = useMemo(() => {
    const match = routePath.match(/\/produit\/([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  }, [routePath]);

  useEffect(() => subscribeToPwaInstall(() => setInstallAvailable(canInstallPwa())), []);

  useEffect(() => {
    if (!data?.store.name.trim()) {
      setManifestReady(false);
      return undefined;
    }
    const manifestUrl = domain
      ? '/api/shop-domain/manifest.webmanifest'
      : `/api/shop/${encodeURIComponent(slug ?? data.store.slug)}/manifest.webmanifest`;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    setManifestReady(false);
    void mountClientManifest(manifestUrl)
      .then(unmount => {
        if (cancelled) {
          unmount();
          return;
        }
        cleanup = unmount;
        setManifestReady(true);
      })
      .catch(error => {
        if (!cancelled) console.warn('Le manifest PWA de la boutique n’a pas pu être validé.', error);
      });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [data?.store.logoUrl, data?.store.name, data?.store.slug, domain, slug]);

  useEffect(() => {
    if (routePath.endsWith('/inscription-client')) setAuthMode('register');
    if (routePath.endsWith('/connexion')) setAuthMode('login');
  }, [routePath]);

  useEffect(() => {
    if (!logoPreviewOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLogoPreviewOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [logoPreviewOpen]);

  const shopPath = (suffix = '') => clientApp
    ? clientPwaPath(slug, suffix, domain)
    : slug ? `/shop/${encodeURIComponent(slug)}${suffix}` : suffix || '/';
  const go = (suffix: string) => {
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
    const sessionLoad = retryRequest(() => api.session(), 2);
    void shopLoad
      .then(result => {
        if (cancelled) return;
        setData(result);
        setLoading(false);

        void sessionLoad
          .then(async session => {
            if (cancelled) return;
            setCustomer(session.customer);
            if (session.customer) {
              const bootstrap = await retryRequest(() => api.bootstrap(), 2);
              if (cancelled) return;
              setCustomerData(bootstrap);
              setCart(customerCartToLines(bootstrap.cart, result.products));
              setProfileForm({ name: bootstrap.customer.name, phone: bootstrap.customer.phone });
              return;
            }
            try {
              const saved = JSON.parse(localStorage.getItem(`ecommerce-cart:${shopStorageKey}`) ?? '[]') as Array<{ productSlug?: string; rentalId?: string; quantity: number }>;
              setCart(restoreGuestCart(saved, result));
            } catch {
              setCart([]);
            }
          })
          .catch(() => {
            if (cancelled) return;
            setCustomer(null);
            setCustomerData(null);
            setError('La boutique est disponible, mais la session client n’a pas pu être restaurée.');
            try {
              const saved = JSON.parse(localStorage.getItem(`ecommerce-cart:${shopStorageKey}`) ?? '[]') as Array<{ productSlug?: string; rentalId?: string; quantity: number }>;
              setCart(restoreGuestCart(saved, result));
            } catch {
              setCart([]);
            }
          });
      })
      .catch(cause => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Boutique indisponible.');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [api, domain, shopStorageKey, slug]);

  useEffect(() => {
    if (customer || !data) return;
    localStorage.setItem(`ecommerce-cart:${shopStorageKey}`, JSON.stringify(cart.map(line => line.product.rentalId
      ? { rentalId: line.product.rentalId, quantity: line.quantity }
      : { productSlug: line.product.slug, quantity: line.quantity })));
  }, [cart, customer, data, shopStorageKey]);

  useEffect(() => {
    if (loading || !data || !paymentReturn) return;
    let cancelled = false;
    const loadPaymentStatus = async () => {
      const customerOrderPath = shopPath(`/compte/commandes/${encodeURIComponent(paymentReturn.orderId)}`);
      if (customer && routePath !== customerOrderPath) setLocation(customerOrderPath);
      for (let attempt = 0; attempt < 6; attempt += 1) {
        try {
          const status = domain
            ? await publicEcommerceApi.domainPaymentStatus(paymentReturn.orderId)
            : await publicEcommerceApi.paymentStatus(slug ?? '', paymentReturn.orderId);
          if (cancelled) return;
          if (customer) {
            const refreshedCustomerData = await api.bootstrap();
            if (cancelled) return;
            setCustomerData(refreshedCustomerData);
          } else {
            setSubmitted({
              reference: status.reference,
              total: status.total,
              paymentStatus: status.paymentStatus,
               orderStatus: status.orderStatus,
              failureReason: status.failureReason,
            });
          }
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
    if (!customer || !customerData || !orderDetailId || customerData.orders.some(order => order.id === orderDetailId)) return;
    let cancelled = false;
    void api.order(orderDetailId)
      .then(order => {
        if (cancelled) return;
        setCustomerData(current => current
          ? { ...current, orders: [order, ...current.orders.filter(item => item.id !== order.id)] }
          : current);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [api, customer, customerData, orderDetailId]);

  useEffect(() => {
    if (isAccountRoute && !customer && !loading) go('/connexion');
  }, [customer, isAccountRoute, loading]);

  const syncCart = async (next: CartLine[]) => {
    setCart(next);
    if (!customer) return true;
    try {
      const previous = customerData?.cart ?? [];
      const productLines = next.filter(line => !line.product.rentalId && line.product.productType !== 'RENTAL');
      const nextSlugs = new Set(productLines.map(line => line.product.slug));
      const writes = [
        ...previous
          .filter(line => !nextSlugs.has(line.productSlug))
          .map(line => api.putCartItem(line.productSlug, 0)),
        ...productLines.map(line => api.putCartItem(line.product.slug, cartQuantity(line.product, line.quantity))),
      ];
      await Promise.all(writes);
      void api.bootstrap()
        .then(setCustomerData)
        .catch(() => {
          const message = 'Le panier est enregistré, mais le compte n’a pas pu être actualisé.';
          setError(message);
          showAppToast(message, 'warning');
        });
      return true;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Le panier n’a pas pu être synchronisé.';
      setError(message);
      showAppToast(message, 'error');
      return false;
    }
  };

  const add = (product: CartProduct) => {
    if (product.stock <= 0) {
      setCartNotice(`${product.name} est actuellement indisponible.`);
      return;
    }
    const existing = cart.find(line => line.product.slug === product.slug);
    const next = existing
      ? cart.map(line => line.product.slug === product.slug ? { ...line, quantity: cartQuantity(product, line.quantity + 1) } : line)
      : [...cart, { product, quantity: 1 }];
    const message = `${product.name} a été ajouté au panier.`;
    if (customer) setCartNotice('Enregistrement du panier…');
    void syncCart(next).then((saved) => {
      if (!saved) return;
      setCartNotice(message);
      showAppToast(message, 'success');
    });
  };

  const addRental = (rental: PublicRental) => add(rentalToCartProduct(rental));

  const change = (productSlug: string, delta: number) => {
    const next = cart.flatMap(line => {
      if (line.product.slug !== productSlug) return [line];
      if (line.product.fulfillmentType === 'DIGITAL' && delta > 0) return [line];
      const quantity = line.quantity + delta;
      return quantity <= 0 ? [] : [{ ...line, quantity: cartQuantity(line.product, quantity) }];
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
      showAppToast('Vous êtes connecté.', 'success');
      go('');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'La connexion n’a pas abouti.';
      setError(message);
      showAppToast(message, 'error');
    }
  };

  const submitOrder = async () => {
    if (!data || cart.length === 0 || submittingOrder) return;
    if (!customer && cart.some(line => line.product.fulfillmentType === 'DIGITAL')) {
      setError('Connectez-vous avant de payer un produit numérique afin de retrouver son téléchargement dans votre compte.');
      showAppToast('Connexion requise pour un produit numérique.', 'info');
      go('/connexion');
      return;
    }
    setSubmittingOrder(true);
    setError('');
    const currentKey = checkoutKey ?? crypto.randomUUID();
    setCheckoutKey(currentKey);
    try {
       const orderInput = {
         ...checkoutForm,
         deliveryZoneId: checkoutDeliveryZoneId || undefined,
         idempotencyKey: currentKey,
         items: cart.map(line => line.product.rentalId
           ? { rentalId: line.product.rentalId, quantity: line.quantity }
           : { productSlug: line.product.slug, quantity: cartQuantity(line.product, line.quantity) }),
         attachments: data.store.allowOrderAttachments ? orderAttachments : [],
       };
       const order = domain
         ? await publicEcommerceApi.createDomainOrder(orderInput)
         : await publicEcommerceApi.createOrder(slug ?? '', orderInput);
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
         ? await publicEcommerceApi.createDomainPayment(order.id, { redirectUrl: returnUrl(), provider: paymentProvider })
         : await publicEcommerceApi.createPayment(slug ?? '', order.id, { redirectUrl: returnUrl(), provider: paymentProvider });
      setCheckoutKey(null);
      setCart([]);
       setOrderAttachments([]);
      if (customer) {
         void api.clearCart().catch(() => undefined);
      }
       showAppToast('Redirection vers le paiement DiamanoPay.', 'info');
       // Nothing else is awaited after the checkout URL is available.
       // The browser leaves immediately instead of waiting for a cart refresh.
      window.location.assign(payment.checkoutUrl);
    } catch (cause) {
      const message = paymentErrorMessage(cause);
      setError(message);
      showAppToast(message, 'error');
      setCheckoutKey(null);
    } finally {
      setSubmittingOrder(false);
    }
  };

  const submitDeliveryRequest = async () => {
    if (!deliveryForm.requesterName.trim() || !deliveryForm.requesterEmail.trim() || !deliveryForm.address.trim()) return;
    if (data?.deliveryZones.length && !deliveryForm.deliveryZoneId) {
      setError('Veuillez sélectionner une zone de livraison.');
      return;
    }
    setError('');
    setSubmittingDelivery(true);
    showAppToast('Envoi de la demande en cours…', 'info');
    try {
       const result = domain
        ? await publicEcommerceApi.createDomainDeliveryRequest(deliveryForm)
        : await publicEcommerceApi.createDeliveryRequest(slug ?? '', deliveryForm);
      setDeliverySubmitted(result);
      setCustomerData(current => current ? { ...current, deliveryRequests: [result, ...current.deliveryRequests] } : current);
       setDeliveryForm(form => ({ ...form, address: '', desiredDate: '', note: '' }));
       showAppToast('Votre demande de livraison a été enregistrée.', 'success');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'La demande de livraison n’a pas pu être envoyée.';
      setError(message);
      showAppToast(message, 'error');
    } finally {
      setSubmittingDelivery(false);
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
      showAppToast(result.favoriteProductSlugs.includes(product.slug) ? 'Produit ajouté aux favoris.' : 'Produit retiré des favoris.', 'success');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Le favori n’a pas pu être modifié.';
      setError(message);
      showAppToast(message, 'error');
    }
  };

  const runCustomerAction = async (action: () => Promise<unknown>) => {
    if (customerActionPending) return;
    setCustomerActionPending(true);
    showAppToast('Action en cours…', 'info');
    try {
      await action();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'L’action n’a pas pu être effectuée.';
      setError(message);
      showAppToast(message, 'error');
    } finally {
      setCustomerActionPending(false);
    }
  };

  const saveProfile = async () => {
    try {
      const updated = await api.updateProfile(profileForm);
      setCustomer(updated);
      setCustomerData(current => current ? { ...current, customer: updated } : current);
      showAppToast('Profil mis à jour.', 'success');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Le profil n’a pas pu être enregistré.';
      setError(message);
      showAppToast(message, 'error');
    }
  };

  const savePassword = async () => {
    try {
      await api.changePassword(passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '' });
      showAppToast('Mot de passe modifié. Les autres sessions ont été fermées.', 'success');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Le mot de passe n’a pas pu être modifié.';
      setError(message);
      showAppToast(message, 'error');
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
      showAppToast('Adresse enregistrée.', 'success');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'L’adresse n’a pas pu être enregistrée.';
      setError(message);
      showAppToast(message, 'error');
    }
  };

  const deleteAddress = async (id: string) => {
    try {
      await api.deleteAddress(id);
      setCustomerData(current => current ? { ...current, addresses: current.addresses.filter(address => address.id !== id) } : current);
      showAppToast('Adresse supprimée.', 'success');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'L’adresse n’a pas pu être supprimée.';
      setError(message);
      showAppToast(message, 'error');
    }
  };

  const installClientApp = async () => {
    if (isIosDevice()) return;
    const installed = await promptPwaInstall();
    if (installed) showAppToast('MAXIMUS est maintenant installé sur votre appareil.', 'success');
  };

  if (loading) return <div className="min-h-screen bg-[hsl(var(--background))] p-6"><div className="mx-auto max-w-6xl animate-pulse"><div className="h-12 w-64 rounded bg-[hsl(var(--muted))]" /><div className="mt-8 h-64 rounded-3xl bg-[hsl(var(--muted))]" /></div></div>;
  if (!data) return <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] p-6"><section className="card-surface max-w-md rounded-2xl p-8 text-center"><Store className="mx-auto text-[hsl(var(--primary))]" size={30} /><h1 className="mt-4 text-xl font-bold">{clientApp ? 'Installation PWA à renouveler' : 'Boutique indisponible'}</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{clientApp ? 'Cette installation ne possède pas une adresse propre à cette boutique. Désinstallez-la, ouvrez la boutique depuis son lien public, puis installez-la à nouveau.' : error}</p></section></div>;

  const { store, products: allProducts, rentals } = data;
  const seller = {
    name: store.seller?.name ?? '',
    email: store.seller?.email ?? '',
    phone: store.seller?.phone ?? '',
    photoUrl: store.seller?.photoUrl ?? '',
  };
  const sellerCardImageUrl = store.logoUrl || seller.photoUrl;
  const canOpenSellerCard = Boolean(sellerCardImageUrl || seller.name || seller.email || seller.phone);
  const products = allProducts.filter(product => product.productType === 'SALE');
  const enabledFeatures = store.enabledFeatures ?? { location: false, transport: false, immobilier: false, livraisons: false, ventePhysique: true, venteNumerique: false };
  const requiresShipping = cart.some(line => Boolean(line.product.rentalId) || line.product.fulfillmentType !== 'DIGITAL');
  const selectedDeliveryZone = data.deliveryZones.find(zone => zone.id === checkoutDeliveryZoneId);
  const deliveryFee = requiresShipping ? selectedDeliveryZone?.fee ?? 0 : 0;
  const selectedOrder = customerData?.orders.find(order => order.id === orderDetailId);
  const selectedProduct = productDetailSlug ? products.find(product => product.slug === productDetailSlug) : undefined;
  const categories = [...new Set(products.map(item => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
  const visibleProducts = products.filter(product => categoryFilter === 'ALL' || product.category === categoryFilter).filter(product => {
    const needle = searchQuery.trim().toLocaleLowerCase('fr-FR');
    return !needle || `${product.name} ${product.description} ${product.category}`.toLocaleLowerCase('fr-FR').includes(needle);
  });
  const isHomeRoute = routePath === shopPath('') || routePath === shopPath('/accueil');
  const isCatalogRoute = routePath === shopPath('/boutique');
   const publicNav = [
     { label: 'Accueil', path: '/accueil' },
     { label: 'Boutique', path: '/boutique' },
     ...(enabledFeatures.location ? [{ label: 'Location', path: '/location' }] : []),
     ...(enabledFeatures.transport ? [{ label: 'Transport', path: '/transport' }] : []),
     ...(enabledFeatures.immobilier ? [{ label: 'Immobilier', path: '/immobilier' }] : []),
     ...(enabledFeatures.livraisons ? [{ label: 'Livraison', path: '/livraison' }] : []),
     { label: 'Panier', path: '/panier' },
     { label: customer ? 'Mon compte' : 'Se connecter', path: customer ? '/compte' : '/connexion' },
   ];
    const isPublicNavActive = (path: string) => {
      if (path === '/accueil') return isHomeRoute;
      if (path === '/boutique') return isCatalogRoute || Boolean(productDetailSlug);
     if (path === '/transport') return isTransportRoute;
     if (path === '/immobilier') return isImmobilierRoute;
     if (path === '/compte') return isAccountRoute;
     return routePath === shopPath(path);
   };
    const primaryMobileNav = publicNav.filter(item => ['/accueil', '/boutique', '/panier'].includes(item.path));
    const additionalMobileNav = publicNav.filter(item => !primaryMobileNav.some(primary => primary.path === item.path));
    const additionalMobileNavActive = additionalMobileNav.some(item => isPublicNavActive(item.path));
   const theme = publicShopTheme(store);
    return <div className="public-shop-shell min-h-screen w-full min-w-0 overflow-x-hidden bg-[hsl(var(--muted)/.22)]" style={{ '--shop-primary': theme.primary, '--shop-accent': theme.accent, '--shop-primary-foreground': theme.primaryForeground, '--shop-accent-foreground': theme.accentForeground } as React.CSSProperties}>
     <header className="relative border-b border-black/5 bg-white/95 text-[hsl(var(--foreground))] shadow-[0_1px_0_rgba(15,23,42,.03)] backdrop-blur">
       <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
            <div className="flex min-w-0 max-w-full shrink items-center gap-3 sm:max-w-[calc(100%-3rem)]">
              <button type="button" onClick={() => canOpenSellerCard && setLogoPreviewOpen(true)} disabled={!canOpenSellerCard} aria-label={canOpenSellerCard ? `Voir la fiche de ${seller.name || store.name}` : undefined} className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--shop-accent)] p-1.5 transition hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-[var(--shop-primary)]/50 disabled:cursor-default disabled:hover:scale-100">
                {store.logoUrl ? <img src={store.logoUrl} alt={`Logo de ${store.name}`} className="h-full w-full rounded-xl bg-white object-contain p-1" /> : <ShoppingBag size={19} className="text-[var(--shop-accent-foreground)]" />}
             </button>
             <button type="button" onClick={() => go('')} className="min-w-0 text-left">
                <span className="line-clamp-2 break-words text-base font-bold leading-tight tracking-[-.02em] sm:text-lg">{store.name}</span>
             </button>
           </div>
           <nav id="public-shop-header-nav" className="hidden items-center gap-1 lg:flex">
             {publicNav.map(item => {
               const active = isPublicNavActive(item.path);
               return <button type="button" key={item.path} onClick={() => go(item.path)} style={active ? { backgroundColor: theme.accent, color: theme.accentForeground } : undefined} className={`rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition sm:py-2 ${active ? 'shadow-sm' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'}`}>{item.label}{item.path === '/panier' && cartCount > 0 ? ` (${cartCount})` : ''}</button>;
             })}
         </nav>
       </div>
     </header>
      {logoPreviewOpen && canOpenSellerCard && <div role="dialog" aria-modal="true" aria-label={`Fiche de ${seller.name || store.name}`} className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setLogoPreviewOpen(false); }}>
         <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-8">
           <button type="button" onClick={() => setLogoPreviewOpen(false)} aria-label="Fermer la fiche vendeur" className="absolute right-3 top-3 rounded-full p-2 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"><X size={20} /></button>
           <p className="pr-10 text-center text-xs font-bold uppercase tracking-[.16em]" style={{ color: 'var(--shop-primary)' }}>À propos de la boutique</p>
           <div className="mt-5 flex justify-center">
             <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--shop-primary)]/20 bg-[hsl(var(--muted)/.45)] p-2">
                {sellerCardImageUrl ? <img src={sellerCardImageUrl} alt={`Logo de ${store.name}`} className="h-full w-full rounded-full object-cover" /> : <UserRound size={48} className="text-[hsl(var(--muted-foreground))]" />}
             </div>
           </div>
           <div className="mt-5 text-center">
             <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">{seller.name || store.name}</h2>
             <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{store.name}</p>
           </div>
           <div className="mt-6 grid gap-3">
             {seller.email && <a href={`mailto:${seller.email}`} className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition hover:bg-[hsl(var(--muted)/.55)]"><Mail size={17} style={{ color: 'var(--shop-primary)' }} /><span className="min-w-0 break-all">{seller.email}</span></a>}
             {seller.phone && <a href={`tel:${seller.phone}`} className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition hover:bg-[hsl(var(--muted)/.55)]"><Phone size={17} style={{ color: 'var(--shop-primary)' }} /><span>{seller.phone}</span></a>}
             {!seller.email && !seller.phone && <p className="rounded-xl bg-[hsl(var(--muted)/.55)] px-4 py-3 text-center text-sm text-[hsl(var(--muted-foreground))]">Les coordonnées du vendeur ne sont pas renseignées.</p>}
           </div>
         </div>
       </div>}
       <main className="shop-main mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-9 sm:pb-[calc(6rem+env(safe-area-inset-bottom))] lg:px-8 lg:pb-9">
      {error && <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Fermer"><X size={16} /></button></div>}
       {!isStandalonePwa() && manifestReady && (installAvailable || isIosDevice()) && <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-[var(--shop-primary)]/25 bg-[var(--shop-primary)]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
           <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--shop-primary)] text-[var(--shop-primary-foreground)]"><Download size={18} /></span>
          <div>
            <p className="text-sm font-bold">Installez cette boutique</p>
            <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
              {isIosDevice() ? 'Touchez Partager, puis « Sur l’écran d’accueil » pour retrouver rapidement votre espace client.' : 'Retrouvez la boutique et vos commandes plus rapidement depuis votre écran d’accueil.'}
            </p>
          </div>
        </div>
         {installAvailable && <button type="button" onClick={() => void installClientApp()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-[var(--shop-accent-foreground)]" style={{ backgroundColor: 'var(--shop-accent)' }}>
          <Download size={15} />Installer l’application
        </button>}
      </div>}
       {submitted ? <PaymentResultPanel summary={submitted} currency={store.currency} store={store} orderId={paymentReturn?.orderId ?? ''} onContinue={() => { setSubmitted(null); go(''); }} onOrders={customer ? () => { setSubmitted(null); go('/compte/commandes'); } : undefined} />
         : isAuthRoute ? <AuthPanel mode={authMode} onModeChange={mode => { setAuthMode(mode); go(mode === 'register' ? '/inscription-client' : '/connexion'); }} form={authForm} setForm={setAuthForm} onSubmit={() => void submitAuth()} onBack={() => go('')} />
              : isCartRoute ? <CartPanelV2 cart={cart} total={total + deliveryFee} requiresShipping={requiresShipping} zones={data.deliveryZones} deliveryZoneId={checkoutDeliveryZoneId} setDeliveryZoneId={setCheckoutDeliveryZoneId} store={store} customer={customer} form={checkoutForm} setForm={setCheckoutForm} attachments={orderAttachments} setAttachments={setOrderAttachments} paymentProvider={paymentProvider} setPaymentProvider={setPaymentProvider} onChange={change} onSubmit={() => void submitOrder()} submitting={submittingOrder} onBack={() => go('')} />
              : isAccountRoute && customer ? <AccountPanel store={store} section={accountSection} customer={customer} products={products} customerData={customerData} customerLoading={customerLoading} customerActionPending={customerActionPending} selectedOrder={selectedOrder} profileForm={profileForm} setProfileForm={setProfileForm} passwordForm={passwordForm} setPasswordForm={setPasswordForm} addressForm={addressForm} setAddressForm={setAddressForm} editingAddressId={editingAddressId} setEditingAddressId={setEditingAddressId} onProfile={() => void runCustomerAction(saveProfile)} onPassword={() => void runCustomerAction(savePassword)} onAddress={() => void runCustomerAction(saveAddress)} onDeleteAddress={id => void runCustomerAction(() => deleteAddress(id))} onFavorite={product => void runCustomerAction(() => toggleFavorite(product))} onDownload={(orderId, itemId) => void runCustomerAction(() => api.downloadDigitalProduct(orderId, itemId))} onDownloadAttachment={(orderId, attachmentId) => void runCustomerAction(() => api.downloadOrderAttachment(orderId, attachmentId))} onOrder={id => go(id ? `/compte/commandes/${encodeURIComponent(id)}` : '/compte/commandes')} onLogout={() => void runCustomerAction(async () => { await api.logout(); setCustomer(null); setCustomerData(null); setCart([]); go(''); })} onNavigate={go} />
            : isDeliveryRoute ? enabledFeatures.livraisons ? <DeliveryPage store={store} zones={data.deliveryZones ?? []} customer={customer} requests={customerData?.deliveryRequests ?? []} form={deliveryForm} setForm={setDeliveryForm} submitted={deliverySubmitted} onSubmit={() => void submitDeliveryRequest()} submitting={submittingDelivery} onNavigate={go} /> : <FeatureUnavailable title="Livraison non activée" text="Cette entreprise n’a pas encore autorisé la fonctionnalité livraison." onBack={() => go('')} />
              : isLocationRoute ? enabledFeatures.location ? <RentalPage rentals={rentals.filter(r => !('productSlug' in r))} store={store} customer={customer} slug={slug} domain={domain} onBack={() => go('')} /> : <FeatureUnavailable title="Location non activée" text="Cette entreprise n’a pas encore autorisé la fonctionnalité location." onBack={() => go('')} />
             : isTransportRoute ? enabledFeatures.transport ? <TransportPublicPage store={store} slug={slug} domain={domain} onBack={() => go('')} /> : <FeatureUnavailable title="Transport non activé" text="Cette entreprise n’a pas encore autorisé la fonctionnalité Transport." onBack={() => go('')} />
              : isImmobilierRoute ? enabledFeatures.immobilier ? <PublicImmobilierPage listings={data.immobilierListings ?? []} store={store} slug={slug} domain={domain} form={immobilierForm} setForm={setImmobilierForm} submitted={immobilierSubmitted} onSubmitted={() => setImmobilierSubmitted(true)} /> : <FeatureUnavailable title="Immobilier non activé" text="Cette entreprise n’a pas encore autorisé la vitrine immobilière." onBack={() => go('')} />
        : productDetailSlug ? selectedProduct ? <ProductDetail product={selectedProduct} store={store} zones={data.deliveryZones} onBack={() => go('/boutique')} onAdd={() => add(selectedProduct)} /> : <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">Ce produit n’est plus disponible.</div>
        : isHomeRoute ? <ShopHomePage products={products} rentals={rentals} locationEnabled={enabledFeatures.location} store={store} onProduct={product => go(`/produit/${encodeURIComponent(product.slug)}`)} onAdd={add} onLocation={() => go('/location')} onShop={() => go('/boutique')} />
        : isCatalogRoute ? <CatalogPage products={products} visibleProducts={visibleProducts} categories={categories} searchQuery={searchQuery} categoryFilter={categoryFilter} setSearchQuery={setSearchQuery} setCategoryFilter={setCategoryFilter} store={store} onProduct={product => go(`/produit/${encodeURIComponent(product.slug)}`)} onAdd={add} />
        : <ShopHomePage products={products} rentals={rentals} locationEnabled={enabledFeatures.location} store={store} onProduct={product => go(`/produit/${encodeURIComponent(product.slug)}`)} onAdd={add} onLocation={() => go('/location')} onShop={() => go('/boutique')} />}
    </main>
      {!isAuthRoute && !submitted && !isTransportRoute && <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,.08)] backdrop-blur lg:hidden" aria-label="Navigation mobile"><div className="mx-auto grid max-w-md grid-cols-4 gap-1">
         {primaryMobileNav.map(item => { const Icon = item.path === '/accueil' ? Store : item.path === '/boutique' ? Package : ShoppingBag; const active = isPublicNavActive(item.path); return <Button variant="ghost" size="sm" type="button" key={item.path} onClick={() => go(item.path)} aria-current={active ? 'page' : undefined} className={`relative h-auto min-w-0 flex-col gap-1 rounded-xl px-1 py-1.5 text-xs font-semibold ${active ? 'text-[var(--shop-accent)]' : 'text-[hsl(var(--muted-foreground))]'}`}><Icon size={18} /><span className="max-w-full truncate">{item.label}{item.path === '/panier' && cartCount > 0 ? ` (${cartCount})` : ''}</span>{item.path === '/panier' && cartCount > 0 && <span className="absolute right-1/4 top-0 flex h-4 min-w-4 translate-x-1/2 items-center justify-center rounded-full bg-[var(--shop-accent)] px-1 text-[9px] font-bold text-[var(--shop-accent-foreground)]">{cartCount}</span>}</Button>; })}
         <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" type="button" aria-label={additionalMobileNavActive ? 'Plus, une section est active' : 'Plus, autres fonctionnalités'} className={`relative h-auto min-w-0 flex-col gap-1 rounded-xl px-1 py-1.5 text-xs font-semibold ${additionalMobileNavActive ? 'text-[var(--shop-accent)]' : 'text-[hsl(var(--muted-foreground))]'}`}><Plus size={18} /><span>Plus</span>{additionalMobileNavActive && <span className="absolute right-1/4 top-0 h-2 w-2 translate-x-1/2 rounded-full bg-[var(--shop-accent)]" />}</Button></DropdownMenuTrigger><DropdownMenuContent align="end" side="top" sideOffset={8}>{additionalMobileNav.map(item => <DropdownMenuItem key={item.path} onSelect={() => go(item.path)} className={isPublicNavActive(item.path) ? 'font-bold text-[var(--shop-accent)]' : ''}>{item.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
       </div></nav>}
        {cartNotice && <div role="status" aria-live="polite" className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-3 py-3 shadow-xl lg:inset-x-auto lg:bottom-4 lg:right-6 lg:w-[min(24rem,calc(100vw-3rem))]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check size={16} /></span><p className="min-w-0 flex-1 text-sm font-semibold text-[hsl(var(--foreground))]">{cartNotice}</p><button type="button" onClick={() => go('/panier')} className="shrink-0 rounded-lg px-2.5 py-2 text-xs font-bold text-[var(--shop-accent-foreground)]" style={{ backgroundColor: 'var(--shop-accent)' }}>Voir le panier</button><button type="button" onClick={() => setCartNotice('')} className="shrink-0 rounded-lg p-1.5 text-[hsl(var(--muted-foreground))]" aria-label="Fermer la confirmation"><X size={15} /></button></div>}
  </div>;
}

function PublicImmobilierPage({ listings, store, slug, domain, form, setForm, submitted, onSubmitted }: {
  listings: PublicShopBootstrap['immobilierListings'];
  store: PublicShopBootstrap['store'];
  slug?: string;
  domain: boolean;
  form: { listingId: string; requestType: 'CONTACT' | 'VISIT'; name: string; email: string; phone: string; preferredDate: string; message: string };
  setForm: (value: { listingId: string; requestType: 'CONTACT' | 'VISIT'; name: string; email: string; phone: string; preferredDate: string; message: string }) => void;
  submitted: boolean;
  onSubmitted: () => void;
}) {
  const selected = listings.find(item => item.id === form.listingId);
  const [selectedListing, setSelectedListing] = useState<PublicShopBootstrap['immobilierListings'][number] | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await publicImmobilierApi.createLead(slug, domain, {
        listingId: form.listingId || undefined,
        requestType: form.requestType,
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        preferredDate: form.preferredDate || undefined,
        message: form.message || undefined,
      });
      onSubmitted();
    } catch (error) {
      showAppToast(error instanceof Error ? error.message : 'Votre demande n’a pas pu être envoyée.', 'error');
    }
  };
  if (selectedListing) {
    return <PublicImmobilierDetail listing={selectedListing} store={store} onBack={() => setSelectedListing(null)} onRequest={() => {
      setForm({ ...form, listingId: selectedListing.id });
      setSelectedListing(null);
      window.setTimeout(() => document.getElementById('immobilier-contact-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    }} />;
  }
  return <section className="space-y-6">
    <div className="rounded-3xl bg-[var(--shop-primary)] p-6 text-[var(--shop-primary-foreground)] sm:p-10"><p className="text-xs font-bold uppercase tracking-[.18em] opacity-75">Vitrine immobilière</p><h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-[-.05em] sm:text-5xl">Trouvez un bien qui correspond à votre projet.</h1><p className="mt-4 max-w-2xl text-sm leading-7 opacity-85">Consultez les annonces publiées par {store.name} et échangez directement avec l’agence pour organiser une visite.</p></div>
     {listings.length === 0 ? <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">Aucune annonce immobilière n’est publiée pour le moment.</div> : <div className="grid grid-cols-2 gap-2 min-[480px]:gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{listings.map(listing => <article key={listing.id} className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-black/5 bg-white shadow-[0_3px_12px_rgba(15,23,42,.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(15,23,42,.1)]"><button type="button" onClick={() => setSelectedListing(listing)} className="text-left"><ImmobilierGallery media={listing.gallery} profileMedia={listing.profileMedia} title={listing.title} /></button><div className="flex flex-1 flex-col p-2.5 sm:p-3"><div className="flex items-center justify-between gap-2"><span className="truncate text-[8px] font-bold uppercase tracking-[.1em] text-[var(--shop-primary)]">{listing.transactionType === 'SALE' ? 'À vendre' : 'À louer'}</span>{listing.featured && <span className="shrink-0 rounded bg-[var(--shop-accent)]/15 px-1 py-0.5 text-[8px] font-bold">À la une</span>}</div><button type="button" onClick={() => setSelectedListing(listing)} className="mt-1 line-clamp-2 min-h-8 text-left text-xs font-semibold leading-4 sm:text-sm">{listing.title}</button><p className="mt-1 truncate text-[10px] text-[hsl(var(--muted-foreground))]">{listing.neighborhood ? `${listing.neighborhood}, ` : ''}{listing.city}</p><p className="mt-2 text-sm font-bold leading-4 sm:text-base" style={{ color: 'var(--shop-accent)' }}>{money(listing.price, store.currency)}</p><div className="mt-2 flex flex-wrap gap-1 text-[9px] font-semibold text-[hsl(var(--muted-foreground))]">{listing.areaM2 && <span className="rounded bg-[hsl(var(--muted))] px-1.5 py-1">{listing.areaM2} m²</span>}{listing.bedrooms !== null && <span className="rounded bg-[hsl(var(--muted))] px-1.5 py-1">{listing.bedrooms} ch.</span>}{listing.bathrooms !== null && <span className="rounded bg-[hsl(var(--muted))] px-1.5 py-1">{listing.bathrooms} sdb.</span>}</div><p className="mt-2 line-clamp-2 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">{listing.description || 'Contactez l’agence pour recevoir les détails du bien.'}</p><div className="mt-auto flex gap-2 pt-3"><button type="button" onClick={() => setSelectedListing(listing)} className="flex-1 rounded-lg border px-2 py-2 text-[10px] font-bold sm:text-xs">Voir le bien</button><button type="button" onClick={() => setForm({ ...form, listingId: listing.id })} className="flex-1 rounded-lg px-2 py-2 text-[10px] font-bold text-[var(--shop-accent-foreground)] sm:text-xs" style={{ backgroundColor: 'var(--shop-accent)' }}>Demander</button></div></div></article>)}</div>}
     <form id="immobilier-contact-form" onSubmit={submit} className="rounded-2xl border bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-bold">Parler à l’agence</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Laissez vos coordonnées pour être recontacté.</p>{submitted ? <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Votre demande a bien été envoyée. L’agence reviendra vers vous prochainement.</div> : <div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-xs font-bold">Annonce<select value={form.listingId} onChange={e => setForm({ ...form, listingId: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm"><option value="">Demande générale</option>{listings.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="text-xs font-bold">Type de demande<select value={form.requestType} onChange={e => setForm({ ...form, requestType: e.target.value as 'CONTACT' | 'VISIT' })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm"><option value="CONTACT">Être rappelé</option><option value="VISIT">Demander une visite</option></select></label><label className="text-xs font-bold">Nom complet<input required minLength={2} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" /></label><label className="text-xs font-bold">Email<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" /></label><label className="text-xs font-bold">Téléphone<input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" /></label><label className="text-xs font-bold">Date souhaitée<input type="date" value={form.preferredDate} onChange={e => setForm({ ...form, preferredDate: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" /></label><label className="text-xs font-bold md:col-span-2">Message<textarea rows={3} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" placeholder={selected ? `Votre question sur « ${selected.title} »` : 'Votre projet immobilier'} /></label><button type="submit" className="rounded-xl px-4 py-3 text-sm font-bold text-[var(--shop-accent-foreground)] md:col-span-2" style={{ backgroundColor: 'var(--shop-accent)' }}>Envoyer ma demande</button></div>}</form>
  </section>;
}

function ImmobilierGallery({ media, profileMedia, title }: { media: PublicShopBootstrap['immobilierListings'][number]['gallery']; profileMedia: PublicShopBootstrap['immobilierListings'][number]['profileMedia']; title: string }) {
  const profile = profileMedia ?? media[0];
  const galleryCount = Math.max(0, media.length - (profile ? 1 : 0));
  return <div className="space-y-1 bg-[hsl(var(--muted)/.35)] p-1.5">
    <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-[hsl(var(--muted)/.45)]">
      {profile?.type === 'video'
        ? <video src={profile.url} title={title} muted playsInline autoPlay loop className="h-full w-full object-cover" />
        : profile?.url
          ? <img src={profile.url} alt={title} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
          : <Building2 size={28} style={{ color: 'var(--shop-primary)' }} />}
      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[8px] font-bold text-white">Photo profil</span>
      {galleryCount > 0 && <span className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[8px] font-bold text-white">+{galleryCount} galerie</span>}
    </div>
  </div>;
}

function PublicImmobilierDetail({ listing, store, onBack, onRequest }: { listing: PublicShopBootstrap['immobilierListings'][number]; store: PublicShopBootstrap['store']; onBack: () => void; onRequest: () => void }) {
  return <section className="mx-auto max-w-5xl">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))]"><ArrowLeft size={15} />Retour aux annonces</button>
    <div className="mt-6 grid gap-6 rounded-3xl border bg-white p-5 shadow-sm sm:p-8 lg:grid-cols-[1.1fr_.9fr]">
      <ImmobilierDetailGallery media={listing.gallery} profileMedia={listing.profileMedia} title={listing.title} />
      <div className="flex flex-col justify-center">
        <p className="text-xs font-bold uppercase tracking-[.16em]" style={{ color: 'var(--shop-primary)' }}>{listing.transactionType === 'SALE' ? 'À vendre' : 'À louer'} · {listing.propertyType}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-.04em]">{listing.title}</h1>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{listing.neighborhood ? `${listing.neighborhood}, ` : ''}{listing.city}</p>
        <p className="mt-5 text-2xl font-bold" style={{ color: 'var(--shop-accent)' }}>{money(listing.price, store.currency)}</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-[hsl(var(--muted-foreground))]">{listing.areaM2 !== null && <span className="rounded-lg bg-[hsl(var(--muted))] px-2.5 py-1.5">{listing.areaM2} m²</span>}{listing.bedrooms !== null && <span className="rounded-lg bg-[hsl(var(--muted))] px-2.5 py-1.5">{listing.bedrooms} chambre(s)</span>}{listing.bathrooms !== null && <span className="rounded-lg bg-[hsl(var(--muted))] px-2.5 py-1.5">{listing.bathrooms} salle(s) de bain</span>}{listing.furnished && <span className="rounded-lg bg-[hsl(var(--muted))] px-2.5 py-1.5">Meublé</span>}</div>
        <p className="mt-5 whitespace-pre-line text-sm leading-7 text-[hsl(var(--muted-foreground))]">{listing.description || 'Contactez l’agence pour recevoir les détails du bien.'}</p>
        <button type="button" onClick={onRequest} className="mt-6 rounded-xl px-4 py-3 text-sm font-bold text-[var(--shop-accent-foreground)]" style={{ backgroundColor: 'var(--shop-accent)' }}>Demander des informations</button>
      </div>
    </div>
  </section>;
}

function ImmobilierDetailGallery({ media, profileMedia, title }: { media: PublicShopBootstrap['immobilierListings'][number]['gallery']; profileMedia: PublicShopBootstrap['immobilierListings'][number]['profileMedia']; title: string }) {
  const items = Array.from(new Map([...(profileMedia ? [profileMedia] : []), ...media].map(item => [item.id, item])).values());
  const [selected, setSelected] = useState(0);
  const active = items[selected];
  return <div className="space-y-3">
    <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-[hsl(var(--muted)/.5)]">
      {active?.type === 'video' ? <video src={active.url} title={title} controls playsInline className="h-full w-full object-contain" /> : active?.url ? <img src={active.url} alt={title} className="h-full w-full object-cover" /> : <Building2 size={54} className="text-[hsl(var(--muted-foreground))]" />}
      {items.length > 1 && <><button type="button" aria-label="Média précédent" onClick={() => setSelected(index => (index - 1 + items.length) % items.length)} className="absolute left-3 rounded-full bg-black/50 p-2 text-white"><ArrowLeft size={15} /></button><button type="button" aria-label="Média suivant" onClick={() => setSelected(index => (index + 1) % items.length)} className="absolute right-3 rounded-full bg-black/50 p-2 text-white"><ArrowRight size={15} /></button></>}
    </div>
    {items.length > 1 && <div className="flex gap-2 overflow-x-auto pb-1">{items.map((item, index) => <button type="button" key={item.id} onClick={() => setSelected(index)} className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${selected === index ? 'border-[var(--shop-primary)]' : 'border-transparent'}`} aria-label={`Média ${index + 1}`}>{item.type === 'video' ? <video src={item.url} muted playsInline className="h-full w-full object-cover" /> : <img src={item.url} alt={`${title} ${index + 1}`} className="h-full w-full object-cover" />}</button>)}</div>}
  </div>;
}

function PaymentResultPanel({ summary, currency, store, orderId, slug, domain, onContinue, onOrders }: { summary: PaymentSummary; currency: PublicShopBootstrap['store']['currency']; store: PublicShopBootstrap['store']; orderId: string; slug?: string; domain?: boolean; onContinue: () => void; onOrders?: () => void }) {
  const paid = summary.paymentStatus === 'PAID';
  const failed = ['FAILED', 'REFUNDED'].includes(summary.paymentStatus);
  const deliveredAutomatically = paid && summary.orderStatus === 'LIVRÉE';
  const title = paid ? 'Paiement confirmé' : failed ? 'Paiement non confirmé' : 'Paiement en cours de confirmation';
  const message = paid
    ? deliveredAutomatically
      ? 'Votre produit numérique est livré automatiquement. Le téléchargement a été lancé et reste disponible dans votre espace client.'
      : 'Votre commande est enregistrée. Le vendeur va maintenant la préparer.'
    : failed
      ? (summary.failureReason || 'Le paiement n’a pas été confirmé. Vous pouvez retourner à la boutique et réessayer.')
      : 'Le paiement a été transmis. Cette page se met à jour dès que DiamanoPay confirme la transaction.';

  let rentalData: { reservation: EcommerceCarReservation, carName: string } | null = null;
  try {
    const savedStr = localStorage.getItem(`maximus-last-rental:${clientPwaStorageKey(slug, Boolean(domain))}`);
    if (savedStr) {
      const saved = JSON.parse(savedStr);
      if (saved && saved.orderId === orderId) {
        rentalData = saved;
      } else {
        localStorage.removeItem(`maximus-last-rental:${clientPwaStorageKey(slug, Boolean(domain))}`);
      }
    }
  } catch {}

  const handleContinue = () => {
    try { localStorage.removeItem(`maximus-last-rental:${clientPwaStorageKey(slug, Boolean(domain))}`); } catch {}
    onContinue();
  };

  const handleOrders = () => {
    try { localStorage.removeItem(`maximus-last-rental:${clientPwaStorageKey(slug, Boolean(domain))}`); } catch {}
    if (onOrders) onOrders();
  };

  const getWhatsappUrl = () => {
    if (!store.locationSettings?.whatsapp) return '';
    const num = store.locationSettings.whatsapp.replace(/[^0-9+]/g, '');
    let msg = store.locationSettings.message;
    if (!msg) {
      msg = `Bonjour, je viens de réserver le véhicule ${rentalData?.carName} du ${rentalData ? readableDate(rentalData.reservation.startsAt) : ''} au ${rentalData ? readableDate(rentalData.reservation.endsAt) : ''}. Ma référence est ${summary.reference}.`;
    }
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  };

  const getInvoiceUrl = () => {
    if (!rentalData) return '';
    const tokenParam = rentalData.reservation.invoiceToken ? `?token=${encodeURIComponent(rentalData.reservation.invoiceToken)}` : '';
    if (domain) {
      return `/api/shop-domain/location/reservations/${rentalData.reservation.id}/invoice${tokenParam}`;
    }
    return `/api/shop/${encodeURIComponent(slug ?? store.slug)}/location/reservations/${rentalData.reservation.id}/invoice${tokenParam}`;
  };

  return <section className="mx-auto max-w-xl rounded-3xl border bg-[hsl(var(--card))] p-8 text-center shadow-sm sm:p-10">
    <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${paid ? 'bg-emerald-100 text-emerald-700' : failed ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
      {paid ? <Check size={26} /> : failed ? <X size={26} /> : <span className="text-xl font-bold">…</span>}
    </span>
    <h1 className="mt-5 text-2xl font-bold">{title}</h1>
    <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{rentalData ? (paid ? 'Votre réservation est confirmée. Vous pouvez télécharger votre facture ou contacter le loueur.' : message) : message}</p>
    <p className="mt-4 text-sm font-semibold">Référence : <strong className="text-[hsl(var(--foreground))]">{summary.reference}</strong></p>
    <p className="mt-2 text-lg font-bold" style={{ color: 'var(--shop-primary)' }}>{money(summary.total, currency)}</p>

    <div className="mt-7 flex flex-wrap justify-center gap-3">
      <button type="button" onClick={handleContinue} className="rounded-xl px-5 py-3 text-sm font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>Retour à la boutique</button>
      {onOrders && <button type="button" onClick={handleOrders} className="rounded-xl border px-5 py-3 text-sm font-bold">Voir mes commandes</button>}

      {paid && rentalData && <a href={getInvoiceUrl()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold text-[hsl(var(--primary))] hover:bg-[hsl(var(--muted))]"><ArrowDownToLine size={16} />Facture</a>}
      {paid && rentalData && store.locationSettings?.whatsapp && <a href={getWhatsappUrl()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white" style={{ backgroundColor: '#25D366' }}>WhatsApp</a>}
    </div>
  </section>;
}

function paymentErrorMessage(cause: unknown): string {
  const raw = cause instanceof Error ? cause.message.trim() : '';
  const normalized = raw.toLocaleLowerCase('fr-FR');
  if (normalized.includes('insuff') || normalized.includes('insufficient') || normalized.includes('funds') || normalized.includes('solde')) {
    return 'Paiement refusé : le solde Wave est insuffisant. Rechargez votre compte puis réessayez.';
  }
  if (normalized.includes('cancel') || normalized.includes('annul')) {
    return 'Paiement annulé. Votre commande n’a pas été débitée. Vous pouvez réessayer.';
  }
  if (normalized.includes('declin') || normalized.includes('reject') || normalized.includes('denied') || normalized.includes('échou') || normalized.includes('echec') || normalized.includes('failed')) {
    return 'Paiement refusé par Wave. Vérifiez les informations de paiement puis réessayez.';
  }
  return raw || 'Le paiement n’a pas pu être lancé. Vous pouvez réessayer.';
}

 function ProductDetail({ product, store, zones, onBack, onAdd }: { product: PublicProduct; store: PublicShopBootstrap['store']; zones: PublicShopBootstrap['deliveryZones']; onBack: () => void; onAdd: () => void }) {
  const isRental = product.productType === 'RENTAL';
  const rentalUnit = product.rentalPeriod === 'MOIS' ? 'mois' : product.rentalPeriod === 'SEMAINE' ? 'semaine' : 'jour';
  return <section className="mx-auto max-w-4xl"><button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))]"><ArrowLeft size={15} />Retour à la boutique</button><div className="mt-6 grid gap-6 rounded-3xl border bg-[hsl(var(--card))] p-5 shadow-sm sm:grid-cols-2 sm:p-8"><GalleryCarousel mainImage={product.imageUrl} gallery={product.gallery} alt={product.name} icon={Package} /><div className="flex flex-col justify-center"><p className="text-xs font-bold uppercase tracking-[.16em]" style={{ color: 'var(--shop-primary)' }}>{isRental ? `LOCATION · ${rentalUnit}` : 'VENTE'} · {product.category}</p><h1 className="mt-3 text-3xl font-bold tracking-[-.04em]">{product.name}</h1><p className="mt-4 text-2xl font-bold" style={{ color: 'var(--shop-accent)' }}>{money(product.price, store.currency)}{isRental && <span className="ml-1 text-sm font-semibold">/ {rentalUnit}</span>}</p>{product.compareAtPrice && product.compareAtPrice > product.price && <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))] line-through">{money(product.compareAtPrice, store.currency)}</p>}<p className="mt-5 whitespace-pre-line text-sm leading-7 text-[hsl(var(--muted-foreground))]">{product.description || 'Une référence sélectionnée par votre boutique.'}</p><p className={`mt-5 text-xs font-semibold ${product.stock > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>{product.stock > 0 ? `${product.stock} unité${product.stock > 1 ? 's' : ''} disponible${product.stock > 1 ? 's' : ''}` : 'Indisponible'}</p>{product.fulfillmentType !== 'DIGITAL' && zones.length > 0 && <div className="mt-5 rounded-2xl border border-[var(--shop-primary)]/20 bg-[var(--shop-primary)]/5 p-4"><p className="text-sm font-bold">Zones de livraison disponibles</p><div className="mt-3 grid gap-2">{zones.map(zone => <div key={zone.id} className="flex items-start justify-between gap-3 rounded-xl bg-white/70 px-3 py-2.5 text-xs"><span><strong className="block">{zone.name}</strong>{zone.description && <span className="mt-0.5 block text-[hsl(var(--muted-foreground))]">{zone.description}</span>}</span><strong className="shrink-0">{zone.fee > 0 ? money(zone.fee, store.currency) : 'Gratuit'}</strong></div>)}</div></div>}<button type="button" onClick={onAdd} disabled={product.stock <= 0} className="mt-6 rounded-xl px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50" style={{ backgroundColor: 'var(--shop-accent)' }}>{product.stock > 0 ? (isRental ? 'Ajouter une demande de location' : 'Ajouter au panier') : 'Indisponible'}</button></div></div></section>;
}


function GalleryCarousel({ mainImage, gallery, alt, icon: Icon }: { mainImage: string; gallery?: string[] | null; alt: string; icon: typeof Package }) {
  const images = Array.from(new Set([mainImage, ...(gallery ?? [])].filter(Boolean)));
  const [selected, setSelected] = useState(0);
  const active = images[selected] ?? '';
  return <div className="space-y-3">
    <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-[hsl(var(--muted)/.5)]">
      {active ? <img src={active} alt={alt} className="h-full w-full object-contain p-5" /> : <Icon size={54} className="text-[hsl(var(--muted-foreground))]" />}
      {images.length > 1 && <><button type="button" aria-label="Image précédente" onClick={() => setSelected(index => (index - 1 + images.length) % images.length)} className="absolute left-3 rounded-full bg-black/45 p-2 text-white"><ArrowLeft size={15} /></button><button type="button" aria-label="Image suivante" onClick={() => setSelected(index => (index + 1) % images.length)} className="absolute right-3 rounded-full bg-black/45 p-2 text-white"><ArrowRight size={15} /></button></>}
    </div>
    {images.length > 1 && <div className="flex gap-2 overflow-x-auto pb-1">{images.map((image, index) => <button type="button" key={image} onClick={() => setSelected(index)} className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${selected === index ? 'border-[var(--shop-primary)]' : 'border-transparent'}`}><img src={image} alt={`${alt} ${index + 1}`} className="h-full w-full object-cover" /></button>)}</div>}
  </div>;
}

function PublicTransportLocationPreview({
  position,
  locationState,
  locationMessage,
  onLocate,
}: {
  position: { latitude: number; longitude: number; accuracy: number } | null;
  locationState: 'idle' | 'locating' | 'ready' | 'error';
  locationMessage: string;
  onLocate: () => void;
}) {
  const locationStatus = locationState === 'locating'
    ? 'Recherche du signal GPS précis à Dakar…'
    : locationState === 'error'
      ? locationMessage
      : 'Autorisez la localisation pour afficher votre position exacte.';

  return <div data-testid="card-public-transport-location" className="overflow-hidden rounded-lg border border-border bg-background">
    {position ? (
      <TaxiRouteMap
        clientStop={{ latitude: position.latitude, longitude: position.longitude }}
        displayMode="location"
      className="h-36 sm:h-60"
      />
    ) : (
      <div className="grid h-36 place-items-center bg-muted px-5 text-center sm:h-48" aria-live="polite">
        <div className="max-w-xs">
          <MapPin size={22} className="mx-auto text-primary" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold">{locationStatus}</p>
        </div>
      </div>
    )}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-3 sm:px-4">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Position GPS exacte</p>
        {position ? <>
          <p data-testid="text-public-transport-coordinates" className="mt-1 break-all font-mono text-xs font-semibold sm:text-sm">
            {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Précision GPS · environ {Math.round(position.accuracy)} m</p>
        </> : <p role="status" className="mt-1 text-xs text-muted-foreground">{locationStatus}</p>}
      </div>
      <TransportButton
        data-testid="button-refresh-public-transport-location"
        type="button"
        variant="outline"
        size="sm"
        onClick={onLocate}
        disabled={locationState === 'locating'}
      >
        {locationState === 'locating' ? <RefreshCw className="animate-spin" /> : <MapPin />}
        {locationState === 'locating' ? 'Recherche…' : locationState === 'ready' ? 'Actualiser' : 'Réessayer'}
      </TransportButton>
    </div>
  </div>;
}

function TransportPublicPage({ store, slug, domain, onBack }: { store: PublicShopBootstrap['store']; slug?: string; domain?: boolean; onBack: () => void }) {
  const phone = store.seller?.phone?.trim() ?? '';
  const whatsapp = whatsappNumber(phone);
  const whatsappHref = whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Bonjour ${store.name}, je souhaite demander une course Taxi.`)}` : '';
  const api = useMemo(() => createPublicTransportApi(slug, domain), [domain, slug]);
  const shareLocation = useMemo(() => parsePublicTransportShareUrl(window.location.href), []);
  const [transportColors, setTransportColors] = useState<{ primaryColor?: string; accentColor?: string } | null>(() => ({
    primaryColor: store.transportPrimaryColor,
    accentColor: store.transportAccentColor,
  }));
  const theme = publicTransportTheme(transportColors);
  const customerStorageKey = useMemo(() => `maximus-taxi-customer:${domain ? window.location.host : slug ?? 'shop'}`, [domain, slug]);
  const [form, setForm] = useState({ pickup: '', destination: '', passengerName: 'Client Taxi', passengerPhone: '' });
  const [position, setPosition] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [locationState, setLocationState] = useState<'idle' | 'locating' | 'ready' | 'error'>('idle');
  const [locationMessage, setLocationMessage] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState<'route' | 'passenger'>('route');
  const [routeMapOpen, setRouteMapOpen] = useState(false);
  const [sharePanelOpen, setSharePanelOpen] = useState(false);
  const [restoringTrip, setRestoringTrip] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [trip, setTrip] = useState<PublicTransportTrip | null>(null);
  const [cancelToken, setCancelToken] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [shareError, setShareError] = useState('');
  const [tripEnded, setTripEnded] = useState<PublicTransportTrip | null>(null);
  const [tripMessage, setTripMessage] = useState('');
  const [quote, setQuote] = useState<PublicTransportQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [destinationPlaces, setDestinationPlaces] = useState<PublicTransportPlace[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PublicTransportPlace | null>(null);
  const [heroImageUrls, setHeroImageUrls] = useState<string[]>(['/taxi-transport-hero.jpg']);
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const locationWatchRef = useRef<number | null>(null);
  const locationTimeoutRef = useRef<number | null>(null);
  const homeGpsRequestRef = useRef<string | null>(null);

  useEffect(() => {
    void api.getSettings().then(result => {
      const images = Array.from(new Set((result.heroImageUrls?.length ? result.heroImageUrls : [result.heroImageUrl]).filter(Boolean)));
      setHeroImageUrls(images.length ? images : ['/taxi-transport-hero.jpg']);
      setHeroImageIndex(0);
      setTransportColors(result);
    }).catch(() => {
      // The shop branding remains visible if the public Transport configuration is unavailable.
    });
  }, [api]);

  useEffect(() => {
    if (heroImageUrls.length < 2) return undefined;
    const interval = window.setInterval(() => {
      setHeroImageIndex(current => (current + 1) % heroImageUrls.length);
    }, 4500);
    return () => window.clearInterval(interval);
  }, [heroImageUrls.length]);

  const applyTripResult = (result: { trip: PublicTransportTrip; message: string }) => {
    setTripMessage(result.message);
    setRestoreError('');
    if (['COMPLETED', 'CANCELLED'].includes(result.trip.status)) {
      window.localStorage.removeItem(customerStorageKey);
      setCancelToken(null);
      setShareToken(null);
      setShareExpiresAt(null);
      setShareUrl('');
      setTrip(null);
      setTripEnded(result.trip);
      setFormOpen(false);
      return;
    }
    setTripEnded(null);
    setTrip(result.trip);
    setFormOpen(false);
  };

  const refreshTrip = async () => {
    if (!trip) return;
    try {
      applyTripResult(await api.getTrip(trip.id));
    } catch {
      // Keep the last known position visible while the next refresh retries.
    }
  };

  useAutoRefresh(refreshTrip, { enabled: Boolean(trip) && !shareLocation, intervalMs: 5_000 });

  useEffect(() => {
    const query = form.destination.trim();
    if (trip || query.length < 2 || isDestinationPlaceCommitted(query, selectedPlace)) {
      setDestinationPlaces([]);
      setPlacesLoading(false);
      return undefined;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      setPlacesLoading(true);
      void api.places(query).then(result => {
        if (active) {
          setDestinationPlaces(result.places);
        }
      }).catch(() => {
        if (active) setDestinationPlaces([]);
      }).finally(() => {
        if (active) setPlacesLoading(false);
      });
    }, 350);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [api, form.destination, selectedPlace, trip]);

  useEffect(() => {
    if (!position || trip || form.destination.trim().length < 2) {
      setQuote(null);
      setQuoteError('');
      setQuoteLoading(false);
      return undefined;
    }
    if (placesLoading) {
      setQuote(null);
      setQuoteError('');
      setQuoteLoading(false);
      return undefined;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      setQuoteLoading(true);
      setQuoteError('');
      void api.quote({
        destination: form.destination.trim(),
        pickupLatitude: position.latitude,
        pickupLongitude: position.longitude,
        ...(selectedPlace ? {
          destinationLatitude: selectedPlace.latitude,
          destinationLongitude: selectedPlace.longitude,
        } : {}),
      }).then(result => {
        if (active) setQuote(result);
      }).catch(cause => {
        if (active) {
          setQuote(null);
          setQuoteError(cause instanceof Error ? cause.message : 'Précisez un quartier, une rue ou un repère de Dakar.');
        }
      }).finally(() => {
        if (active) setQuoteLoading(false);
      });
    }, 500);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [api, form.destination, placesLoading, position, selectedPlace, trip]);

  const stopLocationTracking = () => {
    if (locationWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(locationWatchRef.current);
      locationWatchRef.current = null;
    }
    if (locationTimeoutRef.current !== null) {
      window.clearTimeout(locationTimeoutRef.current);
      locationTimeoutRef.current = null;
    }
  };

  const locate = () => {
    setPosition(null);
    if (!navigator.geolocation) {
      setLocationState('error');
      setLocationMessage('La géolocalisation n’est pas disponible sur cet appareil.');
      return;
    }
    stopLocationTracking();
    setLocationState('locating');
    setLocationMessage('Recherche d’une position GPS précise dans la zone de Dakar…');
    let bestAccuracy = Number.POSITIVE_INFINITY;
    let outsideDakar = false;
    const handlePosition = ({ coords }: GeolocationPosition) => {
      if (!isWithinDakar(coords.latitude, coords.longitude)) {
        outsideDakar = true;
        return;
      }
      if (coords.accuracy >= bestAccuracy) return;
      bestAccuracy = coords.accuracy;
      setPosition({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy });
      setLocationState('ready');
      setLocationMessage(`Position GPS prête · précision actuelle d’environ ${Math.round(coords.accuracy)} m.`);
      if (coords.accuracy <= 50) stopLocationTracking();
    };
    const handleError = ({ code }: GeolocationPositionError) => {
      if (code === 1) {
        stopLocationTracking();
        setLocationState('error');
        setLocationMessage('Autorisez la localisation pour trouver le chauffeur le plus proche.');
      }
    };
    locationWatchRef.current = navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20_000,
    });
    locationTimeoutRef.current = window.setTimeout(() => {
      const hasPosition = bestAccuracy < Number.POSITIVE_INFINITY;
      stopLocationTracking();
      if (hasPosition) {
        setLocationMessage(`Meilleure position disponible · précision d’environ ${Math.round(bestAccuracy)} m.`);
      } else {
        setLocationState('error');
        setLocationMessage(outsideDakar
          ? 'La position reçue est hors de la zone de Dakar.'
          : 'La position GPS n’a pas pu être obtenue. Vérifiez le signal et réessayez.');
      }
    }, 20_000);
  };

  const requestHomeLocation = () => {
    if (shareLocation || homeGpsRequestRef.current === customerStorageKey) return;
    homeGpsRequestRef.current = customerStorageKey;
    locate();
  };

  useEffect(() => {
    return stopLocationTracking;
  }, []);

  useEffect(() => {
    if (shareLocation) return;
    try {
      const saved = window.localStorage.getItem(customerStorageKey);
      if (!saved) {
        requestHomeLocation();
        return;
      }
      const customer = JSON.parse(saved) as {
        tripId?: string;
        cancelToken?: string;
        shareToken?: string;
        shareExpiresAt?: string;
        passengerName?: string;
        passengerPhone?: string;
      };
      setForm(current => ({
        ...current,
        passengerName: customer.passengerName?.trim() || current.passengerName,
        passengerPhone: customer.passengerPhone?.trim() || current.passengerPhone,
      }));
      if (customer.cancelToken) setCancelToken(customer.cancelToken);
      if (customer.shareToken && customer.shareExpiresAt && Date.parse(customer.shareExpiresAt) > Date.now()) {
        setShareToken(customer.shareToken);
        setShareExpiresAt(customer.shareExpiresAt);
      }
      if (customer.tripId) {
        setRestoringTrip(true);
        void api.getTrip(customer.tripId).then(result => {
          applyTripResult(result);
          if (['COMPLETED', 'CANCELLED'].includes(result.trip.status)) requestHomeLocation();
        }).catch(cause => {
          if (cause instanceof ApiRequestError && cause.status === 404) {
            window.localStorage.removeItem(customerStorageKey);
            setRestoreError('Cette demande de course n’est plus disponible. Vous pouvez en créer une nouvelle.');
          } else {
            setRestoreError('Votre demande est conservée. La connexion au suivi est momentanément indisponible.');
          }
        }).finally(() => setRestoringTrip(false));
        return;
      }
    } catch {
      // Ignore an invalid local preference; the order flow remains usable.
    }
    requestHomeLocation();
  }, [api, customerStorageKey, shareLocation]);

  useEffect(() => {
    if (trip || !tripEnded || restoringTrip || restoreError || formOpen || shareLocation) return;
    requestHomeLocation();
  }, [customerStorageKey, formOpen, restoreError, restoringTrip, shareLocation, trip, tripEnded]);

  useEffect(() => {
    if (!trip || !shareToken || !shareExpiresAt || Date.parse(shareExpiresAt) <= Date.now()) {
      setShareUrl('');
      return;
    }
    setShareUrl(buildPublicTransportShareUrl(window.location.href, trip.id, shareToken));
  }, [shareExpiresAt, shareToken, trip?.id]);

  const copyShareUrl = async (url: string) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url);
      setShareMessage('Lien copié. Le suivi partagé est en lecture seule.');
    } catch {
      setShareMessage('Le lien est prêt ci-dessous. Sélectionnez-le et copiez-le.');
    }
  };

  const createOrCopyShareLink = async () => {
    if (!trip || !cancelToken || shareLoading) return;
    setShareLoading(true);
    setShareError('');
    setShareMessage('');
    try {
      if (shareUrl && shareExpiresAt && Date.parse(shareExpiresAt) > Date.now()) {
        await copyShareUrl(shareUrl);
        return;
      }

      const result = await api.createShareLink(trip.id, cancelToken);
      const url = buildPublicTransportShareUrl(window.location.href, trip.id, result.shareToken);
      window.localStorage.setItem(customerStorageKey, JSON.stringify({
        tripId: trip.id,
        cancelToken,
        shareToken: result.shareToken,
        shareExpiresAt: result.expiresAt,
        passengerName: form.passengerName.trim(),
        passengerPhone: form.passengerPhone.trim(),
      }));
      setShareToken(result.shareToken);
      setShareExpiresAt(result.expiresAt);
      setShareUrl(url);
      await copyShareUrl(url);
    } catch (cause) {
      setShareError(cause instanceof Error ? cause.message : 'Le lien de suivi n’a pas pu être créé.');
    } finally {
      setShareLoading(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (bookingStep === 'route') {
      advanceToPassenger();
      return;
    }
    if (!position) {
      setLocationState('error');
      setLocationMessage('Activez votre localisation avant de demander une course.');
      return;
    }
    if (!form.destination.trim()) return;
    if (!form.passengerPhone.trim()) {
      setError('Ajoutez votre numéro de téléphone pour que le chauffeur puisse vous joindre.');
      return;
    }
    if (!quote && quoteLoading) {
      setError('Calcul de l’itinéraire en cours…');
      return;
    }
    setSubmitting(true);
    setError('');
    setShareToken(null);
    setShareExpiresAt(null);
    setShareUrl('');
    setShareError('');
    setShareMessage('');
    setTrip(null);
    setTripEnded(null);
    try {
      const result = await api.createTrip({
        ...form,
        pickup: form.pickup.trim(),
        destination: form.destination.trim(),
        passengerName: form.passengerName.trim(),
        passengerPhone: form.passengerPhone.trim(),
        pickupLatitude: position.latitude,
        pickupLongitude: position.longitude,
        quoteToken: quote?.quoteToken,
      });
      window.localStorage.setItem(customerStorageKey, JSON.stringify({
        tripId: result.trip.id,
        cancelToken: result.cancelToken,
        passengerName: form.passengerName.trim(),
        passengerPhone: form.passengerPhone.trim(),
      }));
      setCancelToken(result.cancelToken);
      applyTripResult(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La demande de course n’a pas pu être envoyée.');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelTrip = async () => {
    if (!trip || !cancelToken || cancelling) return;
    if (!window.confirm('Annuler cette demande de course ?')) return;
    setCancelling(true);
    setCancelError('');
    try {
      applyTripResult(await api.cancelTrip(trip.id, cancelToken));
    } catch (cause) {
      setCancelError(cause instanceof Error ? cause.message : 'La demande n’a pas pu être annulée.');
    } finally {
      setCancelling(false);
    }
  };

  const gpsReady = locationState === 'ready' && position !== null;
  const routeComplete = form.pickup.trim().length >= 3 && isDestinationPlaceCommitted(form.destination, selectedPlace);
  const showHero = !formOpen && !trip && !restoringTrip && !restoreError && !tripEnded;
  const passengerDetails = <Card className="border-border bg-card shadow-sm" aria-label="Coordonnées passager">
    <CardHeader className="gap-1 p-4 pb-3">
      <div>
        <CardTitle className="text-sm">Coordonnées passager</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">Le téléphone est nécessaire pour que le chauffeur puisse vous joindre.</p>
      </div>
      <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-primary">Requis</span>
    </CardHeader>
    <CardContent className="grid gap-3 border-t border-border p-4 pt-3 sm:grid-cols-2">
      <div className="grid gap-1.5">
        <Label htmlFor="transport-phone" className="text-xs text-muted-foreground">Téléphone</Label>
        <Input id="transport-phone" data-testid="input-passenger-phone" aria-required="true" required={bookingStep === 'passenger'} type="tel" value={form.passengerPhone} onChange={event => setForm(current => ({ ...current, passengerPhone: event.target.value }))} placeholder="+221 77 000 00 00" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="transport-name" className="text-xs text-muted-foreground">Prénom</Label>
        <Input id="transport-name" data-testid="input-passenger-name" value={form.passengerName === 'Client Taxi' ? '' : form.passengerName} onChange={event => setForm(current => ({ ...current, passengerName: event.target.value || 'Client Taxi' }))} placeholder="Ex. Awa" />
      </div>
    </CardContent>
  </Card>;
  const advanceToPassenger = () => {
    const pickupInput = document.getElementById('transport-pickup') as HTMLInputElement | null;
    const destinationInput = document.getElementById('transport-destination') as HTMLInputElement | null;
    if (!pickupInput || !destinationInput) return;
    if (!pickupInput.reportValidity() || !destinationInput.reportValidity()) return;
    if (!routeComplete) {
      setError('Choisissez une destination dans les résultats avant de continuer.');
      destinationInput.focus();
      return;
    }
    setError('');
    setBookingStep('passenger');
    window.requestAnimationFrame(() => document.getElementById('transport-phone')?.focus());
  };
  const estimateCard = <Card className="h-fit border-border bg-card" aria-label="Estimation du trajet">
    <CardHeader className="border-b border-border p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="text-sm">Estimation</CardTitle>
          <p className="mt-1 truncate text-xs text-muted-foreground">{form.pickup || 'Point GPS'} → {form.destination || 'destination'}</p>
        </div>
        {quoteLoading ? <RefreshCw size={18} className="shrink-0 animate-spin text-muted-foreground" /> : <p className="shrink-0 text-xl font-bold">{quote ? money(quote.fare, store.currency) : '—'}</p>}
      </div>
    </CardHeader>
    <CardContent className="space-y-2 p-3 sm:p-4">
      {quoteError && !quoteLoading && <Card role="alert" className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-3 text-sm text-destructive">{quoteError}</CardContent>
      </Card>}
      {quote && <>
        <div className="flex gap-4 border-b border-border pb-2 text-xs font-medium text-muted-foreground">
          <span><Clock3 size={14} className="mr-1 inline" />{quote.durationMinutes} min</span>
          <span><CarFront size={14} className="mr-1 inline" />{quote.distanceKm.toFixed(1)} km</span>
        </div>
        <Collapsible open={routeMapOpen} onOpenChange={setRouteMapOpen}>
          <CollapsibleTrigger asChild>
            <TransportButton type="button" variant="ghost" size="sm" className="w-full justify-between px-1">
              {routeMapOpen ? 'Masquer la carte' : 'Afficher la carte du trajet'}
              <ChevronDown size={16} className={`transition-transform ${routeMapOpen ? 'rotate-180' : ''}`} />
            </TransportButton>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <TaxiRouteMap
              clientStop={position ? { latitude: position.latitude, longitude: position.longitude } : null}
              destination={{ latitude: quote.destinationLatitude, longitude: quote.destinationLongitude }}
              routeGeometry={quote.geometry}
              className="h-40 sm:h-56"
            />
          </CollapsibleContent>
        </Collapsible>
      </>}
    </CardContent>
  </Card>;

  if (shareLocation) {
    return <SharedTransportTrackingPage
      api={api}
      shareLocation={shareLocation}
      store={store}
      colors={transportColors}
      onBack={onBack}
    />;
  }

   return <section
      className="transport-public-shell mx-auto w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-sm sm:max-w-6xl"
    style={{
      ...transportDesignVariables(theme),
       fontFamily: transportDesignTokens.fontFamily.sans.join(', '),
      '--transport-primary': theme.primary,
      '--transport-accent': theme.accent,
      '--transport-primary-foreground': theme.primaryForeground,
      '--transport-accent-foreground': theme.accentForeground,
    } as React.CSSProperties}
     >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6">
       <TransportButton data-testid="button-back-to-shop" type="button" variant="ghost" size="sm" onClick={onBack}>
         <ArrowLeft size={16} /> MAXIMUS Transport
      </TransportButton>
      <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground"><span className="h-2 w-2 rounded-full bg-[var(--transport-accent)]" /> Dakar · Mobilité locale</span>
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${locationState === 'ready' ? 'text-primary' : locationState === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}
          aria-live="polite"
          title={locationState === 'ready' && position ? `GPS actif · précision ${Math.round(position.accuracy)} mètres` : undefined}
        >
          <MapPin size={13} />
          {locationState === 'ready' && position ? `GPS actif · ${Math.round(position.accuracy)} m` : locationState === 'locating' ? 'GPS en recherche' : locationState === 'error' ? 'GPS indisponible' : 'GPS inactif'}
        </span>
      </div>
    </header>
       {showHero && <div className="relative overflow-hidden border-b border-border bg-accent">
        <div className="relative aspect-[16/7] w-full sm:aspect-[16/5]">
        <img src={heroImageUrls[heroImageIndex] ?? '/taxi-transport-hero.jpg'} alt="Taxi Urbain à Dakar" className="h-full w-full object-cover" />
         <div className="absolute inset-0 bg-gradient-to-r from-sidebar/90 via-sidebar/45 to-transparent" />
         <div className="absolute inset-x-4 bottom-4 max-w-xl text-sidebar-foreground sm:inset-x-8 sm:bottom-6">
           <p className="text-xs font-bold uppercase tracking-wider text-sidebar-foreground/75">MAXIMUS Transport · Dakar</p>
           <p className="mt-1 text-2xl font-bold tracking-tight sm:text-4xl">Votre trajet, simplement.</p>
           <p className="mt-1 max-w-md text-sm text-sidebar-foreground/80 sm:text-base">Un départ précis, une destination claire, un taxi qui vient à vous.</p>
         </div>
        {heroImageUrls.length > 1 && <>
            <TransportButton data-testid="button-hero-previous" type="button" variant="secondary" size="icon" aria-label="Photo précédente" onClick={() => setHeroImageIndex(current => (current - 1 + heroImageUrls.length) % heroImageUrls.length)} className="absolute left-3 top-1/2 -translate-y-1/2"><ArrowLeft size={16} /></TransportButton>
            <TransportButton data-testid="button-hero-next" type="button" variant="secondary" size="icon" aria-label="Photo suivante" onClick={() => setHeroImageIndex(current => (current + 1) % heroImageUrls.length)} className="absolute right-3 top-1/2 -translate-y-1/2"><ArrowRight size={16} /></TransportButton>
          <div className="absolute bottom-3 right-4 flex items-center gap-1.5 sm:bottom-5 sm:right-6">
              {heroImageUrls.map((image, index) => <TransportButton data-testid={`button-hero-indicator-${index}`} variant="ghost" size="icon" type="button" key={`${image}-${index}`} aria-label={`Afficher la photo ${index + 1}`} onClick={() => setHeroImageIndex(index)} className="h-9 w-9 p-0"><span className={`h-1.5 rounded-full bg-sidebar-foreground transition-all ${index === heroImageIndex ? 'w-5' : 'w-1.5 opacity-55'}`} /></TransportButton>)}
          </div>
        </>}
      </div>
     </div>}
        <div className={`px-4 pt-4 sm:px-8 sm:pt-6 ${formOpen && gpsReady ? 'pb-24 sm:pb-28' : 'pb-5 sm:pb-6'}`}>
          {!showHero && <div className="flex items-start justify-between gap-4">
           <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">{trip ? 'Course à la demande' : 'Dakar · Taxi urbain'}</p>
              <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-3xl">{trip ? 'Votre course' : tripEnded ? 'Nouvelle course' : restoringTrip ? 'Restauration de votre course' : restoreError ? 'Reprendre votre course' : 'Réserver un taxi'}</h1>
               <p className="mt-1 max-w-xl text-sm leading-5 text-muted-foreground">{trip ? 'Suivez votre prise en charge et gardez votre code à portée de main.' : formOpen ? bookingStep === 'route' ? 'Indiquez votre repère de départ et votre destination.' : 'Ajoutez le numéro qui permettra au chauffeur de vous joindre.' : ''}</p>
           </div>
            <div className="hidden shrink-0 items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground sm:flex">
              <MapPin size={15} className="text-primary" />
              <span>Dakar</span>
            </div>
         </div>}

        {tripEnded && <Card className={`mt-5 ${tripEnded.status === 'COMPLETED' ? 'border-primary/30 bg-primary/5' : 'border-destructive/30 bg-destructive/5'}`}>
          <CardContent className="p-4">
            <p className={`text-xs font-bold uppercase tracking-wider ${tripEnded.status === 'COMPLETED' ? 'text-primary' : 'text-destructive'}`}>{tripEnded.status === 'COMPLETED' ? 'Course terminée' : 'Course annulée'}</p>
            <p className="mt-1 text-sm font-medium">{tripEnded.status === 'COMPLETED' ? 'Le parcours est fini. Vous pouvez demander une nouvelle course.' : 'Cette demande n’est plus active. Vous pouvez recommencer.'}</p>
          </CardContent>
        </Card>}

        {restoringTrip && <Card className="mt-5 border-primary/30 bg-primary/5" aria-live="polite">
          <CardContent className="flex items-center gap-3 p-4 text-sm font-medium">
            <RefreshCw size={17} className="animate-spin text-primary" />
            <span>Restauration de votre demande de course en cours…</span>
          </CardContent>
        </Card>}

        {restoreError && !trip && !restoringTrip && <Card className="mt-5 border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-destructive">{restoreError}</p>
            <TransportButton type="button" variant="outline" onClick={() => window.location.reload()} className="mt-3">
              Réessayer <RefreshCw />
            </TransportButton>
          </CardContent>
        </Card>}

         {!trip && !restoringTrip && !restoreError && !formOpen && <Card className="transport-entry-card mt-4 border-border bg-card">
           <CardContent className="grid gap-3 p-3 sm:gap-5 sm:p-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(15rem,.85fr)] lg:items-center">
             <PublicTransportLocationPreview
               position={position}
               locationState={locationState}
               locationMessage={locationMessage}
               onLocate={locate}
             />
             <div>
                <p className="text-sm font-semibold sm:text-base">Un taxi fiable pour vos trajets quotidiens.</p>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground sm:mt-2 sm:text-sm sm:leading-6">Votre GPS situe le départ ; ajoutez un repère visible pour faciliter la rencontre avec le chauffeur.</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground sm:mt-4 sm:text-xs">
                  <span className="flex items-center gap-1.5"><MapPin size={13} className="text-primary" /> GPS précis</span>
                  <span className="flex items-center gap-1.5"><Clock3 size={13} className="text-primary" /> Devis avant départ</span>
               </div>
               <TransportButton
                 data-testid="button-start-taxi-order"
                 type="button"
                  onClick={() => { setBookingStep('route'); setError(''); setFormOpen(true); }}
                 disabled={!gpsReady}
                  className="mt-3 w-full sm:mt-5"
                  size="default"
               >
                 {!gpsReady ? <MapPin /> : <CarFront />}
                 {locationState === 'locating' ? 'Localisation en cours…' : gpsReady ? 'Commander un taxi' : 'Autorisez le GPS pour continuer'}
                 <ArrowRight />
               </TransportButton>
             </div>
          </CardContent>
        </Card>}

        {formOpen && !gpsReady && !trip && !restoringTrip && !restoreError && <Card className="mt-5 border-primary/30 bg-primary/5" aria-live="polite">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <MapPin size={18} />
              </div>
              <div>
                <p className="text-base font-semibold">Activez votre GPS pour commander</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{locationState === 'locating' ? 'Recherche de votre position en cours…' : locationMessage || 'Votre position actuelle est obligatoire pour trouver le chauffeur le plus proche.'}</p>
              </div>
            </div>
            <TransportButton type="button" onClick={locate} disabled={locationState === 'locating'} className="mt-5 w-full" size="lg">
              {locationState === 'locating' ? <RefreshCw className="animate-spin" /> : <MapPin />}
              {locationState === 'locating' ? 'Localisation en cours…' : 'Activer mon GPS'}
              <ArrowRight />
            </TransportButton>
          </CardContent>
        </Card>}

        {formOpen && gpsReady && !trip && !restoringTrip && !restoreError && <form id="transport-booking-form" onSubmit={submit} className="mt-3">
          <Tabs value={bookingStep} onValueChange={value => setBookingStep(value as 'route' | 'passenger')} className="w-full">
            <TabsList aria-label="Étapes de réservation" className="grid h-auto w-full grid-cols-2">
              <TabsTrigger value="route" className="gap-2 py-2.5 text-xs">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px]">{routeComplete && bookingStep === 'passenger' ? <Check size={12} /> : '1'}</span>
                Trajet
              </TabsTrigger>
              <TabsTrigger value="passenger" disabled={!routeComplete} className="gap-2 py-2.5 text-xs">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px]">2</span>
                Contact
              </TabsTrigger>
            </TabsList>

            <TabsContent value="route" className="mt-3">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(16rem,.9fr)]">
                <Card className="border-border bg-card" aria-label="Détails du trajet">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border p-3 sm:p-4">
                    <CardTitle className="text-sm">Votre trajet</CardTitle>
                    <span className="shrink-0 text-xs font-semibold text-primary">GPS · {Math.round(position.accuracy)} m</span>
                  </CardHeader>
                  <CardContent className="space-y-3 p-3 sm:space-y-4 sm:p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground"><MapPin size={15} /></div>
                      <Label htmlFor="transport-pickup" className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Repère de prise en charge</span>
                        <Input
                          id="transport-pickup"
                          data-testid="input-transport-pickup"
                          required
                          minLength={3}
                          maxLength={180}
                          value={form.pickup}
                          onChange={event => { setError(''); setForm(current => ({ ...current, pickup: event.target.value })); }}
                          className="mt-1"
                          placeholder="Ex. entrée principale, station-service…"
                        />
                        <span className="mt-1 block text-xs font-normal text-muted-foreground">Le GPS donne le point exact ; ce repère aide le chauffeur à vous trouver.</span>
                      </Label>
                    </div>
                    <div className="ml-4 h-3 border-l border-dashed border-border" />
                    <div className="relative">
                      <Label htmlFor="transport-destination" className="flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"><MapPin size={15} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destination</span>
                          <Input
                            id="transport-destination"
                            required
                            value={form.destination}
                            onChange={event => { setError(''); setSelectedPlace(null); setForm(current => ({ ...current, destination: event.target.value })); }}
                            className="mt-1"
                            placeholder="Quartier, lieu ou adresse"
                            autoComplete="off"
                          />
                        </span>
                      </Label>
                      {!isDestinationPlaceCommitted(form.destination, selectedPlace) && (placesLoading || destinationPlaces.length > 0) && <Card className="absolute left-11 right-0 top-[4.5rem] z-10 overflow-hidden border-border bg-popover shadow-lg" role="listbox">
                        {placesLoading && <p className="px-3 py-3 text-sm text-muted-foreground">Recherche des lieux à Dakar…</p>}
                        {!placesLoading && destinationPlaces.map(place => <TransportButton
                          key={`${place.latitude}-${place.longitude}-${place.label}`}
                          type="button"
                          variant="ghost"
                          size="sm"
                          role="option"
                          aria-selected={false}
                          onClick={() => { setError(''); setSelectedPlace(place); setForm(current => ({ ...current, destination: place.label })); setDestinationPlaces([]); setPlacesLoading(false); }}
                          className="h-auto w-full justify-start whitespace-normal rounded-none px-3 py-2 text-left"
                        >
                          <span className="grid gap-0.5 text-left">
                            <span className="text-sm font-semibold">{place.label.split(',')[0]}</span>
                            <span className="text-xs text-muted-foreground">{place.label}</span>
                          </span>
                        </TransportButton>)}
                      </Card>}
                    </div>
                  </CardContent>
                </Card>
                {estimateCard}
              </div>
            </TabsContent>

            <TabsContent value="passenger" className="mt-3">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,.85fr)]">
                {passengerDetails}
                <Card className="h-fit border-border bg-card" aria-label="Récapitulatif du trajet">
                  <CardHeader className="border-b border-border p-3 sm:p-4">
                    <CardTitle className="text-sm">Récapitulatif</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 p-3 sm:p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Départ</p>
                    <p className="text-sm font-medium">{form.pickup || 'Point GPS'}</p>
                    <p className="pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destination</p>
                    <p className="text-sm font-medium">{form.destination}</p>
                    <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
                      <span className="text-xs text-muted-foreground">{quote ? `${quote.durationMinutes} min · ${quote.distanceKm.toFixed(1)} km` : 'Tarif indicatif'}</span>
                      <span className="shrink-0 text-sm font-bold">{quote ? money(quote.fare, store.currency) : quoteLoading ? 'Calcul…' : 'À confirmer'}</span>
                    </div>
                    <TransportButton type="button" variant="link" onClick={() => setBookingStep('route')} className="h-auto px-0 text-xs">
                      Modifier le trajet
                    </TransportButton>
                  </CardContent>
                </Card>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">Vos coordonnées sont partagées uniquement avec le chauffeur affecté par {store.name}.</p>
            </TabsContent>
          </Tabs>

          {error && <Card role="alert" className="mt-3 border-destructive/30 bg-destructive/5">
            <CardContent className="p-3 text-sm text-destructive">{error}</CardContent>
          </Card>}
        </form>}

        {trip && <Card className="mt-5 border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Demande enregistrée</p>
              <CardTitle className="mt-1 text-lg">{trip.status === 'OFFERED' ? 'Chauffeur trouvé' : trip.driverName ? 'Votre chauffeur est en route' : 'Attribution en cours'}</CardTitle>
            </div>
            <Check className="text-primary" size={22} />
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <p className="text-sm leading-6 text-muted-foreground">{tripMessage}</p>
            {trip.pickupCode && !['COMPLETED', 'CANCELLED'].includes(trip.status) && <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">Code de prise en charge</p>
                  <p className="mt-1 text-sm text-muted-foreground">À communiquer au chauffeur lorsqu’il arrive.</p>
                </div>
                <p data-testid="text-pickup-code" className="rounded-md border border-primary/20 bg-card px-4 py-2 font-mono text-2xl font-bold tracking-[0.25em] text-primary">{trip.pickupCode}</p>
              </CardContent>
            </Card>}
            {(trip.status === 'OFFERED' || trip.status === 'ASSIGNED' || trip.status === 'IN_PROGRESS') && <PublicTaxiTracking trip={trip} />}
            {trip.vehicleModel && <div className="flex items-center gap-3 border-t border-border pt-4 text-left">
              <img src={trip.vehicleImageUrl || '/taxi-car.svg'} alt="Véhicule Taxi" className="h-14 w-20 rounded-md object-cover" />
              <div className="text-sm">
                <p className="font-semibold">{trip.vehicleModel}</p>
                <p className="mt-1 text-muted-foreground">{trip.vehicleType || 'Taxi'} · {trip.vehicleRegistration || 'Immatriculation en cours'}</p>
                {trip.driverName && <p className="mt-1">Chauffeur : <span className="font-semibold">{trip.driverName}</span></p>}
              </div>
            </div>}
            {trip.driverPhone && <div className="grid gap-2 sm:grid-cols-2">
              <TransportButton asChild variant="outline" className="w-full">
                <a href={`tel:${trip.driverPhone}`}><Phone /> Appeler</a>
              </TransportButton>
              <TransportButton asChild variant="secondary" className="w-full">
                <a href={`https://wa.me/${whatsappNumber(trip.driverPhone)}`} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a>
              </TransportButton>
            </div>}
            {['REQUESTED', 'OFFERED', 'ASSIGNED', 'IN_PROGRESS'].includes(trip.status) && cancelToken && <Card className="border-border bg-muted/30">
              <Collapsible open={sharePanelOpen} onOpenChange={setSharePanelOpen}>
                <CardContent className="p-3 sm:p-4">
                  <CollapsibleTrigger asChild>
                    <TransportButton type="button" variant="ghost" className="h-auto w-full justify-between px-0 py-1 text-left">
                      <span className="flex min-w-0 items-center gap-2">
                        <Share2 size={17} className="shrink-0 text-primary" />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">Partager le suivi</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">Créer un lien en lecture seule</span>
                        </span>
                      </span>
                      <ChevronDown size={16} className={`shrink-0 transition-transform ${sharePanelOpen ? 'rotate-180' : ''}`} />
                    </TransportButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-3">
                    <p className="text-xs leading-5 text-muted-foreground">Le lien affiche le statut, les points de départ et d’arrivée et la position du taxi, sans nom, téléphone, code de prise en charge ni possibilité d’annuler.</p>
                    <TransportButton type="button" variant="outline" onClick={() => void createOrCopyShareLink()} disabled={shareLoading} className="w-full">
                      {shareLoading ? <RefreshCw className="animate-spin" /> : shareUrl ? <Copy /> : <Share2 />}
                      {shareLoading ? 'Préparation du lien…' : shareUrl && shareExpiresAt && Date.parse(shareExpiresAt) > Date.now() ? 'Copier le lien de suivi' : 'Créer un lien de suivi'}
                    </TransportButton>
                    {shareUrl && <div className="grid gap-1.5">
                      <Label htmlFor="transport-share-url" className="text-xs text-muted-foreground">Lien à partager</Label>
                      <Input id="transport-share-url" data-testid="input-transport-share-url" readOnly value={shareUrl} onFocus={event => event.currentTarget.select()} />
                      {shareExpiresAt && <p className="text-xs text-muted-foreground">Valide jusqu’au {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(shareExpiresAt))}.</p>}
                    </div>}
                    {shareMessage && <p role="status" className="text-xs text-primary">{shareMessage}</p>}
                    {shareError && <p role="alert" className="text-xs text-destructive">{shareError}</p>}
                  </CollapsibleContent>
                </CardContent>
              </Collapsible>
            </Card>}
            {cancelError && <Card role="alert" className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-3 text-sm text-destructive">{cancelError}</CardContent>
            </Card>}
            {['REQUESTED', 'OFFERED', 'ASSIGNED'].includes(trip.status) && cancelToken && <TransportButton type="button" variant="destructive" onClick={() => void cancelTrip()} disabled={cancelling} className="w-full">
              {cancelling && <RefreshCw className="animate-spin" />}
              {cancelling ? 'Annulation…' : 'Annuler la demande'}
            </TransportButton>}
            <TransportButton
              type="button"
              variant="ghost"
              onClick={() => {
                window.localStorage.removeItem(customerStorageKey);
                setCancelToken(null);
                setShareToken(null);
                setShareExpiresAt(null);
                setShareUrl('');
                setTrip(null);
                setBookingStep('route');
                setFormOpen(true);
              }}
              className="w-full text-primary"
            >
              Demander une autre course
            </TransportButton>
          </CardContent>
        </Card>}

        {(phone || whatsappHref) && <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <span className="mr-auto">Besoin d’aide avec {store.name} ?</span>
          {phone && <TransportButton asChild variant="outline">
            <a href={`tel:${phone}`}><Phone /> Appeler</a>
          </TransportButton>}
          {whatsappHref && <TransportButton asChild variant="secondary">
            <a href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a>
          </TransportButton>}
        </div>}
      </div>
      {formOpen && gpsReady && !trip && !restoringTrip && !restoreError && <div className="sticky bottom-0 z-20 border-t border-border bg-background/95 px-4 py-2.5 backdrop-blur-sm sm:px-8 sm:py-3">
        {bookingStep === 'route' ? <TransportButton type="button" onClick={advanceToPassenger} disabled={!routeComplete || locationState !== 'ready'} className="w-full" size="lg">
          <MapPin />
          Continuer
          <ArrowRight />
        </TransportButton> : <TransportButton form="transport-booking-form" type="submit" disabled={submitting || locationState !== 'ready'} className="w-full" size="lg">
          {submitting ? <RefreshCw className="animate-spin" /> : <CarFront />}
          {submitting ? 'Recherche du chauffeur…' : 'Commander un taxi'}
          <ArrowRight />
        </TransportButton>}
      </div>}
  </section>;
}

function SharedTransportTrackingPage({
  api,
  shareLocation,
  store,
  colors,
  onBack,
}: {
  api: ReturnType<typeof createPublicTransportApi>;
  shareLocation: { tripId: string; shareToken: string };
  store: PublicShopBootstrap['store'];
  colors: { primaryColor?: string; accentColor?: string } | null;
  onBack: () => void;
}) {
  const theme = publicTransportTheme(colors);
  const [trip, setTrip] = useState<PublicTransportShareTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadSharedTrip = useCallback(
    () => api.getSharedTrip(shareLocation.tripId, shareLocation.shareToken),
    [api, shareLocation.shareToken, shareLocation.tripId],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    void loadSharedTrip()
      .then(result => {
        if (!active) return;
        setTrip(result.trip);
        setMessage(result.message);
        setError('');
      })
      .catch(cause => {
        if (!active) return;
        setError(cause instanceof ApiRequestError && cause.status === 404
          ? 'Ce lien de suivi est invalide ou a expiré.'
          : cause instanceof Error ? cause.message : 'Le suivi est momentanément indisponible.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [loadSharedTrip]);

  const refreshSharedTrip = useCallback(async () => {
    try {
      const result = await loadSharedTrip();
      setTrip(result.trip);
      setMessage(result.message);
      setError('');
    } catch (cause) {
      setError(cause instanceof ApiRequestError && cause.status === 404
        ? 'Ce lien de suivi est invalide ou a expiré.'
        : cause instanceof Error ? cause.message : 'Le suivi est momentanément indisponible.');
    }
  }, [loadSharedTrip]);

  useAutoRefresh(refreshSharedTrip, {
    enabled: Boolean(trip && !['COMPLETED', 'CANCELLED'].includes(trip.status)),
    intervalMs: 5_000,
  });

  const title = trip?.status === 'OFFERED'
    ? 'Chauffeur trouvé'
    : trip?.status === 'ASSIGNED' || trip?.status === 'IN_PROGRESS'
      ? 'Votre chauffeur est en route'
      : trip?.status === 'COMPLETED'
        ? 'Course terminée'
        : trip?.status === 'CANCELLED'
          ? 'Course annulée'
          : 'Attribution en cours';

  return <section
    className="mx-auto w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-sm sm:max-w-5xl"
    style={{
      ...transportDesignVariables(theme),
      fontFamily: transportDesignTokens.fontFamily.sans.join(', '),
      '--transport-primary': theme.primary,
      '--transport-accent': theme.accent,
      '--transport-primary-foreground': theme.primaryForeground,
      '--transport-accent-foreground': theme.accentForeground,
    } as React.CSSProperties}
  >
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6">
      <TransportButton type="button" variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft size={16} /> Retour à la boutique
      </TransportButton>
      <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-[var(--transport-accent)]" /> Suivi partagé
      </span>
    </header>
    <div className="space-y-5 px-4 pb-8 pt-6 sm:px-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Taxi Urbain · Dakar</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {trip && <p className="mt-2 text-sm text-muted-foreground">Course {trip.reference} · {money(trip.fare, store.currency)}</p>}
      </div>

      {loading && !trip && <Card className="border-primary/30 bg-primary/5" aria-live="polite">
        <CardContent className="flex items-center gap-3 p-4 text-sm font-medium">
          <RefreshCw size={17} className="animate-spin text-primary" />
          <span>Chargement du suivi partagé…</span>
        </CardContent>
      </Card>}

      {error && <Card role="alert" className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-destructive">{error}</p>
          {!trip && <TransportButton type="button" variant="outline" onClick={() => {
            setLoading(true);
            void refreshSharedTrip().finally(() => setLoading(false));
          }} className="mt-3">
            Réessayer <RefreshCw />
          </TransportButton>}
        </CardContent>
      </Card>}

      {trip && <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Suivi en lecture seule</p>
            <CardTitle className="mt-1 text-lg">{title}</CardTitle>
          </div>
          <Check className="text-primary" size={22} />
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <p className="text-sm leading-6 text-muted-foreground">{message}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prise en charge</p>
              <p className="mt-1 text-sm font-semibold">{trip.pickup}</p>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destination</p>
              <p className="mt-1 text-sm font-semibold">{trip.destination}</p>
            </div>
          </div>
          {(trip.status === 'OFFERED' || trip.status === 'ASSIGNED' || trip.status === 'IN_PROGRESS') && <PublicTaxiTracking trip={trip} />}
          {trip.vehicleModel && <div className="flex items-center gap-3 border-t border-border pt-4 text-left">
            <img src={trip.vehicleImageUrl || '/taxi-car.svg'} alt="Véhicule Taxi" className="h-14 w-20 rounded-md object-cover" />
            <div className="text-sm">
              <p className="font-semibold">{trip.vehicleModel}</p>
              <p className="mt-1 text-muted-foreground">{trip.vehicleType || 'Taxi'}</p>
            </div>
          </div>}
          <p className="border-t border-border pt-3 text-xs leading-5 text-muted-foreground">Ce lien affiche le statut, les points de départ et d’arrivée et la position du taxi. Il ne révèle ni nom ni téléphone, n’affiche pas le code de prise en charge et ne permet aucune action sur la course.</p>
        </CardContent>
      </Card>}
    </div>
  </section>;
}

function PublicTaxiTracking({ trip }: { trip: PublicTransportTrip | PublicTransportShareTrip }) {
  const pickup = trip.pickupLatitude !== null && trip.pickupLongitude !== null
    ? { latitude: trip.pickupLatitude, longitude: trip.pickupLongitude }
    : null;
  const destination = trip.destinationLatitude !== null && trip.destinationLongitude !== null
    ? { latitude: trip.destinationLatitude, longitude: trip.destinationLongitude }
    : null;
  const driver = trip.driverLatitude !== null && trip.driverLongitude !== null
    ? { latitude: trip.driverLatitude, longitude: trip.driverLongitude }
    : null;

  return <Card className="mt-5 border-border bg-muted/30 text-left">
      <CardHeader className="flex flex-col gap-2 p-4 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-sm">Suivi en direct</CardTitle>
        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
          <span data-testid="status-tracking-live" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            Actualisé toutes les 5 s
          </span>
          <TransportButton data-testid="button-refresh-tracking" type="button" variant="outline" size="sm" onClick={() => window.dispatchEvent(new Event('maximus:refresh'))}>
            <RefreshCw /> Actualiser
          </TransportButton>
        </div>
      </CardHeader>
     <CardContent className="space-y-3 p-4 pt-0">
     <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-md border border-border bg-card px-3 py-2.5"><p className="text-xs font-semibold uppercase text-muted-foreground">Taxi → arrêt client</p><p data-testid="text-pickup-distance" className="mt-1 text-sm font-bold">{trip.pickupRouteDistanceKm !== null && trip.pickupRouteDistanceKm !== undefined ? `${trip.pickupRouteDistanceKm.toFixed(1)} km` : 'Calcul…'}</p></div>
        <div className="rounded-md border border-border bg-card px-3 py-2.5"><p className="text-xs font-semibold uppercase text-muted-foreground">Arrivée estimée</p><p data-testid="text-pickup-eta" className="mt-1 text-sm font-bold">{trip.pickupEtaMinutes !== null && trip.pickupEtaMinutes !== undefined ? `${trip.pickupEtaMinutes} min` : 'GPS en attente'}</p></div>
        <div className="rounded-md border border-border bg-card px-3 py-2.5"><p className="text-xs font-semibold uppercase text-muted-foreground">Votre trajet</p><p className="mt-1 text-sm font-bold">{trip.routeDistanceKm !== null && trip.routeDistanceKm !== undefined ? `${trip.routeDistanceKm.toFixed(1)} km` : '—'}</p></div>
        <div className="rounded-md border border-border bg-card px-3 py-2.5"><p className="text-xs font-semibold uppercase text-muted-foreground">Tarif</p><p data-testid="text-trip-fare" className="mt-1 text-sm font-bold">{trip.routePending ? 'Calcul en cours' : trip.fare > 0 ? `${new Intl.NumberFormat('fr-FR').format(trip.fare)} XOF` : 'À calculer'}</p></div>
     </div>
      <div className="rounded-md border border-border bg-card px-3 py-2.5"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Itinéraire complet</p><p className="mt-1 text-sm font-semibold">Position du taxi <span className="mx-1 text-muted-foreground">→</span> arrêt client <span className="mx-1 text-muted-foreground">→</span> destination</p><p className="mt-1 text-xs text-muted-foreground">Le point rouge identifie l’endroit où le client attend le taxi.</p></div>
      {pickup && <TaxiRouteMap clientStop={pickup} destination={destination} driver={driver} routeGeometry={trip.routeGeometry} pickupRouteGeometry={trip.pickupRouteGeometry} className="h-52 sm:h-80" />}
      {!trip.pickupRouteDistanceKm && <p className="px-1 text-xs text-muted-foreground">La distance et le temps d’arrivée seront recalculés dès que la position GPS du chauffeur est reçue.</p>}
   </CardContent></Card>;
}

function ShopHomePage({
  products,
  rentals,
  locationEnabled,
  store,
  onProduct,
  onAdd,
  onLocation,
  onShop,
}: {
  products: PublicProduct[];
  rentals: PublicRental[];
  locationEnabled: boolean;
  store: PublicShopBootstrap['store'];
  onProduct: (product: PublicProduct) => void;
  onAdd: (product: PublicProduct) => void;
  onLocation: () => void;
  onShop: () => void;
}) {
  const heroImages = store.heroImages.length > 0 ? store.heroImages : ['/family-lunch-hero.jpg'];
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    setHeroIndex(0);
  }, [store.slug, store.heroImages]);

  useEffect(() => {
    if (heroImages.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setHeroIndex(current => (current + 1) % heroImages.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [heroImages.length]);

  return <section className="space-y-10">
    <div className="relative min-h-[300px] overflow-hidden rounded-3xl p-6 text-white shadow-xl sm:min-h-[340px] sm:p-9">
       <div
         className="absolute inset-0 flex transition-transform duration-1000 ease-in-out motion-reduce:transition-none"
         style={{ transform: `translateX(-${heroIndex * 100}%)` }}
         role="region"
         aria-roledescription="carrousel"
         aria-label="Images de présentation de la boutique"
       >
         {heroImages.map((image, index) => (
           <div key={image} className="relative min-w-full shrink-0">
             <img src={image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-[68%_center] sm:object-[58%_center] lg:object-center" />
             <span className="sr-only">Bannière {index + 1}</span>
           </div>
         ))}
       </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(11,27,43,.58)_0%,rgba(11,27,43,.24)_38%,rgba(11,27,43,.04)_70%,transparent_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[#d69e2e]/12" />
      <div className="relative max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-white/70">Bienvenue chez {store.name}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-.05em] sm:text-4xl">Découvrez nos offres</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">{store.description || 'Retrouvez les produits et services publiés par votre boutique.'}</p>
        <button type="button" onClick={onShop} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold" style={{ color: store.accentColor }}>
          Voir la boutique <ArrowRight size={16} />
        </button>
      </div>
    </div>
    <div className="flex flex-col gap-10">
      <DiscoveryRail title="Tous les produits" items={products} type="product" store={store} onProduct={onProduct} onAdd={onAdd} />
      {locationEnabled && <DiscoveryRail title="Locations disponibles" items={rentals} type="rental" store={store} onLocation={onLocation} />}
    </div>
  </section>;
}

function CatalogPage({
  products,
  visibleProducts,
  categories,
  searchQuery,
  categoryFilter,
  setSearchQuery,
  setCategoryFilter,
  store,
  onProduct,
  onAdd,
}: {
  products: PublicProduct[];
  visibleProducts: PublicProduct[];
  categories: string[];
  searchQuery: string;
  categoryFilter: string;
  setSearchQuery: (value: string) => void;
  setCategoryFilter: (value: string) => void;
  store: PublicShopBootstrap['store'];
  onProduct: (product: PublicProduct) => void;
  onAdd: (product: PublicProduct) => void;
}) {
  return <section>
    <div className="mb-8">
      <p className="text-xs font-bold uppercase tracking-[.16em]" style={{ color: 'var(--shop-primary)' }}>Catalogue</p>
      <h1 className="mt-2 text-3xl font-bold tracking-[-.04em]">La boutique</h1>
      <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Parcourez toutes les offres disponibles.</p>
    </div>
    <div id="shop-catalog-search" className="mb-4 scroll-mt-20">
      <label className="relative block"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={17} /><input aria-label="Rechercher un produit" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Rechercher un produit" className="w-full rounded-2xl border border-black/5 bg-white py-3.5 pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-[var(--shop-primary)] focus:ring-4 focus:ring-[var(--shop-primary)]/10" /></label>
    </div>
    {categories.length > 0 && <nav aria-label="Catégories de produits" className="-mx-1 mb-8 flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-2">
      <button type="button" aria-pressed={categoryFilter === 'ALL'} onClick={() => setCategoryFilter('ALL')} style={categoryFilter === 'ALL' ? { backgroundColor: 'var(--shop-primary)', color: 'var(--shop-primary-foreground)' } : undefined} className={`shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--shop-primary)]/40 ${categoryFilter === 'ALL' ? 'border-transparent shadow-sm' : 'border-black/10 bg-white hover:border-[var(--shop-primary)]/40 hover:bg-[var(--shop-primary)]/5'}`}>Toutes</button>
      {categories.map(category => {
        const active = categoryFilter === category;
        return <button key={category} type="button" aria-pressed={active} onClick={() => setCategoryFilter(category)} style={active ? { backgroundColor: 'var(--shop-primary)', color: 'var(--shop-primary-foreground)' } : undefined} className={`shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--shop-primary)]/40 ${active ? 'border-transparent shadow-sm' : 'border-black/10 bg-white hover:border-[var(--shop-primary)]/40 hover:bg-[var(--shop-primary)]/5'}`}>{category}</button>;
      })}
    </nav>}
    {products.length === 0
      ? <div className="rounded-2xl border border-dashed bg-white p-12 text-center text-sm">Aucun produit disponible dans la boutique pour le moment.</div>
      : visibleProducts.length === 0
        ? <div className="rounded-2xl border border-dashed bg-white p-12 text-center text-sm">Aucun produit ne correspond à votre recherche.</div>
        : <CatalogSections products={visibleProducts} rentals={[]} categories={categories} store={store} onProduct={onProduct} onAdd={onAdd} />}
  </section>;
}

function DiscoveryRail({
  title,
  items,
  type,
  store,
  onProduct,
  onAdd,
  onLocation,
}: {
  title: string;
  items: Array<PublicProduct | PublicRental>;
  type: 'product' | 'rental';
  store: PublicShopBootstrap['store'];
  onProduct?: (product: PublicProduct) => void;
  onAdd?: (product: PublicProduct) => void;
  onLocation?: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3 px-1">
        <h2 className="text-xl font-bold tracking-[-.02em] sm:text-2xl">{title}</h2>
        {type === 'rental' && onLocation && (
          <button type="button" onClick={onLocation} className="flex items-center gap-1 text-sm font-semibold transition hover:opacity-80" style={{ color: 'var(--shop-primary)' }}>
            Voir tout <ArrowRight size={14} />
          </button>
        )}
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory overflow-x-auto px-4 pb-6 pt-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-4">
          {items.map(item => (
            <div key={'slug' in item ? item.slug : item.id} className="w-[180px] shrink-0 snap-start sm:w-[240px]">
              {type === 'product' ? (
                (() => {
                  if (!('slug' in item)) return null;
                  return (
                <PublicOfferCard
                  imageUrl={item.imageUrl}
                  icon={Package}
                  badge={`Produit · ${item.category}`}
                  name={item.name}
                  price={money(item.price, store.currency)}
                  priceValue={item.price}
                  compareAtPrice={item.compareAtPrice}
                  availability={item.stock > 0 ? `${item.stock} en stock` : 'Indisponible'}
                  store={store}
                  onOpen={onProduct ? () => onProduct(item) : undefined}
                  onAdd={onAdd ? () => onAdd(item) : undefined}
                />
                  );
                })()
              ) : (
                (() => {
                  if ('slug' in item) return null;
                  return (
                <PublicOfferCard
                  imageUrl={item.imageUrl}
                  icon={Home}
                  badge={`Location · ${item.category}`}
                  name={item.name}
                  price={money(item.price, store.currency)}
                  priceValue={item.price}
                  priceSuffix={`/ ${item.billingUnit === 'MOIS' ? 'mois' : item.billingUnit === 'SEMAINE' ? 'semaine' : 'jour'}`}
                  availability={item.isAvailable ? `${item.availability} en stock` : 'Indisponible'}
                  store={store}
                  onOpen={onLocation}
                />
                  );
                })()
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PublicOfferCard({
  imageUrl,
  icon: Icon,
  badge,
  name,
  price,
  priceValue,
  compareAtPrice,
  priceSuffix,
  availability,
  store,
  onOpen,
  onAdd,
}: {
  imageUrl: string;
  icon: typeof Package;
  badge: string;
  name: string;
  price: string;
  priceValue: number;
  compareAtPrice?: number | null;
  priceSuffix?: string;
  availability?: string;
  store: PublicShopBootstrap['store'];
  onOpen?: () => void;
  onAdd?: () => void;
}) {
  const isAvailable = availability !== 'Indisponible';
  const discount = compareAtPrice && compareAtPrice > priceValue ? Math.round((1 - priceValue / compareAtPrice) * 100) : null;
  return <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-black/5 bg-white shadow-[0_3px_12px_rgba(15,23,42,.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(15,23,42,.1)]">
     <button type="button" onClick={onOpen} disabled={!onOpen} className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-[hsl(var(--muted)/.35)] p-1.5 disabled:cursor-default sm:aspect-square sm:p-2">
        {imageUrl ? <img src={imageUrl} alt={name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" /> : <Icon size={28} className="text-[hsl(var(--muted-foreground))]" />}
       {discount !== null && <span className="absolute left-1.5 top-1.5 rounded-md bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold text-white sm:left-2 sm:top-2 sm:text-[10px]">-{discount}%</span>}
       {availability && <span className={`absolute bottom-1.5 left-1.5 max-w-[calc(100%-.75rem)] truncate rounded-md px-1.5 py-0.5 text-[9px] font-bold sm:bottom-2 sm:left-2 ${isAvailable ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-800'}`}>{availability}</span>}
    </button>
      <div className="flex flex-1 flex-col border-t border-black/5 bg-white p-2.5 sm:p-3">
       <p className="truncate text-[8px] font-bold uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">{badge.split(' · ')[1] || badge}</p>
       {onOpen ? <button type="button" onClick={onOpen} className="mt-1 line-clamp-2 min-h-8 w-full break-words text-left text-xs font-semibold leading-4 text-[hsl(var(--foreground))] sm:text-sm">{name}</button> : <h3 className="mt-1 line-clamp-2 min-h-8 break-words text-xs font-semibold leading-4 text-[hsl(var(--foreground))] sm:text-sm">{name}</h3>}
       <p className="mt-1.5 text-sm font-bold leading-4 text-[hsl(var(--foreground))] sm:text-base">{price}{priceSuffix && <span className="ml-0.5 text-[9px] font-medium text-[hsl(var(--muted-foreground))]">{priceSuffix}</span>}</p>
       {compareAtPrice && compareAtPrice > priceValue && <div className="mt-1 flex items-center gap-1.5"><span className="truncate text-[10px] text-[hsl(var(--muted-foreground))] line-through">{money(compareAtPrice, store.currency)}</span><span className="rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-bold text-emerald-700">-{discount}%</span></div>}
         {onAdd && <div className="mt-auto flex items-center gap-1.5 pt-2.5">
           {isAvailable && <button type="button" onClick={onAdd} className="flex-1 rounded-lg px-2 py-2 text-[10px] font-bold text-white shadow-sm transition hover:brightness-95 sm:text-xs" style={{ backgroundColor: 'var(--shop-accent)' }}><ShoppingBag size={12} className="mr-1 inline-block" />Ajouter</button>}
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
}: {
  products: PublicProduct[];
  rentals: PublicRental[];
  categories: string[];
  store: PublicShopBootstrap['store'];
  onProduct: (product: PublicProduct) => void;
  onAdd: (product: PublicProduct) => void;
}) {
  return <div className="space-y-8">
    {categories.map(category => {
      const categoryProducts = products.filter(product => product.category === category);
      const categoryRentals = rentals.filter(rental => rental.category === category);
      if (categoryProducts.length === 0 && categoryRentals.length === 0) return null;
       return <section key={category}>
         <div className="mb-3 flex items-end justify-between gap-3 border-b border-black/5 pb-2"><div><p className="text-[9px] font-bold uppercase tracking-[.15em]" style={{ color: 'var(--shop-primary)' }}>Catégorie</p><h2 className="mt-1 text-lg font-bold tracking-[-.02em] sm:text-xl">{category}</h2></div><span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">{categoryProducts.length + categoryRentals.length} offre{categoryProducts.length + categoryRentals.length > 1 ? 's' : ''}</span></div>
           <div className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
               {categoryProducts.map(product => <PublicOfferCard key={`product-${product.slug}`} imageUrl={product.imageUrl} icon={Package} badge={`Produit · ${product.category}`} name={product.name} price={money(product.price, store.currency)} priceValue={product.price} compareAtPrice={product.compareAtPrice} availability={product.stock > 0 ? `${product.stock} en stock` : 'Indisponible'} store={store} onOpen={() => onProduct(product)} onAdd={() => onAdd(product)} />)}
           {categoryRentals.map(rental => <PublicOfferCard key={`rental-${rental.name}`} imageUrl={rental.imageUrl} icon={Home} badge={`Location · ${rental.category}`} name={rental.name} price={money(rental.price, store.currency)} priceValue={rental.price} priceSuffix={`/ ${rental.billingUnit === 'MOIS' ? 'mois' : rental.billingUnit === 'SEMAINE' ? 'semaine' : 'jour'}`} availability={rental.isAvailable ? `${rental.availability} en stock` : 'Indisponible'} store={store} />)}
        </div>
      </section>;
    })}
  </div>;
}

function DeliveryPage({ store, zones, customer, requests, form, setForm, submitted, onSubmit, submitting, onNavigate }: { store: PublicShopBootstrap['store']; zones: PublicShopBootstrap['deliveryZones']; customer: EcommerceCustomer | null; requests: EcommerceDeliveryRequest[]; form: { requesterName: string; requesterEmail: string; requesterPhone: string; address: string; deliveryZoneId: string; serviceType: EcommerceDeliveryServiceType; desiredDate: string; note: string }; setForm: (form: { requesterName: string; requesterEmail: string; requesterPhone: string; address: string; deliveryZoneId: string; serviceType: EcommerceDeliveryServiceType; desiredDate: string; note: string }) => void; submitted: EcommerceDeliveryRequest | null; onSubmit: () => void; submitting: boolean; onNavigate: (path: string) => void }) {
  const steps = [
    { icon: ShoppingBag, title: 'Choisissez vos articles', text: 'Ajoutez vos produits au panier et indiquez votre adresse.' },
    { icon: Truck, title: 'Nous préparons votre colis', text: 'La boutique confirme la commande et organise l’acheminement.' },
    { icon: Check, title: 'Suivez la livraison', text: 'Retrouvez chaque évolution dans votre espace client.' },
  ];

  return <section className="mx-auto max-w-5xl">
    <div className="mt-6 grid gap-4 md:grid-cols-3">{steps.map(({ icon: Icon, title, text }, index) => <div key={title} className="rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${store.primaryColor}22`, color: store.accentColor }}><Icon size={20} /></span><span className="mt-5 block text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">0{index + 1}</span><h2 className="mt-2 text-lg font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{text}</p></div>)}</div>
    <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <div className="rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[.16em]" style={{ color: store.primaryColor }}>Demander un service</p>
        <h2 className="mt-2 text-2xl font-bold">Besoin d’une livraison ?</h2>
        <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Décrivez votre besoin, même sans passer une commande dans la boutique.</p>
         {submitted ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><Check className="text-emerald-700" size={22} /><p className="mt-3 font-bold text-emerald-900">Demande enregistrée</p><p className="mt-1 text-sm text-emerald-800">Référence : {submitted.reference}. Notre équipe reviendra vers vous pour confirmer le créneau.</p>{customer && <button type="button" onClick={() => onNavigate('/compte')} className="mt-4 text-sm font-bold text-emerald-900 underline">Voir mon espace client</button>}</div> : <div className="mt-5 grid gap-3 sm:grid-cols-2"><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Nom complet" value={form.requesterName} onChange={event => setForm({ ...form, requesterName: event.target.value })} /><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Email" type="email" value={form.requesterEmail} onChange={event => setForm({ ...form, requesterEmail: event.target.value })} /><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Téléphone" value={form.requesterPhone} onChange={event => setForm({ ...form, requesterPhone: event.target.value })} />{zones.length > 0 && <label className="block text-sm font-semibold">Zone de livraison<select required className="mt-1.5 w-full rounded-xl border bg-[hsl(var(--card))] px-3 py-3 text-sm font-normal" value={form.deliveryZoneId} onChange={event => setForm({ ...form, deliveryZoneId: event.target.value })}><option value="">Choisir une zone</option>{zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}{zone.fee > 0 ? ` · ${money(zone.fee, store.currency)}` : ''}</option>)}</select></label>}<select className="rounded-xl border bg-[hsl(var(--card))] px-3 py-3 text-sm" value={form.serviceType} onChange={event => setForm({ ...form, serviceType: event.target.value as EcommerceDeliveryServiceType })}><option value="STANDARD">Livraison standard</option><option value="URGENT">Livraison urgente</option></select><textarea className="rounded-xl border px-3 py-3 text-sm sm:col-span-2" rows={2} placeholder="Adresse complète de livraison" value={form.address} onChange={event => setForm({ ...form, address: event.target.value })} /><label className="text-sm font-semibold">Date souhaitée<input className="mt-1.5 block w-full rounded-xl border px-3 py-3 text-sm font-normal" type="date" value={form.desiredDate} onChange={event => setForm({ ...form, desiredDate: event.target.value })} /></label><textarea className="rounded-xl border px-3 py-3 text-sm" rows={2} placeholder="Précisions (facultatif)" value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} /><button type="button" onClick={onSubmit} disabled={submitting || !form.requesterName.trim() || !form.requesterEmail.trim() || !form.address.trim() || (zones.length > 0 && !form.deliveryZoneId)} className="rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2" style={{ backgroundColor: store.accentColor }}>{submitting ? 'Envoi en cours…' : 'Envoyer ma demande'}</button></div>}
      </div>
      <div className="flex items-start gap-3 rounded-2xl border border-[hsl(var(--primary)/.22)] bg-[hsl(var(--primary)/.08)] p-4 text-sm"><Clock3 size={18} className="mt-0.5 shrink-0" style={{ color: store.accentColor }} /><span>Les délais et frais peuvent dépendre de votre zone. L’adresse enregistrée dans votre compte facilite chaque nouvelle demande.</span></div>
    </div>
     {customer && requests.length > 0 && <div className="mt-6 rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[.16em]" style={{ color: store.primaryColor }}>Mon suivi</p><h2 className="mt-2 text-xl font-bold">Mes demandes récentes</h2><div className="mt-4 divide-y">{requests.slice(0, 5).map(request => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-bold">{request.reference}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{request.deliveryZoneName ? `${request.deliveryZoneName} · ` : ''}{request.serviceType === 'URGENT' ? 'Urgente' : 'Standard'}{request.desiredDate ? ` · ${request.desiredDate}` : ''}</p></div><span className="rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-xs font-bold">{request.status}</span></div>)}</div></div>}
  </section>;
}

function RentalProductCard({ rental, store, onSelect }: { rental: PublicRental; store: PublicShopBootstrap['store']; onSelect: () => void }) {
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
        <p className="shrink-0 text-right text-xs font-bold text-[#20252f] sm:text-sm">{money(rental.dailyRate ?? rental.price, store.currency)}<span className="block text-[10px] font-medium text-[#655e55]">/ jour</span></p>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-[#eee7dc] pt-2 text-[11px] font-semibold text-[#655e55]">
        <div className="flex items-center gap-1.5"><Home size={14} className="shrink-0 text-[#8c6c37]" /><span>{rental.seats ? `${rental.seats} places` : 'Places N/A'}</span></div>
        <div className="flex items-center gap-1.5 truncate"><span>{rental.transmission === 'AUTOMATIC' ? 'Auto' : rental.transmission === 'MANUAL' ? 'Manuelle' : 'Transmission N/A'}</span></div>
      </div>
      <button type="button" onClick={onSelect} disabled={!rental.isAvailable} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50" style={{ backgroundColor: 'var(--shop-accent)' }}><MessageCircle size={14} />Discuter sur WhatsApp</button>
    </div>
  </article>;
}

function RentalPage({ rentals, store, customer, slug, domain, onBack }: { rentals: PublicRental[]; store: PublicShopBootstrap['store']; customer: EcommerceCustomer | null; slug?: string; domain?: boolean; onBack: () => void }) {
  const [selectedRental, setSelectedRental] = useState<PublicRental | null>(null);

  if (selectedRental) {
    return <RentalBookingForm rental={selectedRental} store={store} customer={customer} onBack={() => setSelectedRental(null)} />;
  }

  const categories = [...new Set(rentals.map(rental => rental.category || 'Général'))].sort((a, b) => a.localeCompare(b, 'fr'));

  return <section className="mx-auto max-w-6xl">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))]"><ArrowLeft size={15} />Retour à la boutique</button>
    <header className="mt-6 flex flex-col justify-between gap-3 border-b pb-5 sm:flex-row sm:items-end">
      <div><p className="text-[10px] font-bold uppercase tracking-[.18em]" style={{ color: store.primaryColor }}>Flotte automobile</p><h1 className="mt-2 text-2xl font-bold tracking-[-.04em]">Trouvez votre prochaine location</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Échangez directement avec le propriétaire pour vérifier la disponibilité et les conditions.</p></div>
      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">{rentals.length} véhicule{rentals.length > 1 ? 's' : ''}</span>
    </header>
    {rentals.length === 0
      ? <div className="mt-6 rounded-2xl border border-dashed p-10 text-center"><p className="text-sm font-semibold">Les offres de location arrivent bientôt.</p><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Aucune location publiée n’est disponible dans cette boutique.</p></div>
      : <div className="mt-6 space-y-8">{categories.map(category => {
        const categoryRentals = rentals.filter(rental => (rental.category || 'Général') === category);
        return <section key={category}>
          <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em]" style={{ color: store.primaryColor }}>Catégorie</p><h2 className="mt-1 text-xl font-bold">{category}</h2></div><span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">{categoryRentals.length} véhicule{categoryRentals.length > 1 ? 's' : ''}</span></div>
           <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{categoryRentals.map(rental => <RentalProductCard key={`${category}-${rental.name}-${rental.billingUnit}`} rental={rental} store={store} onSelect={() => setSelectedRental(rental)} />)}</div>
        </section>;
      })}</div>}
  </section>;
}

function RentalBookingForm({ rental, store, customer, onBack }: { rental: PublicRental; store: PublicShopBootstrap['store']; customer: EcommerceCustomer | null; onBack: () => void }) {
  const [form, setForm] = useState({ startsAt: '', endsAt: '', tripType: 'FAMILY' as EcommerceCarTripType, departure: '', destination: '', customerName: customer?.name || '', customerEmail: customer?.email || '', customerPhone: customer?.phone || '', note: '' });
  const [error, setError] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const whatsapp = whatsappNumber(store.locationSettings?.whatsapp || '');
  const whatsappMessage = store.locationSettings?.message?.trim() || 'Bonjour, je souhaite échanger au sujet de cette location.';

  const openWhatsapp = () => {
    if (!whatsapp) {
      setError('Le propriétaire n’a pas encore renseigné son numéro WhatsApp.');
      return;
    }
    if (!form.startsAt || !form.endsAt || !form.customerName.trim()) {
      setError('Indiquez au moins votre nom et les dates souhaitées.');
      return;
    }
    const details = [
      whatsappMessage,
      '',
      `Véhicule : ${rental.name}`,
      `Dates : du ${form.startsAt} au ${form.endsAt}`,
      `Type : ${form.tripType === 'BUSINESS' ? 'Professionnel' : 'Famille / Personnel'}`,
      `Nom : ${form.customerName.trim()}`,
      form.customerPhone.trim() ? `Téléphone : ${form.customerPhone.trim()}` : '',
      form.customerEmail.trim() ? `Email : ${form.customerEmail.trim()}` : '',
      form.departure.trim() ? `Départ souhaité : ${form.departure.trim()}` : '',
      form.destination.trim() ? `Destination : ${form.destination.trim()}` : '',
      form.note.trim() ? `Message : ${form.note.trim()}` : '',
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(details)}`, '_blank', 'noopener,noreferrer');
  };

  return <section className="mx-auto max-w-4xl">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))]"><ArrowLeft size={15} />Retour aux véhicules</button>
    <div className="mt-6 flex flex-col md:flex-row gap-8">
      <div className="w-full md:w-1/3 shrink-0 space-y-4">
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
           <GalleryCarousel mainImage={rental.imageUrl} gallery={rental.gallery} alt={rental.name} icon={Home} />
          <div className="p-4">
            <h2 className="text-lg font-bold">{rental.name}</h2>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{rental.category}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {rental.seats && <span className="rounded bg-[hsl(var(--muted))] px-2 py-1 font-semibold">{rental.seats} places</span>}
              {rental.transmission && <span className="rounded bg-[hsl(var(--muted))] px-2 py-1 font-semibold">{rental.transmission === 'AUTOMATIC' ? 'Automatique' : 'Manuelle'}</span>}
              {rental.fuel && <span className="rounded bg-[hsl(var(--muted))] px-2 py-1 font-semibold">{rental.fuel}</span>}
            </div>
            <p className="mt-4 text-xl font-bold text-[hsl(var(--foreground))]">{money(rental.dailyRate ?? rental.price, store.currency)}<span className="text-xs font-normal text-[hsl(var(--muted-foreground))]"> / jour</span></p>
          </div>
        </div>
      </div>
      
      <div className="w-full md:w-2/3">
        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
        
        <div className="rounded-3xl border bg-[hsl(var(--card))] p-6 shadow-sm sm:p-8 space-y-6 fade-up">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em]" style={{ color: 'var(--shop-primary)' }}>Contact direct</p>
            <h2 className="mt-2 text-xl font-bold">Parlez au propriétaire sur WhatsApp</h2>
            <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Plus besoin de calculer la distance. Envoyez votre demande et échangez directement sur les dates, le trajet et les conditions.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold">Date de départ<input type="date" required min={today} value={form.startsAt} onChange={e => setForm({ ...form, startsAt: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>
            <label className="block text-sm font-bold">Date de retour<input type="date" required min={form.startsAt || today} value={form.endsAt} onChange={e => setForm({ ...form, endsAt: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-bold">Type de voyage</label>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="radio" checked={form.tripType === 'FAMILY'} onChange={() => setForm({ ...form, tripType: 'FAMILY' })} /> Famille / Personnel</label>
              <label className="flex items-center gap-2"><input type="radio" checked={form.tripType === 'BUSINESS'} onChange={() => setForm({ ...form, tripType: 'BUSINESS' })} /> Professionnel</label>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold">Votre nom<input required placeholder="Nom complet" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>
            <label className="block text-sm font-bold">Téléphone<input placeholder="Numéro WhatsApp" value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>
            <label className="block text-sm font-bold">Email<input type="email" placeholder="Votre adresse email" value={form.customerEmail} onChange={e => setForm({ ...form, customerEmail: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold">Départ souhaité<span className="mt-1 block text-xs font-normal text-[hsl(var(--muted-foreground))]">Facultatif, pour aider le propriétaire à vous répondre.</span><input placeholder="Ex. Aéroport de Dakar" value={form.departure} onChange={e => setForm({ ...form, departure: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>
            <label className="block text-sm font-bold">Destination<span className="mt-1 block text-xs font-normal text-[hsl(var(--muted-foreground))]">Facultatif, aucun calcul automatique.</span><input placeholder="Ex. Saly Portudal" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>
          </div>
          <label className="block text-sm font-bold">Message complémentaire<textarea rows={3} placeholder="Une question ou une précision pour le propriétaire ?" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>
          <button type="button" onClick={openWhatsapp} disabled={!whatsapp || !form.startsAt || !form.endsAt || !form.customerName.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50" style={{ backgroundColor: '#25D366' }}><MessageCircle size={18} />{whatsapp ? 'Ouvrir la discussion WhatsApp' : 'WhatsApp du propriétaire non configuré'}</button>
          <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">Le message sera prérempli avec le véhicule et vos informations.</p>
        </div>
      </div>
    </div>
  </section>;
}

function FeatureUnavailable({ title, text, onBack }: { title: string; text: string; onBack: () => void }) {
  return <section className="mx-auto max-w-xl rounded-3xl border bg-[hsl(var(--card))] p-8 text-center shadow-sm"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--muted))]"><LockKeyhole size={21} /></span><h1 className="mt-5 text-2xl font-bold">{title}</h1><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{text}</p><button type="button" onClick={onBack} className="mt-6 rounded-xl px-4 py-3 text-sm font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>Retour à la boutique</button></section>;
}

function AuthPanel({ mode, onModeChange, form, setForm, onSubmit, onBack }: { mode: 'login' | 'register'; onModeChange: (mode: 'login' | 'register') => void; form: { name: string; email: string; phone: string; password: string }; setForm: (form: { name: string; email: string; phone: string; password: string }) => void; onSubmit: () => void; onBack: () => void }) {
  return <section className="mx-auto w-full min-w-0 max-w-md rounded-3xl border bg-[hsl(var(--card))] p-5 shadow-sm sm:p-8"><button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))]"><ArrowLeft size={15} />Retour à la boutique</button><div className="mt-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--muted))]"><LockKeyhole size={22} /></div><h1 className="mt-5 break-words text-2xl font-bold">{mode === 'login' ? 'Bienvenue dans votre espace' : 'Créer votre compte client'}</h1><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{mode === 'login' ? 'Suivez vos commandes et retrouvez vos informations de livraison.' : 'Votre compte est propre à cette boutique et ne donne accès qu’à vos données.'}</p><div className="mt-6 min-w-0 space-y-3">{mode === 'register' && <><input className="box-border w-full min-w-0 rounded-xl border px-3 py-3 text-sm" placeholder="Nom complet" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /><input className="box-border w-full min-w-0 rounded-xl border px-3 py-3 text-sm" placeholder="Téléphone" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} /></>}<input className="box-border w-full min-w-0 rounded-xl border px-3 py-3 text-sm" placeholder="Email" type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /><input className="box-border w-full min-w-0 rounded-xl border px-3 py-3 text-sm" placeholder="Mot de passe (8 caractères minimum)" type="password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} /></div><button type="button" onClick={onSubmit} className="mt-5 w-full rounded-xl py-3.5 text-sm font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>{mode === 'login' ? 'Se connecter' : 'Créer mon compte'}</button><button type="button" onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')} className="mt-4 w-full text-sm font-semibold underline underline-offset-4">{mode === 'login' ? 'Créer un compte' : 'J’ai déjà un compte'}</button></section>;
}

function CartPanelV2({ cart, total, requiresShipping, zones, deliveryZoneId, setDeliveryZoneId, store, customer, form, setForm, attachments, setAttachments, paymentProvider, setPaymentProvider, onChange, onSubmit, submitting, onBack }: { cart: CartLine[]; total: number; requiresShipping: boolean; zones: PublicShopBootstrap['deliveryZones']; deliveryZoneId: string; setDeliveryZoneId: (id: string) => void; store: PublicShopBootstrap['store']; customer: EcommerceCustomer | null; form: { customerName: string; customerEmail: string; customerPhone: string; shippingAddress: string; note: string }; setForm: (form: { customerName: string; customerEmail: string; customerPhone: string; shippingAddress: string; note: string }) => void; attachments: File[]; setAttachments: (attachments: File[]) => void; paymentProvider: PaymentProvider; setPaymentProvider: (provider: PaymentProvider) => void; onChange: (slug: string, delta: number) => void; onSubmit: () => void; submitting: boolean; onBack: () => void }) {
  const requiresZone = requiresShipping && zones.length > 0;
  const canSubmit = !submitting && Boolean(form.customerName.trim()) && Boolean(form.customerEmail.trim()) && (!requiresShipping || Boolean(form.shippingAddress.trim())) && (!requiresZone || Boolean(deliveryZoneId)) && cart.length > 0;
  return <section className="mx-auto max-w-3xl">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))]"><ArrowLeft size={15} />Continuer mes achats</button>
    <div className="mt-5 rounded-3xl border bg-[hsl(var(--card))] p-5 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[.16em]" style={{ color: 'var(--shop-primary)' }}>Panier</p>
      <h1 className="mt-1 text-2xl font-bold">Votre commande</h1>
      {cart.length === 0 ? <p className="py-14 text-center text-sm text-[hsl(var(--muted-foreground))]">Votre panier est vide.</p> : <>
         <div className="mt-6 divide-y border-y">{cart.map(line => <div key={line.product.slug} className="flex items-center gap-3 py-4"><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{line.product.name}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{line.product.fulfillmentType === 'DIGITAL' ? 'Produit numérique' : line.product.productType === 'RENTAL' ? 'Location' : 'Produit physique'} · {money(line.product.price, store.currency)}</p></div>{line.product.fulfillmentType === 'DIGITAL' ? <div className="flex items-center gap-2"><span className="text-sm font-bold">× 1</span><button type="button" onClick={() => onChange(line.product.slug, -1)} aria-label="Retirer le produit numérique du panier" className="rounded-lg border p-1.5"><X size={13} /></button></div> : <div className="flex items-center gap-2 rounded-lg border px-2 py-1"><button type="button" onClick={() => onChange(line.product.slug, -1)} aria-label="Retirer une unité"><Minus size={14} /></button><span className="w-5 text-center text-sm font-bold">{line.quantity}</span><button type="button" onClick={() => onChange(line.product.slug, 1)} aria-label="Ajouter une unité"><Plus size={14} /></button></div>}<p className="w-24 text-right text-sm font-bold">{money(line.product.price * line.quantity, store.currency)}</p></div>)}</div>
         {requiresZone && <div className="mt-5 rounded-2xl border border-[var(--shop-primary)]/20 bg-[var(--shop-primary)]/5 p-4"><div className="flex items-start gap-3"><Truck size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--shop-accent)' }} /><div><p className="text-sm font-bold">Choisissez votre zone de livraison</p><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Les frais sont ajoutés au total selon la zone sélectionnée.</p></div></div><select required aria-label="Zone de livraison" className="mt-3 w-full rounded-xl border bg-[hsl(var(--card))] px-3 py-3 text-sm" value={deliveryZoneId} onChange={event => setDeliveryZoneId(event.target.value)}><option value="">Sélectionner une zone</option>{zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name} · {zone.fee > 0 ? money(zone.fee, store.currency) : 'Gratuit'}</option>)}</select></div>}
          {store.allowOrderAttachments && <div className="mt-5 rounded-2xl border border-dashed p-4">
            <label className="block text-sm font-bold">Pièces jointes (facultatif)
              <span className="mt-1 block text-xs font-normal leading-5 text-[hsl(var(--muted-foreground))]">Ajoutez jusqu’à 3 fichiers PDF ou images (JPEG, PNG, WebP), 2 Mo maximum par fichier.</span>
              <input
                type="file"
                multiple
                accept=".pdf,application/pdf,image/jpeg,image/png,image/webp"
                disabled={submitting}
                onChange={event => {
                  const selected = Array.from(event.target.files ?? []);
                  event.target.value = '';
                  if (selected.length > 3) {
                    showAppToast('Vous pouvez joindre au maximum 3 fichiers.', 'error');
                    return;
                  }
                  const invalidFile = selected.find(file =>
                    file.size > 2 * 1024 * 1024
                    || !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type),
                  );
                  if (invalidFile) {
                    showAppToast(`${invalidFile.name} doit être un PDF ou une image acceptée de 2 Mo maximum.`, 'error');
                    return;
                  }
                  setAttachments(selected);
                }}
                className="mt-3 block w-full rounded-lg border bg-[hsl(var(--card))] px-3 py-2 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-[hsl(var(--muted))] file:px-2.5 file:py-1.5 file:text-xs file:font-bold"
              />
            </label>
            {attachments.length > 0 && <ul className="mt-3 space-y-2">{attachments.map((file, index) => <li key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-[hsl(var(--muted)/.45)] px-3 py-2 text-xs">
              <span className="min-w-0 truncate">{file.name} · {(file.size / 1024).toFixed(0)} Ko</span>
              <button type="button" disabled={submitting} onClick={() => setAttachments(attachments.filter((_, itemIndex) => itemIndex !== index))} className="shrink-0 font-bold text-[hsl(var(--destructive))]">Retirer</button>
            </li>)}</ul>}
          </div>}
         <div className="mt-5 flex items-center justify-between text-lg font-bold"><span>Total</span><span>{money(total, store.currency)}</span></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2"><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Nom complet" value={form.customerName} onChange={event => setForm({ ...form, customerName: event.target.value })} /><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Email" type="email" value={form.customerEmail} onChange={event => setForm({ ...form, customerEmail: event.target.value })} /><input className="rounded-xl border px-3 py-3 text-sm" placeholder="Téléphone" value={form.customerPhone} onChange={event => setForm({ ...form, customerPhone: event.target.value })} />{requiresShipping ? <textarea className="rounded-xl border px-3 py-3 text-sm sm:col-span-2" rows={3} placeholder="Adresse de livraison" value={form.shippingAddress} onChange={event => setForm({ ...form, shippingAddress: event.target.value })} /> : <p className="rounded-xl border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--primary)/.06)] px-3 py-3 text-xs text-[hsl(var(--primary))] sm:col-span-2">Cette commande contient uniquement des produits numériques. Aucun envoi physique n’est nécessaire.</p>}<textarea className="rounded-xl border px-3 py-3 text-sm sm:col-span-2" rows={2} placeholder="Note pour la boutique (facultatif)" value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} /></div>
        <fieldset className="mt-5 rounded-2xl border p-4"><legend className="px-1 text-sm font-bold">Moyen de paiement</legend><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Choisissez votre moyen préféré. Le paiement sera sécurisé par DiamanoPay.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{([['WAVE', 'Wave'], ['ORANGE_MONEY', 'Orange Money']] as const).map(([value, label]) => <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${paymentProvider === value ? 'border-[var(--shop-primary)] bg-[var(--shop-primary)]/10' : 'hover:bg-[hsl(var(--muted))]'}`}><input type="radio" name="payment-provider" value={value} checked={paymentProvider === value} onChange={() => setPaymentProvider(value)} />{label}</label>)}</div></fieldset>
        {customer && <p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">Cette commande sera rattachée à votre compte client.</p>}
        <button type="button" onClick={onSubmit} disabled={!canSubmit} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: 'var(--shop-accent)' }}>{submitting && <RefreshCw size={15} className="animate-spin" />}{submitting ? 'Préparation du paiement…' : `Payer avec ${paymentProvider === 'WAVE' ? 'Wave' : 'Orange Money'}`}</button>
      </>}
    </div>
  </section>;
}

function AccountPanel(props: { store: PublicShopBootstrap['store']; section: AccountSection; customer: EcommerceCustomer; products: PublicProduct[]; customerData: EcommerceCustomerBootstrap | null; customerLoading: boolean; customerActionPending: boolean; selectedOrder?: EcommerceCustomerBootstrap['orders'][number]; profileForm: { name: string; phone: string }; setProfileForm: (form: { name: string; phone: string }) => void; passwordForm: { currentPassword: string; newPassword: string }; setPasswordForm: (form: { currentPassword: string; newPassword: string }) => void; addressForm: Omit<EcommerceCustomerAddress, 'id'>; setAddressForm: (form: Omit<EcommerceCustomerAddress, 'id'>) => void; editingAddressId: string | null; setEditingAddressId: (id: string | null) => void; onProfile: () => void; onPassword: () => void; onAddress: () => void; onDeleteAddress: (id: string) => void; onFavorite: (product: PublicProduct) => void; onDownload: (orderId: string, itemId: string) => void; onDownloadAttachment: (orderId: string, attachmentId: string) => void; onOrder: (id: string) => void; onLogout: () => void; onNavigate: (path: string) => void }) {
  const { section, customer, customerData, customerLoading, onDownload } = props;
  const orders = customerData?.orders ?? [];
  const addresses = customerData?.addresses ?? [];
  const favoriteCount = customerData?.favoriteProductSlugs.length ?? 0;
  const deliveryRequests = customerData?.deliveryRequests ?? [];
   const tabs = [['dashboard', 'Vue d’ensemble', '/compte'], ['orders', 'Commandes', '/compte/commandes'], ['favorites', `Favoris (${favoriteCount})`, '/compte/favoris'], ['addresses', 'Adresses', '/compte/adresses'], ['profile', 'Profil & sécurité', '/compte/profil']] as const;
     return <section className="grid min-w-0 gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6" aria-busy={props.customerActionPending}>{props.customerActionPending && <div className="fixed inset-x-4 top-4 z-[90] mx-auto flex max-w-md items-center justify-center gap-2 rounded-xl border border-[var(--shop-primary)]/25 bg-white/95 px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur" role="status"><RefreshCw size={15} className="animate-spin" aria-hidden="true" />Action en cours…</div>}<aside className="min-w-0 rounded-2xl border bg-[hsl(var(--card))] p-3 shadow-sm"><div className="flex min-w-0 items-center gap-3 border-b px-2 pb-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[hsl(var(--muted))]">{props.store.logoUrl ? <img src={props.store.logoUrl} alt={`Logo de ${props.store.name}`} className="h-full w-full object-contain p-1" /> : <UserRound size={18} />}</span><div className="min-w-0"><p className="truncate text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Mon espace client</p><p className="truncate text-sm font-bold">{customer.name}</p><p className="truncate text-xs text-[hsl(var(--muted-foreground))]">{customer.email}</p></div></div><nav className="mt-3 grid grid-cols-2 gap-1 lg:grid-cols-1">{tabs.map(([key, label, path]) => <button type="button" key={key} onClick={() => props.onNavigate(path)} className={`min-w-0 rounded-lg px-2.5 py-2.5 text-left text-xs font-semibold leading-4 sm:px-3 sm:text-sm ${section === key ? 'bg-[var(--shop-accent)] text-white' : 'hover:bg-[hsl(var(--muted))]'}`}>{label}</button>)}<button type="button" onClick={props.onLogout} disabled={props.customerActionPending} className="col-span-2 min-w-0 rounded-lg border-t px-2.5 py-2.5 text-left text-xs font-semibold text-red-700 disabled:cursor-wait disabled:opacity-50 sm:px-3 sm:text-sm lg:col-span-1 lg:mt-3">Se déconnecter</button></nav></aside><div className="min-w-0">{customerLoading ? <div className="rounded-2xl border bg-[hsl(var(--card))] p-8 text-sm text-[hsl(var(--muted-foreground))]">Chargement de votre espace…</div> : section === 'dashboard' ? <CustomerDashboard customer={customer} orders={orders} addresses={addresses} favoriteCount={favoriteCount} deliveryRequests={deliveryRequests} store={props.store} onNavigate={props.onNavigate} /> : section === 'orders' ? <OrderSection orders={orders} selectedOrder={props.selectedOrder} onOrder={props.onOrder} onDownload={onDownload} onDownloadAttachment={props.onDownloadAttachment} /> : section === 'profile' ? <ProfileSection customer={customer} profileForm={props.profileForm} setProfileForm={props.setProfileForm} passwordForm={props.passwordForm} setPasswordForm={props.setPasswordForm} onProfile={props.onProfile} onPassword={props.onPassword} /> : section === 'addresses' ? <AddressSection addresses={addresses} form={props.addressForm} setForm={props.setAddressForm} editingId={props.editingAddressId} setEditingId={props.setEditingAddressId} customer={customer} onSave={props.onAddress} onDelete={props.onDeleteAddress} /> : <FavoriteSection products={props.products} favoriteSlugs={customerData?.favoriteProductSlugs ?? []} onToggle={props.onFavorite} onNavigate={props.onNavigate} />}</div></section>;
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
         <div className="flex min-w-0 items-center gap-3 sm:gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold sm:h-14 sm:w-14">{initials}</span><div className="min-w-0"><p className="text-xs font-semibold text-white/65">Votre espace personnel</p><h1 className="mt-1 break-words text-xl font-bold tracking-[-.04em] sm:text-2xl">Bonjour {firstName}.</h1><p className="mt-1 text-sm leading-5 text-white/70">Tout ce qui compte pour vos commandes, au même endroit.</p></div></div>
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
      <section className="rounded-2xl border bg-[hsl(var(--card))] p-4 shadow-sm sm:p-6"><div className="flex min-w-0 flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[.16em]" style={{ color: store.primaryColor }}>Dernier mouvement</p><h2 className="mt-2 break-words text-lg font-bold sm:text-xl">Votre commande récente</h2></div><button type="button" onClick={() => onNavigate('/compte/commandes')} className="shrink-0 text-xs font-bold" style={{ color: store.accentColor }}>Tout voir <ArrowRight className="inline" size={14} /></button></div>{latest ? <div className="mt-5 rounded-2xl border bg-[hsl(var(--muted)/.28)] p-3 sm:mt-6 sm:p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-bold">{latest.reference}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{readableDate(latest.createdAt)} · {latest.items.length} article{latest.items.length > 1 ? 's' : ''}</p></div><span className="shrink-0 rounded-full bg-[hsl(var(--primary)/.14)] px-3 py-1 text-[11px] font-bold" style={{ color: store.accentColor }}>{latest.status}</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-[hsl(var(--border))]"><div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: store.primaryColor }} /></div><div className="mt-2 flex justify-between gap-2 text-[10px] font-semibold text-[hsl(var(--muted-foreground))]"><span>Préparation</span><span>Expédition</span><span>Livraison</span></div><div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm"><span className="text-[hsl(var(--muted-foreground))]">{latest.paymentStatus === 'PAID' ? 'Paiement confirmé' : 'Paiement en attente'}</span><strong>{money(latest.total, store.currency)}</strong></div></div> : <div className="mt-6 rounded-2xl border border-dashed p-8 text-center"><Sparkles className="mx-auto" size={22} style={{ color: store.primaryColor }} /><p className="mt-3 text-sm font-semibold">Votre prochaine commande apparaîtra ici.</p><button type="button" onClick={() => onNavigate('')} className="mt-4 rounded-xl px-4 py-2.5 text-xs font-bold text-white" style={{ backgroundColor: store.accentColor }}>Découvrir la boutique</button></div>}</section>
      <section className="rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-sm sm:p-6"><p className="text-xs font-bold uppercase tracking-[.16em]" style={{ color: store.primaryColor }}>Accès rapides</p><h2 className="mt-2 text-xl font-bold">Gagnez du temps</h2><div className="mt-5 grid gap-2">{[['/compte/favoris', Heart, 'Mes favoris', 'Retrouvez vos sélections'], ['/compte/adresses', MapPin, 'Mes adresses', 'Préparez vos livraisons'], ['/compte/profil', UserRound, 'Mon profil', 'Gardez vos infos à jour']].map(([path, Icon, label, text]) => <button type="button" key={path as string} onClick={() => onNavigate(path as string)} className="flex items-center gap-3 rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-[var(--shop-primary)]"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--muted))]" style={{ color: store.accentColor }}><Icon size={17} /></span><span className="min-w-0 flex-1"><strong className="block text-sm">{label as string}</strong><span className="mt-0.5 block text-xs text-[hsl(var(--muted-foreground))]">{text as string}</span></span><ArrowRight size={14} className="text-[hsl(var(--muted-foreground))]" /></button>)}</div></section>
    </div>
  </div>;
}

function DashboardStat({ icon: Icon, label, value, detail, onClick }: { icon: typeof Package; label: string; value: number; detail: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-2xl border bg-[hsl(var(--card))] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--shop-primary)]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--muted))]"><Icon size={17} /></span><p className="mt-4 text-xs font-bold text-[hsl(var(--muted-foreground))]">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{detail}</p></button>;
}

function FavoriteSection({ products, favoriteSlugs, onToggle, onNavigate }: { products: PublicProduct[]; favoriteSlugs: string[]; onToggle: (product: PublicProduct) => void; onNavigate: (path: string) => void }) {
  const favorites = products.filter(product => favoriteSlugs.includes(product.slug));

  return <div className="min-w-0"><h1 className="break-words text-2xl font-bold">Vos favoris</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Les produits enregistrés dans votre compte sur cette boutique.</p>{favorites.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed p-8 text-center text-sm text-[hsl(var(--muted-foreground))] sm:p-10">Aucun produit favori disponible actuellement.</div> : <div className="mt-6 grid min-w-0 gap-3 sm:grid-cols-2">{favorites.map(product => <div key={product.slug} className="flex min-w-0 items-center gap-3 rounded-2xl border bg-[hsl(var(--card))] p-3 shadow-sm sm:gap-4 sm:p-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[hsl(var(--muted))] sm:h-16 sm:w-16">{product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-cover" /> : <Package size={20} />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{product.name}</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{product.price}</p></div><button type="button" onClick={() => onToggle(product)} className="shrink-0 rounded-lg border p-2 text-red-600" aria-label="Retirer des favoris"><Heart size={17} fill="currentColor" /></button></div>)}</div>}<button type="button" onClick={() => onNavigate('')} className="mt-6 rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: 'var(--shop-accent)' }}>Voir la boutique</button></div>;
}

function OrderSection({ orders, selectedOrder, onOrder, onDownload, onDownloadAttachment }: { orders: EcommerceCustomerBootstrap['orders']; selectedOrder?: EcommerceCustomerBootstrap['orders'][number]; onOrder: (id: string) => void; onDownload: (orderId: string, itemId: string) => void; onDownloadAttachment: (orderId: string, attachmentId: string) => void }) {
  const selectedOrderIsDigital = Boolean(selectedOrder?.items.length) && selectedOrder?.items.every(item => item.fulfillmentType === 'DIGITAL');
  const paymentFailed = selectedOrder ? ['FAILED', 'REFUNDED'].includes(selectedOrder.paymentStatus) : false;
  return <div className="min-w-0">
    <div className="flex min-w-0 items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="break-words text-2xl font-bold">Vos commandes</h1>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{selectedOrderIsDigital ? 'Votre produit numérique est livré automatiquement après confirmation du paiement.' : 'Le statut du paiement, de la préparation et de la livraison communiqué par la boutique.'}</p>
      </div>
    </div>
    {selectedOrder ? <div className="mt-6 rounded-2xl border bg-[hsl(var(--card))] p-4 shadow-sm sm:p-5">
      <button type="button" onClick={() => onOrder('')} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft size={15} />Toutes les commandes</button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-xs text-[hsl(var(--muted-foreground))]">{readableDate(selectedOrder.createdAt)}</p><h2 className="mt-1 break-words text-xl font-bold">{selectedOrder.reference}</h2></div>
        <div className="shrink-0 text-left sm:text-right"><p className="text-sm font-bold">{selectedOrder.status}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Paiement : {selectedOrder.paymentStatus}</p></div>
      </div>
       {paymentFailed && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
         <strong className="block">Paiement échoué</strong>
         <span className="mt-1 block">{selectedOrder.paymentFailureReason || 'Le paiement Wave n’a pas été confirmé. Votre commande n’a pas été débitée.'}</span>
         <span className="mt-2 block text-xs">Vous pouvez retourner au panier et réessayer le paiement.</span>
       </div>}
       {selectedOrderIsDigital && selectedOrder.paymentStatus === 'PAID' && <div role="status" className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
         <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100"><Download size={18} /></span><div><strong className="block">Votre téléchargement est prêt</strong><p className="mt-1 text-sm leading-5">Cliquez sur le bouton pour télécharger votre produit numérique.</p></div></div>
         <div className="mt-4 flex flex-wrap gap-2">{selectedOrder.items.filter(item => item.fulfillmentType === 'DIGITAL').map(item => <button type="button" key={`download-${item.id}`} onClick={() => onDownload(selectedOrder.id, item.id)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"><Download size={15} />Télécharger{selectedOrder.items.filter(candidate => candidate.fulfillmentType === 'DIGITAL').length > 1 ? ` · ${item.productName}` : ''}</button>)}</div>
       </div>}
        {!!selectedOrder.attachments?.length && <section className="mt-5 rounded-xl border p-4">
          <h3 className="text-sm font-bold">Pièces jointes envoyées</h3>
          <ul className="mt-3 space-y-2">{selectedOrder.attachments.map(attachment => <li key={attachment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[hsl(var(--muted)/.4)] px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-xs">{attachment.name} · {Math.max(1, Math.round(attachment.size / 1024))} Ko</span>
            <button type="button" onClick={() => onDownloadAttachment(selectedOrder.id, attachment.id)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border bg-[hsl(var(--card))] px-2.5 py-2 text-xs font-bold">
              <Download size={13} />Télécharger
            </button>
          </li>)}</ul>
        </section>}
      <div className="mt-6 divide-y border-y">
        {selectedOrder.items.map(item => {
          const isDigital = item.fulfillmentType === 'DIGITAL';
          const canDownload = isDigital && selectedOrder.paymentStatus === 'PAID';
          return <div key={item.id} className="flex min-w-0 items-center justify-between gap-3 py-4 text-sm">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[hsl(var(--muted))] sm:h-12 sm:w-12">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : item.productType === 'RENTAL' ? <Home size={18} /> : isDigital ? <ArrowDownToLine size={18} /> : <Package size={18} />}</span>
              <span className="min-w-0"><strong className="block truncate">{item.productName}</strong><small className="text-xs text-[hsl(var(--muted-foreground))]">{isDigital ? 'Produit numérique' : item.productType === 'RENTAL' ? 'Location' : 'Produit physique'} · × {item.quantity}</small></span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <strong className="text-right">{item.lineTotal}</strong>
              {canDownload && <button type="button" onClick={() => onDownload(selectedOrder.id, item.id)} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-bold text-[hsl(var(--primary))]"><Download size={14} />Télécharger</button>}
            </div>
          </div>;
        })}
      </div>
      <div className="mt-5 flex flex-wrap justify-between gap-2 font-bold"><span>Total</span><span>{money(selectedOrder.total, 'XOF')}</span></div>
      {selectedOrder.shippingAddress && <p className="mt-5 break-words rounded-xl bg-[hsl(var(--muted)/.5)] p-4 text-sm">{selectedOrder.shippingAddress}</p>}
    </div> : orders.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed p-8 text-center text-sm text-[hsl(var(--muted-foreground))] sm:p-10">Aucune commande liée à ce compte.</div> : <div className="mt-6 grid gap-3">{orders.map(order => <button type="button" key={order.id} onClick={() => onOrder(order.id)} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl border bg-[hsl(var(--card))] p-4 text-left shadow-sm hover:border-[var(--shop-primary)] sm:gap-4 sm:p-5"><div className="min-w-0"><p className="truncate text-sm font-bold">{order.reference}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{readableDate(order.createdAt)} · {order.items.length} article(s)</p></div><div className="shrink-0 text-left sm:text-right"><p className="text-sm font-bold">{order.total}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{order.status} · Paiement {order.paymentStatus}</p></div></button>)}</div>}
  </div>;
}

function ProfileSection({ customer, profileForm, setProfileForm, passwordForm, setPasswordForm, onProfile, onPassword }: { customer: EcommerceCustomer; profileForm: { name: string; phone: string }; setProfileForm: (form: { name: string; phone: string }) => void; passwordForm: { currentPassword: string; newPassword: string }; setPasswordForm: (form: { currentPassword: string; newPassword: string }) => void; onProfile: () => void; onPassword: () => void }) {
  return <div className="grid min-w-0 gap-5 xl:grid-cols-2"><section className="min-w-0 rounded-2xl border bg-[hsl(var(--card))] p-4 shadow-sm sm:p-5"><h1 className="text-xl font-bold">Profil</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Vos informations servent uniquement à cette boutique.</p><div className="mt-5 grid min-w-0 gap-3"><input className="box-border w-full min-w-0 rounded-xl border px-3 py-3 text-sm" value={profileForm.name} onChange={event => setProfileForm({ ...profileForm, name: event.target.value })} /><input className="box-border w-full min-w-0 rounded-xl border px-3 py-3 text-sm" value={customer.email} disabled /><input className="box-border w-full min-w-0 rounded-xl border px-3 py-3 text-sm" placeholder="Téléphone" value={profileForm.phone} onChange={event => setProfileForm({ ...profileForm, phone: event.target.value })} /></div><button type="button" onClick={onProfile} className="mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white sm:w-auto" style={{ backgroundColor: 'var(--shop-accent)' }}>Enregistrer</button></section><section className="min-w-0 rounded-2xl border bg-[hsl(var(--card))] p-4 shadow-sm sm:p-5"><h2 className="text-xl font-bold">Sécurité</h2><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Changez votre mot de passe. Les sessions existantes seront révoquées.</p><div className="mt-5 grid min-w-0 gap-3"><input className="box-border w-full min-w-0 rounded-xl border px-3 py-3 text-sm" placeholder="Mot de passe actuel" type="password" value={passwordForm.currentPassword} onChange={event => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} /><input className="box-border w-full min-w-0 rounded-xl border px-3 py-3 text-sm" placeholder="Nouveau mot de passe" type="password" value={passwordForm.newPassword} onChange={event => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} /></div><button type="button" onClick={onPassword} className="mt-5 w-full rounded-xl border px-4 py-2.5 text-sm font-bold sm:w-auto">Changer le mot de passe</button></section></div>;
}

function AddressSection({ addresses, form, setForm, editingId, setEditingId, customer, onSave, onDelete }: { addresses: EcommerceCustomerAddress[]; form: Omit<EcommerceCustomerAddress, 'id'>; setForm: (form: Omit<EcommerceCustomerAddress, 'id'>) => void; editingId: string | null; setEditingId: (id: string | null) => void; customer: EcommerceCustomer; onSave: () => void; onDelete: (id: string) => void }) {
  const reset = () => { setEditingId(null); setForm({ label: 'Domicile', recipientName: customer.name, phone: customer.phone, line1: '', line2: '', city: '', region: '', postalCode: '', country: 'Sénégal', isDefault: false }); };
  return <div className="min-w-0"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><h1 className="break-words text-2xl font-bold">Adresses</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Gérez vos adresses de livraison enregistrées.</p></div><button type="button" onClick={reset} className="w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white sm:w-auto" style={{ backgroundColor: 'var(--shop-accent)' }}>Nouvelle adresse</button></div><div className="mt-6 grid gap-3">{addresses.map(address => <div key={address.id} className="min-w-0 rounded-2xl border bg-[hsl(var(--card))] p-4 shadow-sm sm:p-5"><div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="break-words font-bold">{address.label}</h2>{address.isDefault && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800">Par défaut</span>}</div><p className="mt-2 break-words text-sm">{address.recipientName} · {address.phone}</p><p className="mt-1 break-words text-sm text-[hsl(var(--muted-foreground))]">{addressText(address)}</p></div><div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><button type="button" onClick={() => { setEditingId(address.id); setForm(address); }} className="w-full rounded-lg border px-3 py-2 text-xs font-bold sm:w-auto">Modifier</button><button type="button" onClick={() => onDelete(address.id)} className="w-full rounded-lg border px-3 py-2 text-xs font-bold text-red-700 sm:w-auto">Supprimer</button></div></div></div>)}</div>{(editingId || addresses.length === 0) && <div className="mt-6 min-w-0 rounded-2xl border bg-[hsl(var(--card))] p-4 shadow-sm sm:p-5"><div className="flex min-w-0 items-start justify-between gap-3"><h2 className="break-words text-lg font-bold">{editingId ? 'Modifier l’adresse' : 'Ajouter une adresse'}</h2><button type="button" onClick={reset} aria-label="Annuler" className="shrink-0"><X size={18} /></button></div><div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2">{(['label', 'recipientName', 'phone', 'line1', 'line2', 'city', 'region', 'postalCode', 'country'] as const).map(field => <input key={field} className="box-border w-full min-w-0 rounded-xl border px-3 py-3 text-sm" placeholder={{ label: 'Libellé', recipientName: 'Nom du destinataire', phone: 'Téléphone', line1: 'Adresse', line2: 'Complément', city: 'Ville', region: 'Région', postalCode: 'Code postal', country: 'Pays' }[field]} value={form[field]} onChange={event => setForm({ ...form, [field]: event.target.value })} />)}</div><label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={form.isDefault} onChange={event => setForm({ ...form, isDefault: event.target.checked })} /> <span>Utiliser comme adresse par défaut</span></label><button type="button" onClick={onSave} className="mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white sm:w-auto" style={{ backgroundColor: 'var(--shop-accent)' }}>Enregistrer l’adresse</button></div>}</div>;
}