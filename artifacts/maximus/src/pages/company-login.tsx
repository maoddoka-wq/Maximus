import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { Building2, LogIn, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@workspace/maximus-design-system/components/ui/button';
import { Input } from '@workspace/maximus-design-system/components/ui/input';
import { Label } from '@workspace/maximus-design-system/components/ui/label';
import { Skeleton } from '@workspace/maximus-design-system/components/ui/skeleton';
import { Alert, AlertDescription } from '@workspace/maximus-design-system/components/ui/alert';
import { AuthCard, AuthLayout } from '@/components/auth-layout';
import { authApi, type AuthUser, type PublicCompanyLogin } from '@/lib/auth-api';
import type { InstallationProfile } from '@/lib/installation-api';

function readableColor(hex: string): string {
  const value = hex.replace('#', '');
  if (value.length !== 6) return '#FFFFFF';
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return red * 299 + green * 587 + blue * 114 > 150000 ? '#161D27' : '#FFFFFF';
}

function companyInitials(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return initials || 'EN';
}

function faviconForCompany(name: string, color: string): string {
  const safeColor = /^#[0-9a-f]{6}$/i.test(color) ? color : '#F2B705';
  const initials = companyInitials(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${safeColor}"/><text x="32" y="39" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" font-weight="700" fill="${readableColor(safeColor)}">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

type CompanyLoginProps = {
  onAuthenticated: (user: AuthUser) => void;
} & (
  | { slug: string; installationCompany?: never }
  | { slug?: never; installationCompany: NonNullable<InstallationProfile['company']> }
);

export function CompanyLoginPage({ slug, installationCompany, onAuthenticated }: CompanyLoginProps) {
  const [company, setCompany] = useState<PublicCompanyLogin | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [retry, setRetry] = useState(0);
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError('');
    setCompany(null);
    setPassword('');
    if (installationCompany) {
      setCompany({ ...installationCompany, slug: installationCompany.slug ?? '' });
      setLoading(false);
      return;
    }
    setLoading(true);
    void authApi.companyLoginInfo(slug!)
      .then(({ company: nextCompany }) => {
        if (!cancelled) setCompany(nextCompany);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Cette connexion est indisponible.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, installationCompany, retry]);

  useEffect(() => {
    const previousTitle = document.title;
    const previousThemeColor = document.querySelector('meta[name="theme-color"]')?.getAttribute('content');
    const favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    const previousFavicon = favicon?.getAttribute('href');
    const previousFaviconType = favicon?.getAttribute('type');
    const companyName = company?.name ?? installationCompany?.name ?? (slug ? slug.replace(/-/g, ' ') : 'Entreprise');
    const companyColor = company?.primaryColor ?? installationCompany?.primaryColor ?? '#F2B705';
    const companyFavicon = company?.profilePhoto
      ? new URL(company.profilePhoto, window.location.origin).href
      : faviconForCompany(companyName, companyColor);

    document.title = `${companyName} — Connexion`;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', companyColor);
    if (favicon) {
      favicon.href = companyFavicon;
      favicon.removeAttribute('type');
    }

    return () => {
      document.title = previousTitle;
      const themeColor = document.querySelector('meta[name="theme-color"]');
      if (themeColor && previousThemeColor) themeColor.setAttribute('content', previousThemeColor);
      if (favicon) {
        if (previousFavicon) favicon.href = previousFavicon;
        if (previousFaviconType) favicon.type = previousFaviconType;
      }
    };
  }, [company, installationCompany, slug]);

  const primary = company?.primaryColor ?? '#F2B705';
  const foreground = useMemo(() => readableColor(primary), [primary]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (pending || !company) return;
    setError('');
    setPending(true);
    const login = installationCompany
      ? authApi.login(email, password)
      : authApi.companyLogin(slug!, email, password);
    void login
      .then(({ user }) => onAuthenticated(user))
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'La connexion a échoué.'))
      .finally(() => setPending(false));
  };

  if (loading) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[hsl(var(--background))] p-6" aria-busy="true" aria-label="Chargement de votre espace">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </main>
    );
  }

  const companyName = company?.name ?? installationCompany?.name ?? 'Espace entreprise';
  const logo = (size: 'sm' | 'lg') => company?.profilePhoto ? (
    <img src={company.profilePhoto} alt={`Logo de ${companyName}`} className={`${size === 'lg' ? 'h-14 w-14 rounded-2xl' : 'h-11 w-11 rounded-xl'} object-cover ring-1 ring-[hsl(var(--border))]`} />
  ) : (
    <span className={`flex items-center justify-center font-black ${size === 'lg' ? 'h-14 w-14 rounded-2xl text-lg' : 'h-11 w-11 rounded-xl text-sm'}`} style={{ backgroundColor: primary, color: foreground }}>
      {companyInitials(companyName)}
    </span>
  );

  return (
    <AuthLayout
      testId="page-company-login"
      showcaseStyle={company?.sidebarColor ? { backgroundColor: company.sidebarColor } : undefined}
      showcase={
        <>
          <div className="flex items-center gap-3">
            {logo('lg')}
            <div className="min-w-0">
              <p className="truncate text-lg font-bold">{companyName}</p>
              <p className="text-sm text-[hsl(var(--sidebar-foreground)/.6)]">Espace sécurisé de gestion</p>
            </div>
          </div>
          <div className="mt-auto max-w-xl pt-16">
            <span aria-hidden="true" className="block h-1 w-16 rounded-full" style={{ backgroundColor: primary }} />
            <h2 className="mt-8 text-5xl font-bold leading-[1.02] tracking-[-.055em] xl:text-6xl">Bienvenue dans votre espace.</h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-[hsl(var(--sidebar-foreground)/.68)]">
              Retrouvez vos équipes, vos opérations et les outils autorisés par votre entreprise.
            </p>
          </div>
          <p className="mono mt-12 flex items-center gap-2 text-[10px] uppercase tracking-[.18em] text-[hsl(var(--sidebar-foreground)/.5)]">
            <Building2 size={13} aria-hidden="true" />
            {installationCompany ? `Espace privé · ${companyName}` : 'Connexion sécurisée par MAXIMUS'}
          </p>
        </>
      }
    >
      <div className="mb-6 flex items-center gap-3 lg:hidden">
        {logo('sm')}
        <p className="min-w-0 truncate font-bold">{companyName}</p>
      </div>
      <AuthCard
        eyebrow="Connexion entreprise"
        eyebrowStyle={{ color: primary }}
        title="Accédez à votre espace"
        description="Utilisez les identifiants fournis par l’administrateur de votre entreprise."
        footer={
          <div className="space-y-3 text-sm text-[hsl(var(--muted-foreground))]">
            {installationCompany && (
              <>
                <Button type="button" variant="link" size="sm" aria-expanded={showRecovery} onClick={() => setShowRecovery((value) => !value)} className="h-auto min-h-0 px-0 text-[hsl(var(--foreground))]">
                  Besoin d’aide pour vous connecter ?
                </Button>
                {showRecovery && (
                  <Alert>
                    <AlertDescription className="text-xs leading-5">
                      Contactez l’administrateur de votre entreprise. Si son accès est également perdu,
                      le responsable du serveur dispose d’une procédure locale de récupération sécurisée.
                      Les identifiants MAXIMUS central ne permettent pas de se connecter ici.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
            <p className="flex items-center justify-center gap-2 text-xs lg:hidden">
              <Building2 size={14} aria-hidden="true" />
              {installationCompany ? `Espace privé · ${companyName}` : 'Connexion sécurisée par MAXIMUS'}
            </p>
          </div>
        }
      >
        {error && (
          <Alert variant="destructive" className="mb-5">
            <ShieldAlert size={16} />
            <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
          </Alert>
        )}
        {!company ? (
          <Alert>
            <AlertDescription>
              <p className="text-sm">Cette connexion entreprise est indisponible.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setRetry((value) => value + 1)} className="mt-3 gap-2">
                <RefreshCw size={14} aria-hidden="true" />
                Réessayer
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="company-login-email">Adresse email</Label>
              <Input id="company-login-email" data-testid="input-company-login-email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" required autoComplete="username" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-login-password">Mot de passe</Label>
              <Input id="company-login-password" data-testid="input-company-login-password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" required autoComplete="current-password" className="h-11" />
            </div>
            <Button type="submit" size="lg" data-testid="button-company-login" disabled={pending} className="w-full gap-2 font-bold disabled:cursor-wait" style={{ backgroundColor: primary, color: foreground, borderColor: primary } as CSSProperties}>
              <LogIn size={17} aria-hidden="true" />
              {pending ? 'Connexion en cours…' : 'Se connecter'}
            </Button>
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  );
}
