import { Suspense, lazy, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Button } from '@workspace/maximus-design-system/components/ui/button';
import { publicSiteApi, type PublicImmobilierBootstrap, type PublicSiteBootstrap, type PublicSiteModule } from '@/lib/public-site-api';
import type { PublicShopBootstrap } from '@/lib/ecommerce-api';

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
};

export default function PublicSitePage({ domain = false, slug }: Props) {
  const [pathname] = useLocation();
  const search = useSearch();
  const basePath = slug ? `/shop/${encodeURIComponent(slug)}` : '';
  const routePath = normalizeModulePath(pathname, basePath);
  const [bootstrap, setBootstrap] = useState<PublicSiteBootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => {
    if (!bootstrap?.available) return;
    const sectionTitle = routePath === '/transport'
      ? 'Transport'
      : routePath === '/immobilier'
        ? 'Immobilier'
        : routePath !== '/'
          ? 'E-commerce'
          : 'Site public';
    const title = `${sectionTitle} | ${bootstrap.company.name}`;
    const description = `Consultez le site public de ${bootstrap.company.name} : services, modules et annonces publiées par l’entreprise.`;
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
    if (bootstrap.company.logo) {
      const logoUrl = new URL(bootstrap.company.logo, window.location.origin).toString();
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

  const returnToSite = () => {
    window.location.assign(basePath || '/');
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
  const ecommerce = modules.find(module => module.id === 'ecommerce');
  const transport = modules.find(module => module.id === 'transport');
  const immobilier = modules.find(module => module.id === 'immobilier');
  const paymentReturn = new URLSearchParams(search).has('payment');

  if (routePath === '/transport' && transport) {
    return (
      <Suspense fallback={<PublicSiteMessage title="Chargement du module Transport…" testId="status-public-transport-loading" />}>
        <PublicTransportPage
          store={{
            name: bootstrap.company.name,
            currency: bootstrap.company.currency ?? 'XOF',
          }}
          slug={slug}
          domain={domain}
          onBack={returnToSite}
        />
      </Suspense>
    );
  }

  if (routePath === '/immobilier' && immobilier) {
    return <PublicSiteImmobilier domain={domain} slug={slug} module={immobilier} companyName={bootstrap.company.name} currency={bootstrap.company.currency ?? 'XOF'} onBack={returnToSite} />;
  }

  if (ecommerce && (routePath !== '/' || paymentReturn)) {
    return (
      <Suspense fallback={<PublicSiteMessage title="Chargement du module E-commerce…" testId="status-public-ecommerce-loading" />}>
        <PublicShopPage slug={slug} domain={domain} />
      </Suspense>
    );
  }

  if (routePath !== '/') {
    return (
      <PublicSiteMessage
        title="Cette page n’est pas publiée sur le site de l’entreprise."
        testId="status-public-site-page-unavailable"
        action={<Button type="button" variant="outline" onClick={returnToSite}>Retour au site</Button>}
      />
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]" data-testid="page-public-site-home">
      <header className="border-b bg-[hsl(var(--card))]">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-5 sm:px-8">
          {bootstrap.company.logo && (
            <img
              src={bootstrap.company.logo}
              alt=""
              className="h-12 w-12 rounded-xl border bg-white object-contain p-1"
              data-testid="image-public-site-company-logo"
            />
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Site officiel</p>
            <h1 className="mt-1 break-words text-xl font-bold tracking-tight sm:text-2xl" data-testid="title-public-site-company">
              {bootstrap.company.name}
            </h1>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
        <div className="max-w-3xl">
          <p className="mono text-xs font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">
            Espace public de l’entreprise
          </p>
          <h2 className="mt-3 text-3xl font-bold leading-tight tracking-[-.04em] sm:text-5xl">
            Découvrez les services de {bootstrap.company.name}.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[hsl(var(--muted-foreground))]">
            Les pages publiques disponibles sont regroupées sur ce site et restent gérées par leurs modules respectifs.
          </p>
        </div>

        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="list-public-site-modules">
          {modules.map(module => (
            <PublicSiteModuleCard
              key={module.id}
              module={module}
              href={moduleHref(module, basePath)}
            />
          ))}
          {modules.length === 0 && (
            <p className="rounded-2xl border border-dashed p-6 text-sm text-[hsl(var(--muted-foreground))]" data-testid="status-public-site-no-modules">
              Aucun module ne propose actuellement de page publique pour cette entreprise.
            </p>
          )}
        </div>
      </section>
      <footer className="border-t px-5 py-6 text-center text-xs text-[hsl(var(--muted-foreground))] sm:px-8">
        Site public de {bootstrap.company.name}
      </footer>
    </main>
  );
}

function PublicSiteModuleCard({ module, href }: { module: PublicSiteModule; href: string }) {
  const descriptions: Record<string, string> = {
    ecommerce: 'Parcourir la boutique et les services proposés.',
    transport: 'Demander une course et suivre les services Transport.',
    immobilier: 'Consulter les annonces immobilières publiées.',
  };
  return (
    <a
      href={href}
      className="group flex min-h-36 flex-col justify-between rounded-2xl border bg-[hsl(var(--card))] p-5 transition hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/.45)] hover:shadow-md"
      data-testid={`link-public-site-module-${module.id}`}
    >
      <span>
        <span className="block text-lg font-bold">{module.label}</span>
        <span className="mt-2 block text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          {descriptions[module.id] ?? 'Ouvrir la page publique de ce module.'}
        </span>
      </span>
      <span className="mt-5 text-sm font-semibold text-[hsl(var(--primary))]">
        Ouvrir la page <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
      </span>
    </a>
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

function moduleHref(module: PublicSiteModule, basePath: string): string {
  const path = module.id === 'ecommerce' && module.path === '/' ? '/boutique' : module.path;
  return `${basePath}${path === '/' ? '' : path}` || '/';
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