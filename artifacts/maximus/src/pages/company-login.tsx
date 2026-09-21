import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { Building2, LogIn, ShieldAlert } from 'lucide-react';
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
    return <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 p-6 text-sm text-white">Chargement de votre espace…</div>;
  }

  return (
    <main className="min-h-[100dvh] bg-slate-950" style={{ background: `linear-gradient(135deg, ${company?.sidebarColor ?? '#161D27'} 0%, #0f172a 62%, ${primary}33 100%)` }}>
      <div className="mx-auto grid min-h-[100dvh] max-w-6xl items-center gap-10 p-6 lg:grid-cols-[1fr_440px] lg:p-12">
        <section className="hidden text-white lg:block">
          <div className="flex items-center gap-3">
            {company?.profilePhoto ? (
              <img src={company.profilePhoto} alt="" className="h-14 w-14 rounded-2xl object-cover ring-1 ring-white/20" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-black" style={{ backgroundColor: primary, color: foreground }}>
                {companyInitials(company?.name ?? 'EN')}
              </span>
            )}
            <div>
              <p className="text-lg font-bold">{company?.name ?? 'Espace entreprise'}</p>
              <p className="text-sm text-white/60">Espace sécurisé de gestion</p>
            </div>
          </div>
          <h1 className="mt-24 max-w-xl text-6xl font-black leading-[.98] tracking-[-.06em]">
            Bienvenue dans votre espace.
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-white/65">
            Retrouvez vos équipes, vos opérations et les outils autorisés par votre entreprise.
          </p>
        </section>

        <section className="rounded-3xl bg-white p-7 shadow-2xl sm:p-10">
          <div className="flex items-center gap-3 lg:hidden">
            {company?.profilePhoto ? (
              <img src={company.profilePhoto} alt="" className="h-12 w-12 rounded-xl object-cover" />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-black" style={{ backgroundColor: primary, color: foreground }}>
                {companyInitials(company?.name ?? 'EN')}
              </span>
            )}
            <p className="font-bold">{company?.name ?? 'Espace entreprise'}</p>
          </div>
          <div className="mt-8">
            <p className="text-xs font-bold uppercase tracking-[.18em]" style={{ color: primary }}>Connexion entreprise</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-.04em]">Accédez à votre espace</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Utilisez les identifiants fournis par l’administrateur de votre entreprise.</p>
          </div>
          {error && (
            <div role="alert" className="mt-6 flex gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
              <ShieldAlert size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {!company ? (
            <div className="mt-6 rounded-xl bg-slate-100 p-4 text-sm text-slate-600">
              <p>Cette connexion entreprise est indisponible.</p>
              <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-3 rounded-lg border px-4 py-2 font-semibold">Réessayer</button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-7 space-y-5">
              <label className="block text-sm font-semibold">
                Adresse email
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required autoComplete="username" className="mt-2 w-full rounded-xl border px-3 py-3.5 text-sm outline-none focus:ring-2" style={{ '--tw-ring-color': `${primary}55` } as CSSProperties} />
              </label>
              <label className="block text-sm font-semibold">
                Mot de passe
                <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required autoComplete="current-password" className="mt-2 w-full rounded-xl border px-3 py-3.5 text-sm outline-none focus:ring-2" style={{ '--tw-ring-color': `${primary}55` } as CSSProperties} />
              </label>
              <button type="submit" disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold shadow-lg disabled:cursor-wait disabled:opacity-70" style={{ backgroundColor: primary, color: foreground }}>
                <LogIn size={17} />
                {pending ? 'Connexion en cours…' : 'Se connecter'}
              </button>
            </form>
          )}
          {installationCompany && (
            <div className="mt-5 text-sm text-slate-600">
              <button type="button" aria-expanded={showRecovery} onClick={() => setShowRecovery((value) => !value)} className="underline underline-offset-4">
                Besoin d’aide pour vous connecter ?
              </button>
              {showRecovery && <p className="mt-3 rounded-xl bg-slate-50 p-4 leading-6">
                Contactez l’administrateur de votre entreprise. Si son accès est également perdu,
                le responsable du serveur dispose d’une procédure locale de récupération sécurisée.
                Les identifiants MAXIMUS central ne permettent pas de se connecter ici.
              </p>}
            </div>
          )}
          <div className="mt-8 flex items-center justify-center gap-2 border-t pt-5 text-xs text-slate-400">
            <Building2 size={14} />
            <span>{installationCompany ? `Espace privé · ${company?.name ?? installationCompany.name}` : 'Connexion sécurisée par MAXIMUS'}</span>
          </div>
        </section>
      </div>
    </main>
  );
}