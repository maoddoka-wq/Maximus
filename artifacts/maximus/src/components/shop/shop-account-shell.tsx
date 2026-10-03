import type { ReactNode } from 'react';
import { LayoutDashboard, LogOut, MapPin, Heart, Package, RefreshCw, UserRound, type LucideIcon } from 'lucide-react';
import { Skeleton } from '@workspace/maximus-design-system/components/ui/skeleton';

export type AccountTab = { key: string; label: string; path: string };
const tabIcons: Record<string, LucideIcon> = { dashboard: LayoutDashboard, orders: Package, favorites: Heart, addresses: MapPin, profile: UserRound };

/** Customer account frame: identity + section navigation + content. */
export function ShopAccountShell({
  storeName,
  logoUrl,
  customerName,
  customerEmail,
  tabs,
  active,
  pending,
  loading,
  onNavigate,
  onLogout,
  children,
}: {
  storeName: string;
  logoUrl: string;
  customerName: string;
  customerEmail: string;
  tabs: AccountTab[];
  active: string;
  pending: boolean;
  loading: boolean;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const initials = customerName.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
  return (
    <section className="grid min-w-0 gap-5 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-8" aria-busy={pending}>
      {pending && (
        <div role="status" className="fixed inset-x-4 top-4 z-[90] mx-auto flex max-w-md items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm font-semibold shadow-lg">
          <RefreshCw size={15} className="animate-spin" aria-hidden="true" />Action en cours…
        </div>
      )}
      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex min-w-0 items-center gap-3 border-b border-[hsl(var(--border))] p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--shop-primary)] text-sm font-bold text-[var(--shop-primary-foreground)]">{initials || <UserRound size={18} aria-hidden="true" />}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{customerName}</p>
              <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">{customerEmail}</p>
            </div>
          </div>
          <nav aria-label="Mon espace client" className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-visible">
            {tabs.map(tab => {
              const Icon = tabIcons[tab.key] ?? LayoutDashboard;
              const isActive = active === tab.key;
              return (
                <button
                  type="button"
                  key={tab.key}
                  data-testid={`button-account-tab-${tab.key}`}
                  onClick={() => onNavigate(tab.path)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[var(--shop-primary)] ${isActive ? 'bg-[var(--shop-primary)]/10 text-[var(--shop-primary)]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'}`}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
            <button type="button" data-testid="button-account-logout" onClick={onLogout} disabled={pending} className="flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[hsl(var(--destructive))] transition-colors hover:bg-[hsl(var(--destructive)/.08)] disabled:cursor-wait disabled:opacity-50 lg:mt-2 lg:border-t lg:border-[hsl(var(--border))] lg:pt-3">
              <LogOut size={16} aria-hidden="true" />
              <span className="whitespace-nowrap">Se déconnecter</span>
            </button>
          </nav>
        </div>
        <p className="mt-3 hidden items-center gap-2 px-1 text-xs text-[hsl(var(--muted-foreground))] lg:flex">
          {logoUrl && <img src={logoUrl} alt="" className="h-5 w-5 rounded object-contain" />}
          Compte client · {storeName}
        </p>
      </aside>
      <div className="min-w-0">
        {loading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Chargement de votre espace">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map(index => <Skeleton key={index} className="h-28 rounded-2xl" />)}</div>
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        ) : children}
      </div>
    </section>
  );
}
