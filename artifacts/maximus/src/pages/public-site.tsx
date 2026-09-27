import { Suspense, lazy, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { Download, Package, Plus, ShoppingBag, Store } from 'lucide-react';
import { Button } from '@workspace/maximus-design-system/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@workspace/maximus-design-system/components/ui/dropdown-menu';
import { publicSiteApi, type PublicImmobilierBootstrap, type PublicSiteBootstrap, type PublicSiteModule } from '@/lib/public-site-api';
import { publicEcommerceApi, type PublicShopBootstrap } from '@/lib/ecommerce-api';
import {
  canInstallPwa,
  clientSitePwaBasePath,
  isIosDevice,
  isStandalonePwa,
  mountClientManifest,
  promptPwaInstall,
  subscribeToPwaInstall,
} from '@/lib/pwa';

const PublicShopPage = lazy(() => import('./public-shop'));
const PublicTransportPage = lazy(() =>
  import('./public-shop').then(module => ({ default: module.TransportPublicPage })),
);
const PublicImmobilierPage = lazy(() =>
  import('./public-shop').then(module => ({ default: module.PublicImmobilierPage })),
);

type Props = {
  domain?: boolean;
  slug?: string;
  clientApp?: boolean;
};

export default function PublicSitePage({ domain = false, slug, clientApp = false }: Props) {
  const [pathname, setLocation] = useLocation();
  const search = useSearch();
  const basePath = clientApp
    ? clientSitePwaBasePath(slug, domain)
    : slug ? `/site/${encodeURIComponent(slug)}` : '';
  const legacyBasePath = slug ? `/shop/${encodeURIComponent(slug)}` : '';
  const isLegacyPath = Boolean(
    !clientApp
    && legacyBasePath
    && (pathname === legacyBasePath || pathname.startsWith(`${legacyBasePath}/`)),
  );
  const routeBasePath = isLegacyPath ? legacyBasePath : basePath;
  const routePath = normalizeModulePath(pathname, routeBasePath);
  const paymentReturn = new URLSearchParams(search).has('payment');
  const [bootstrap, setBootstrap] = useState<PublicSiteBootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [storefront, setStorefront] = useState<PublicShopBootstrap | null>(null);
  const [storefrontLoading, setStorefrontLoading] = useState(false);
  const [storefrontError, setStorefrontError] = useState('');
  const [heroIndex, setHeroIndex] = useState(0);
  const [installAvailable, setInstallAvailable] = useState(false);
  const [manifestReady, setManifestReady] = useState(false);
  const [manifestError, setManifestError] = useState('');
  const [installHelp, setInstallHelp] = useState('');

  const siteManifestUrl = bootstrap?.available
    ? domain
      ? '/api/public-site/manifest.webmanifest'
      : `/api/public-site/manifest.webmanifest/${encodeURIComponent(slug ?? bootstrap.brand.slug)}`
    : null;

  useEffect(() => {
    if (!isLegacyPath) return;
    const suffix = pathname.slice(legacyBasePath.length).replace(/\/+$/, '');
    setLocation(`${basePath}${suffix}${window.location.search}${window.location.hash}`);
  }, [basePath, isLegacyPath, legacyBasePath, pathname, setLocation]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [routePath]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const request = slug
      ? publicSiteApi.bootstrapSlug(slug)
      : publicSiteApi.bootstrapDomain();
    void request
      .then(result => {
        if (!cancelled) setBootstrap(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Le site public est indisponible.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [domain, slug]);

  useEffect(() => subscribeToPwaInstall(() => {
    const available = canInstallPwa();
    setInstallAvailable(available);
    if (available) setInstallHelp('');
  }), []);

  useEffect(() => {
    if (!siteManifestUrl) {
      setManifestReady(false);
      return undefined;
    }

    let cancelled = false;
    let cleanup: (() => void) | undefined;
    setManifestReady(false);
    setManifestError('');
    setInstallHelp('');
    void mountClientManifest(siteManifestUrl)
      .then(unmount => {
        if (cancelled) {
          unmount();
          return;
        }
        cleanup = unmount;
        setManifestReady(true);
      })
      .catch(cause => {
        if (!cancelled) {
          console.warn('Le manifeste PWA du site public n’a pas pu être validé.', cause);
          setManifestError('Le fichier d’installation du site n’a pas pu être vérifié.');
        }
      });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [siteManifestUrl]);

  useEffect(() => {
    const hasEcommerce = bootstrap?.available
      && bootstrap.modules.some(module => module.id === 'ecommerce');
    const hasStoreKey = Boolean(bootstrap?.available && bootstrap.storeSlug);
    const needsCompanySiteCapabilities = ['/', '/transport', '/immobilier'].includes(routePath);
    if (!bootstrap?.available || !hasEcommerce || !hasStoreKey) {
      setStorefront(null);
      setStorefrontLoading(false);
      setStorefrontError('');
      return undefined;
    }
    if (paymentReturn || !needsCompanySiteCapabilities) return undefined;

    let cancelled = false;
    setStorefrontError('');
    setStorefrontLoading(true);
    const request = domain
      ? publicEcommerceApi.bootstrapDomain()
      : publicEcommerceApi.bootstrap(bootstrap.storeSlug ?? '');
    void request
      .then(result => {
        if (!('store' in result)) {
          throw new Error('La boutique publique n’est pas disponible.');
        }
        if (!cancelled) setStorefront(result);
      })
      .catch(() => {
        if (!cancelled) setStorefrontError('Les produits de la boutique ne sont pas disponibles pour le moment.');
      })
      .finally(() => {
        if (!cancelled) setStorefrontLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bootstrap, domain, paymentReturn, routePath]);

  useEffect(() => {
    setHeroIndex(0);
    if (!bootstrap?.available || routePath !== '/' || paymentReturn || bootstrap.brand.heroImages.length < 2) return undefined;
    const interval = window.setInterval(() => {
      setHeroIndex(current => (current + 1) % bootstrap.brand.heroImages.length);
    }, 4000);
    return () => window.clearInterval(interval);
  }, [bootstrap, paymentReturn, routePath]);

  useEffect(() => {
    if (!bootstrap?.available) return;
    const sectionTitle = routePath === '/transport'
      ? 'Transport'
      : routePath === '/immobilier'
        ? 'Immobilier'
        : routePath === '/boutique'
          ? 'Boutique'
          : routePath === '/location'
            ? 'Location'
            : routePath !== '/'
              ? 'Boutique'
              : 'Site public';
    const title = `${sectionTitle} | ${bootstrap.brand.name}`;
    const description = bootstrap.brand.description.trim()
      || `Consultez le site public de ${bootstrap.company.name} : services, modules et annonces publiées par l’entreprise.`;
    const pagePath = `${basePath}${routePath === '/' ? '' : routePath}` || '/';
    const canonicalUrl = `${window.location.origin}${pagePath}`;
    const previousTitle = document.title;
    document.title = title;
    const restoreMeta = [
      setMetaContent('name', 'description', description),
      setMetaContent('property', 'og:title', title),
      setMetaContent('property', 'og:description', description),
      setMetaContent('property', 'og:url', canonicalUrl),
      setMetaContent('property', 'og:type', 'website'),
      setMetaContent('name', 'twitter:card', 'summary_large_image'),
      setMetaContent('name', 'twitter:title', title),
      setMetaContent('name', 'twitter:description', description),
    ];
    if (bootstrap.brand.logoUrl) {
      const logoUrl = new URL(bootstrap.brand.logoUrl, window.location.origin).toString();
      restoreMeta.push(setMetaContent('property', 'og:image', logoUrl));
      restoreMeta.push(setMetaContent('name', 'twitter:image', logoUrl));
    }
    const existingCanonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const previousCanonical = existingCanonical?.getAttribute('href') ?? null;
    const canonical = existingCanonical ?? document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', canonicalUrl);
    if (!existingCanonical) document.head.appendChild(canonical);
    return () => {
      document.title = previousTitle;
      restoreMeta.reverse().forEach(restore => restore());
      if (existingCanonical) {
        if (previousCanonical === null) existingCanonical.removeAttribute('href');
        else existingCanonical.setAttribute('href', previousCanonical);
      } else {
        canonical.remove();
      }
    };
  }, [bootstrap, basePath, routePath]);

  const publicSiteHomePath = basePath ? `${basePath.replace(/\/+$/, '')}/` : '/';
  const returnToSite = () => {
    window.location.assign(publicSiteHomePath);
  };
  const installPublicSite = async () => {
    if (isIosDevice()) {
      setInstallHelp('Sur iPhone ou iPad, touchez Partager, puis « Sur l’écran d’accueil ».');
      return;
    }
    if (manifestError) {
      setInstallHelp('Le fichier d’installation n’a pas été validé. Rechargez la vitrine puis réessayez.');
      return;
    }
    if (!manifestReady) {
      setInstallHelp('La préparation de l’installation est en cours. Réessayez dans un instant.');
      return;
    }
    if (!canInstallPwa()) {
      setInstallHelp('Ce navigateur n’a pas ouvert la fenêtre d’installation. Utilisez le menu de Chrome puis « Installer l’application ».');
      return;
    }
    try {
      const installed = await promptPwaInstall();
      setInstallHelp(installed
        ? 'La vitrine a été installée.'
        : 'L’installation n’a pas été confirmée. Touchez à nouveau sur Installer pour réessayer.');
    } catch {
      setInstallHelp('Le navigateur n’a pas pu ouvrir l’installation. Réessayez depuis le menu de Chrome.');
    }
  };

  if (loading) {
    return <PublicSiteMessage title="Chargement du site public…" testId="status-public-site-loading" />;
  }
  if (error) {
    return <PublicSiteMessage title={error} testId="status-public-site-error" />;
  }
  if (!bootstrap?.available) {
    return <PublicSiteMessage title="Ce site public n’est pas disponible." testId="status-public-site-unavailable" />;
  }

  const modules = bootstrap.modules;
  const installPrompt = !isStandalonePwa()
    ? (
      <PublicSiteInstallPrompt
        brandName={bootstrap.brand.name}
        installAvailable={installAvailable}
        manifestReady={manifestReady}
        manifestError={manifestError}
        help={installHelp}
        onInstall={() => void installPublicSite()}
      />
    )
    : null;
  const ecommerce = modules.find(module => module.id === 'ecommerce');
  const transport = modules.find(module => module.id === 'transport');
  const immobilier = modules.find(module => module.id === 'immobilier');
  const companySite = {
    companyName: bootstrap.brand.name,
    homePath: clientApp ? publicSiteHomePath : basePath || '/',
    modules,
    brandLogoUrl: bootstrap.brand.logoUrl,
    description: bootstrap.brand.description,
    heroImages: bootstrap.brand.heroImages,
    singlePageLanding: routePath === '/' && !paymentReturn,
  };
  const storefrontForBrand = storefront?.store.slug === bootstrap.storeSlug ? storefront : null;

  if (routePath === '/transport' && transport) {
    return (
      <PublicCompanySiteShell
        companyName={bootstrap.company.name}
        brand={bootstrap.brand}
        modules={modules}
        basePath={basePath}
        activePath={routePath}
        installPrompt={installPrompt}
      >
        <Suspense fallback={<PublicSiteMessage title="Chargement du module Transport…" testId="status-public-transport-loading" />}>
          <PublicTransportPage
            store={{
              name: bootstrap.company.name,
              currency: bootstrap.company.currency ?? 'XOF',
            }}
            slug={domain ? undefined : bootstrap.storeSlug ?? slug}
            domain={domain}
            onBack={returnToSite}
          />
        </Suspense>
      </PublicCompanySiteShell>
    );
  }

  if (routePath === '/immobilier' && immobilier) {
    return (
      <PublicCompanySiteShell
        companyName={bootstrap.company.name}
        brand={bootstrap.brand}
        modules={modules}
        basePath={basePath}
        activePath={routePath}
        installPrompt={installPrompt}
      >
        <PublicSiteImmobilier
          domain={domain}
          slug={domain ? undefined : bootstrap.storeSlug ?? slug}
          module={immobilier}
          companyName={bootstrap.company.name}
          currency={bootstrap.company.currency ?? 'XOF'}
          onBack={returnToSite}
        />
      </PublicCompanySiteShell>
    );
  }

  if (ecommerce && (routePath !== '/' || paymentReturn || Boolean(bootstrap.storeSlug))) {
    if (!bootstrap.storeSlug) {
      return (
        <PublicCompanySiteShell
          companyName={bootstrap.company.name}
          brand={bootstrap.brand}
          modules={modules}
          basePath={basePath}
          activePath={routePath}
          installPrompt={installPrompt}
        >
          <PublicSiteMessage
            title="La boutique publique n’est pas disponible."
            testId="status-public-site-shop-unavailable"
            action={<Button type="button" variant="outline" onClick={returnToSite}>Retour au site</Button>}
          />
        </PublicCompanySiteShell>
      );
    }
    return (
      <Suspense fallback={<PublicSiteMessage title="Chargement de la boutique…" testId="status-public-ecommerce-loading" />}>
        <PublicShopPage
          slug={domain ? undefined : bootstrap.storeSlug}
          domain={domain}
          companySite={companySite}
          siteInstallPrompt={installPrompt}
        />
      </Suspense>
    );
  }

  if (routePath !== '/') {
    return (
      <PublicCompanySiteShell
        companyName={bootstrap.company.name}
        brand={bootstrap.brand}
        modules={modules}
        basePath={basePath}
        activePath={routePath}
        installPrompt={installPrompt}
      >
        <PublicSiteMessage
          title="Cette page n’est pas publiée sur le site de l’entreprise."
          testId="status-public-site-page-unavailable"
          action={<Button type="button" variant="outline" onClick={returnToSite}>Retour au site</Button>}
        />
      </PublicCompanySiteShell>
    );
  }

  return (
    <PublicCompanySiteShell
      companyName={bootstrap.company.name}
      brand={bootstrap.brand}
      modules={modules}
      basePath={basePath}
      activePath="/"
      installPrompt={installPrompt}
    >
      <main id="public-site-section-home" className="min-h-[calc(100dvh-5rem)] scroll-mt-24 bg-[hsl(var(--background))] px-5 py-8 text-[hsl(var(--foreground))] sm:px-8 sm:py-12" data-testid="page-public-site-home">
        <section className="mx-auto max-w-6xl">
          {bootstrap.brand.heroImages.length > 0 && (
            <div
              className="mb-8 overflow-hidden rounded-3xl"
              role="region"
              aria-label="Images du site"
              aria-roledescription="carousel"
              data-testid="gallery-public-site-hero"
            >
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${heroIndex * 100}%)` }}
              >
                {bootstrap.brand.heroImages.map((image, index) => (
                  <img
                    key={`${image}-${index}`}
                    src={image}
                    alt=""
                    className="aspect-[16/7] max-h-[28rem] w-full shrink-0 object-cover"
                    data-testid={`image-public-site-hero-${index}`}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="max-w-3xl">
            <p
              className="mono text-xs font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]"
              style={validBrandColor(bootstrap.brand.primaryColor) ? { color: bootstrap.brand.primaryColor } : undefined}
            >
              Site officiel de l’entreprise
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight tracking-[-.04em] sm:text-5xl" data-testid="title-public-site-company">
              {bootstrap.brand.name}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[hsl(var(--muted-foreground))]" data-testid="text-public-site-description">
              {bootstrap.brand.description || `Découvrez les activités et services de ${bootstrap.company.name}.`}
            </p>
          </div>

          {ecommerce && (
            <section id="public-site-section-ecommerce" className="mt-12 scroll-mt-24" aria-labelledby="title-public-site-products" data-testid="section-public-site-products">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="mono text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Boutique</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-[-.03em] sm:text-3xl" id="title-public-site-products">
                    Tous les produits
                  </h2>
                </div>
                <Button asChild variant="outline">
                  <Link href={`${basePath}/boutique`} data-testid="link-public-site-products-shop">
                    Voir la boutique
                  </Link>
                </Button>
              </div>
              {storefrontLoading ? (
                <p className="rounded-xl border bg-[hsl(var(--card))] px-4 py-5 text-sm text-[hsl(var(--muted-foreground))]" role="status">
                  Chargement des produits…
                </p>
              ) : storefrontError ? (
                <p className="rounded-xl border bg-[hsl(var(--card))] px-4 py-5 text-sm text-[hsl(var(--muted-foreground))]" role="status" data-testid="status-public-site-products-error">
                  {storefrontError}
                </p>
              ) : !bootstrap.storeSlug ? (
                <p className="rounded-xl border bg-[hsl(var(--card))] px-4 py-5 text-sm text-[hsl(var(--muted-foreground))]" role="status">
                  Aucune boutique publiée n’est associée à ce site.
                </p>
              ) : storefrontForBrand && storefrontForBrand.products.length === 0 ? (
                <p className="rounded-xl border bg-[hsl(var(--card))] px-4 py-5 text-sm text-[hsl(var(--muted-foreground))]" role="status">
                  Aucun produit publié pour le moment.
                </p>
              ) : storefrontForBrand ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4" data-testid="grid-public-site-products">
                  {storefrontForBrand.products.map(product => (
                    <Link
                      key={product.slug}
                      href={`${basePath}/produit/${encodeURIComponent(product.slug)}`}
                      className="group overflow-hidden rounded-2xl border bg-[hsl(var(--card))] transition-shadow hover:shadow-md"
                      data-testid={`card-public-site-product-${product.slug}`}
                    >
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          loading="lazy"
                          className="aspect-[4/3] w-full bg-[hsl(var(--muted))] object-cover"
                        />
                      ) : (
                        <div className="flex aspect-[4/3] w-full items-center justify-center bg-[hsl(var(--muted))] px-3 text-center text-sm text-[hsl(var(--muted-foreground))]">
                          {product.name}
                        </div>
                      )}
                      <div className="p-3 sm:p-4">
                        <h3 className="line-clamp-2 min-h-10 text-sm font-semibold group-hover:text-[hsl(var(--primary))] sm:text-base">
                          {product.name}
                        </h3>
                        <p className="mt-2 text-sm font-bold">
                          {new Intl.NumberFormat('fr-FR', {
                            maximumFractionDigits: storefrontForBrand.store.currency === 'XOF' ? 0 : 2,
                          }).format(product.price)}{' '}
                          {storefrontForBrand.store.currency}
                        </p>
                        {product.stock <= 0 && (
                          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Indisponible</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : null}
            </section>
          )}

          {immobilier && (
            <section id="public-site-section-immobilier" className="mt-12 scroll-mt-24" aria-labelledby="title-public-site-immobilier">
              <div className="mb-5">
                <p className="mono text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Service</p>
                <h2 id="title-public-site-immobilier" className="mt-2 text-2xl font-bold tracking-[-.03em] sm:text-3xl">Immobilier</h2>
              </div>
              <PublicSiteImmobilier
                domain={domain}
                slug={domain ? undefined : bootstrap.storeSlug ?? slug}
                module={immobilier}
                companyName={bootstrap.company.name}
                currency={bootstrap.company.currency ?? 'XOF'}
                onBack={() => document.getElementById('public-site-section-home')?.scrollIntoView({ behavior: 'smooth' })}
              />
            </section>
          )}

        </section>
      </main>
    </PublicCompanySiteShell>
  );
}

function PublicSiteInstallPrompt({
  brandName,
  installAvailable,
  manifestReady,
  manifestError,
  help,
  onInstall,
}: {
  brandName: string;
  installAvailable: boolean;
  manifestReady: boolean;
  manifestError: string;
  help: string;
  onInstall: () => void;
}) {
  const ios = isIosDevice();
  return (
    <aside
      className="mb-4 flex flex-col gap-3 rounded-xl border bg-[hsl(var(--card))] p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      data-testid="banner-public-site-install"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--primary))]" aria-hidden="true">
          <Download size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold">Installer {brandName}</p>
          <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
            {ios
              ? 'Touchez Installer pour afficher les étapes d’ajout à l’écran d’accueil dans Safari.'
              : installAvailable && manifestReady
                ? 'Touchez Installer pour ouvrir la fenêtre native du navigateur.'
                : 'Touchez Installer pour lancer la demande directement depuis le navigateur.'
            }
          </p>
          {!manifestReady && !manifestError && <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]" role="status">Préparation de l’installation…</p>}
          {manifestError && <p className="mt-1 text-xs font-medium text-red-700" role="alert">{manifestError} Vous pouvez aussi réessayer depuis le menu du navigateur.</p>}
          {help && <p className="mt-1 text-xs font-medium text-[hsl(var(--primary))]" role="status">{help}</p>}
        </div>
      </div>
      <Button type="button" variant="outline" className="shrink-0" onClick={onInstall}>
        <Download size={16} className="mr-2" />
        Installer l’application
      </Button>
    </aside>
  );
}

function PublicCompanySiteShell({
  companyName,
  brand,
  modules,
  basePath,
  activePath,
  installPrompt,
  children,
}: {
  companyName: string;
  brand: Extract<PublicSiteBootstrap, { available: true }>['brand'];
  modules: PublicSiteModule[];
  basePath: string;
  activePath: string;
  installPrompt: ReactNode;
  children: ReactNode;
}) {
  const [, setLocation] = useLocation();
  const siteBasePath = basePath.replace(/\/+$/, '');
  const homeHref = siteBasePath ? `${siteBasePath}/` : '/';
  const hasEcommerce = modules.some(module => module.id === 'ecommerce');
  const primaryColor = validBrandColor(brand.primaryColor) ? brand.primaryColor : undefined;
  const activePathNormalized = activePath.replace(/\/+$/, '') || '/';
  const navigationItems = [
    {
      key: 'home',
      label: 'Accueil',
      href: homeHref,
      active: activePathNormalized === '/',
      testId: 'link-public-site-nav-home',
      icon: Store,
    },
    ...modules.filter(module => module.id !== 'transport').map(module => {
      const modulePath = module.id === 'ecommerce' && module.path === '/' ? '/boutique' : module.path;
      const active = activePathNormalized === modulePath
        || (modulePath !== '/' && activePathNormalized.startsWith(`${modulePath}/`));
      return {
        key: `module-${module.id}`,
        label: module.id === 'ecommerce' ? 'Boutique' : module.label,
        href: `${siteBasePath}${modulePath}` || '/',
        active,
        testId: `link-public-site-nav-module-${module.id}`,
        icon: module.id === 'ecommerce' ? Package : Store,
      };
    }),
    ...(hasEcommerce
      ? [
        {
          key: 'cart',
          label: 'Panier',
          href: `${siteBasePath}/panier`,
          active: activePathNormalized === '/panier' || activePathNormalized.startsWith('/panier/'),
          testId: 'link-public-site-nav-cart',
          icon: ShoppingBag,
        },
        {
          key: 'signin',
          label: 'Se connecter',
          href: `${siteBasePath}/connexion`,
          active: activePathNormalized === '/connexion',
          testId: 'link-public-site-nav-signin',
          icon: Store,
        },
      ]
      : []),
  ];
  const primaryKeys = hasEcommerce
    ? new Set(['home', 'module-ecommerce', 'cart'])
    : new Set(['home', ...modules.slice(0, 2).map(module => `module-${module.id}`)]);
  const primaryMobileItems = navigationItems.filter(item => primaryKeys.has(item.key));
  const moreMobileItems = navigationItems.filter(item => !primaryKeys.has(item.key));
  const moreIsActive = moreMobileItems.some(item => item.active);
  const mobileGridClass = moreMobileItems.length > 0
    ? 'grid-cols-4'
    : primaryMobileItems.length === 3
      ? 'grid-cols-3'
      : primaryMobileItems.length === 2
        ? 'grid-cols-2'
        : 'grid-cols-1';
  const itemClass = (active: boolean) => `flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-semibold transition sm:text-xs ${
    active
      ? 'bg-[hsl(var(--muted)/.5)] text-[hsl(var(--foreground))]'
      : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.5)] hover:text-[hsl(var(--foreground))]'
  }`;
  const mobileNavContainerClass = `mx-auto grid max-w-2xl ${mobileGridClass} gap-1 px-2 pt-1`;

  return (
    <div className="min-h-[100dvh] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <header className="sticky top-0 z-30 border-b bg-[hsl(var(--card))]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <Link href={homeHref} className="flex min-w-0 items-center gap-3" data-testid="link-public-site-home">
            {brand.logoUrl ? (
              <img
                src={brand.logoUrl}
              alt={`Logo de ${brand.name}`}
                className="h-11 w-11 shrink-0 rounded-xl border bg-[hsl(var(--background))] object-contain p-1"
                data-testid="image-public-site-company-logo"
              />
            ) : (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--muted))] text-lg font-bold" aria-hidden="true">
                {brand.name.slice(0, 1).toLocaleUpperCase('fr')}
              </span>
            )}
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Site officiel de {companyName}</span>
              <span className="block truncate text-sm font-bold sm:text-base" data-testid="title-public-site-nav-company">{brand.name}</span>
            </span>
          </Link>

          <nav aria-label="Navigation du site de l’entreprise" className="hidden max-w-full gap-1 overflow-x-auto pb-1 lg:flex lg:justify-end lg:pb-0" data-testid="nav-public-site">
            {navigationItems.map(item => (
              <Link
                key={item.key}
                href={item.href}
                aria-current={item.active ? 'page' : undefined}
                className={`shrink-0 rounded-lg border-b-2 px-3 py-2 text-xs font-semibold transition sm:text-sm ${item.active ? 'bg-[hsl(var(--muted)/.5)]' : 'border-transparent text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.5)] hover:text-[hsl(var(--foreground))]'}`}
                style={item.active && primaryColor ? { color: primaryColor, borderColor: primaryColor } : undefined}
                data-testid={item.testId}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        {installPrompt && (
          <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
            {installPrompt}
          </div>
        )}
        {children}
        <footer className="border-t px-5 py-5 text-center text-xs text-[hsl(var(--muted-foreground))] sm:px-8">
          Site public de {companyName}
        </footer>
      </div>
      <nav
        aria-label="Navigation mobile du site de l’entreprise"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-[hsl(var(--card))] pb-[env(safe-area-inset-bottom)] shadow-md lg:hidden"
        data-testid="nav-public-site-mobile"
      >
        <div className={mobileNavContainerClass}>
          {primaryMobileItems.map(item => {
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={item.active ? 'page' : undefined}
                className={itemClass(item.active)}
                style={item.active && primaryColor ? { color: primaryColor } : undefined}
                data-testid={`${item.testId}-mobile`}
              >
                <Icon size={18} strokeWidth={2} aria-hidden="true" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
          {moreMobileItems.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={moreIsActive ? 'Plus, une page est sélectionnée' : 'Plus de pages'}
                  className={itemClass(moreIsActive)}
                  style={moreIsActive && primaryColor ? { color: primaryColor } : undefined}
                  data-testid="button-public-site-mobile-more"
                >
                  <Plus size={18} strokeWidth={2} aria-hidden="true" />
                  <span>Plus</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="mb-2 min-w-48">
                {moreMobileItems.map(item => (
                  <DropdownMenuItem
                    key={item.key}
                    onSelect={() => setLocation(item.href)}
                    style={item.active && primaryColor ? { color: primaryColor } : undefined}
                    data-testid={`${item.testId}-mobile`}
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </nav>
    </div>
  );
}

function PublicSiteImmobilier({
  domain,
  slug,
  module,
  companyName,
  currency,
  onBack,
}: {
  domain: boolean;
  slug?: string;
  module: PublicSiteModule;
  companyName: string;
  currency: string;
  onBack: () => void;
}) {
  const [bootstrap, setBootstrap] = useState<PublicImmobilierBootstrap | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    listingId: '',
    requestType: 'CONTACT' as 'CONTACT' | 'VISIT',
    name: '',
    email: '',
    phone: '',
    preferredDate: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBootstrap(null);
    setError('');
    const request = slug
      ? publicSiteApi.immobilierBootstrapSlug(slug)
      : publicSiteApi.immobilierBootstrapDomain();
    void request
      .then(result => {
        if (!cancelled) setBootstrap(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'La vitrine immobilière est indisponible.');
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) return <PublicSiteMessage title={error} testId="status-public-immobilier-error" action={<Button variant="outline" onClick={onBack}>Retour au site</Button>} />;
  if (!bootstrap) return <PublicSiteMessage title="Chargement des annonces immobilières…" testId="status-public-immobilier-loading" />;
  if (!bootstrap.available) return <PublicSiteMessage title="La vitrine immobilière n’est pas disponible." testId="status-public-immobilier-unavailable" action={<Button variant="outline" onClick={onBack}>Retour au site</Button>} />;

  const store = { name: bootstrap.company.name || companyName, currency };
  return (
    <main
      className="min-h-[100dvh] bg-[hsl(var(--background))] px-4 py-5 text-[hsl(var(--foreground))] sm:px-8 sm:py-8"
      style={{
        '--shop-primary': 'hsl(var(--primary))',
        '--shop-accent': 'hsl(var(--primary))',
        '--shop-primary-foreground': 'hsl(var(--primary-foreground))',
        '--shop-accent-foreground': 'hsl(var(--primary-foreground))',
      } as CSSProperties}
      data-testid={`page-public-site-module-${module.id}`}
    >
      <div className="mx-auto max-w-6xl">
        <Button type="button" variant="ghost" onClick={onBack} className="mb-5">
          ← Retour au site
        </Button>
        <Suspense fallback={<PublicSiteMessage title="Chargement de la vitrine…" testId="status-public-immobilier-page-loading" />}>
          <PublicImmobilierPage
            listings={bootstrap.listings}
            store={store as Pick<PublicShopBootstrap['store'], 'name' | 'currency'>}
            slug={slug}
            domain={domain}
            form={form}
            setForm={setForm}
            submitted={submitted}
            onSubmitted={() => setSubmitted(true)}
          />
        </Suspense>
      </div>
    </main>
  );
}

function PublicSiteMessage({
  title,
  testId,
  action,
}: {
  title: string;
  testId: string;
  action?: ReactNode;
}) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))] p-6 text-[hsl(var(--foreground))]">
      <section className="card-surface w-full max-w-lg rounded-2xl p-7 text-center" role="status" data-testid={testId}>
        <h1 className="text-lg font-bold">{title}</h1>
        {action && <div className="mt-5 flex justify-center">{action}</div>}
      </section>
    </main>
  );
}

function normalizeModulePath(pathname: string, basePath: string): string {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (!basePath) return normalized;
  if (normalized === basePath) return '/';
  return normalized.startsWith(`${basePath}/`) ? normalized.slice(basePath.length) : normalized;
}

function validBrandColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function setMetaContent(
  attribute: 'name' | 'property',
  key: string,
  value: string,
): () => void {
  const existing = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (existing) {
    const previous = existing.getAttribute('content');
    existing.setAttribute('content', value);
    return () => {
      if (previous === null) existing.removeAttribute('content');
      else existing.setAttribute('content', previous);
    };
  }
  const created = document.createElement('meta');
  created.setAttribute(attribute, key);
  created.setAttribute('content', value);
  document.head.appendChild(created);
  return () => created.remove();
}