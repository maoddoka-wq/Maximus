import { Mail, Phone, ShoppingBag, UserRound } from 'lucide-react';
import { Button } from '@workspace/maximus-design-system/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@workspace/maximus-design-system/components/ui/dialog';

export type ShopNavItem = { label: string; path: string };
type Seller = { name: string; email: string; phone: string };

/**
 * Sticky storefront header. Colors come exclusively from the merchant's
 * `--shop-*` variables so the public palette stays isolated from the ERP theme.
 */
export function ShopHeader({
  storeName,
  logoUrl,
  nav,
  isActive,
  onNavigate,
  cartCount,
  seller,
  sellerImageUrl,
  canOpenSellerCard,
  sellerOpen,
  onSellerOpenChange,
}: {
  storeName: string;
  logoUrl: string;
  nav: ShopNavItem[];
  isActive: (path: string) => boolean;
  onNavigate: (path: string) => void;
  cartCount: number;
  seller: Seller;
  sellerImageUrl: string;
  canOpenSellerCard: boolean;
  sellerOpen: boolean;
  onSellerOpenChange: (open: boolean) => void;
}) {
  const mainNav = nav.filter(item => item.path !== '/panier' && item.path !== '/compte' && item.path !== '/connexion');
  const accountItem = nav.find(item => item.path === '/compte' || item.path === '/connexion');
  return (
    <>
      <header className="shop-header sticky top-0 z-30 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/.92)] text-[hsl(var(--foreground))] backdrop-blur">
        <span aria-hidden="true" className="block h-1 w-full bg-[var(--shop-primary)]" />
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              data-testid="button-shop-seller-card"
              onClick={() => canOpenSellerCard && onSellerOpenChange(true)}
              disabled={!canOpenSellerCard}
              aria-label={canOpenSellerCard ? `Voir la fiche de ${seller.name || storeName}` : undefined}
              className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--shop-accent)] ring-1 ring-[hsl(var(--border))] transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--shop-primary)] disabled:cursor-default disabled:hover:scale-100"
            >
              {logoUrl
                ? <img src={logoUrl} alt={`Logo de ${storeName}`} className="h-full w-full bg-[hsl(var(--card))] object-contain p-1" />
                : <ShoppingBag size={19} className="text-[var(--shop-accent-foreground)]" aria-hidden="true" />}
            </button>
            <button type="button" data-testid="link-shop-home" onClick={() => onNavigate('')} className="min-w-0 text-left">
              <span className="line-clamp-2 break-words text-base font-bold leading-tight tracking-[-.02em] sm:text-lg">{storeName}</span>
            </button>
          </div>
          <nav id="public-shop-header-nav" aria-label="Navigation de la boutique" className="hidden min-w-0 items-center gap-1 lg:flex">
            {mainNav.map(item => {
              const active = isActive(item.path);
              return (
                <button
                  type="button"
                  key={item.path}
                  data-testid={`link-shop-nav-${item.path.replace('/', '')}`}
                  onClick={() => onNavigate(item.path)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[var(--shop-primary)] ${active ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'}`}
                >
                  {item.label}
                  {active && <span aria-hidden="true" className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-[var(--shop-accent)]" />}
                </button>
              );
            })}
          </nav>
          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            {accountItem && (
              <Button type="button" variant="outline" size="sm" data-testid="link-shop-account" onClick={() => onNavigate(accountItem.path)} aria-current={isActive(accountItem.path) ? 'page' : undefined} className="gap-2">
                <UserRound size={15} aria-hidden="true" />
                {accountItem.label}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              data-testid="link-shop-cart"
              onClick={() => onNavigate('/panier')}
              aria-current={isActive('/panier') ? 'page' : undefined}
              aria-label={cartCount ? `Panier, ${cartCount} article${cartCount > 1 ? 's' : ''}` : 'Panier'}
              className="gap-2 border-[var(--shop-accent)] bg-[var(--shop-accent)] text-[var(--shop-accent-foreground)] hover:opacity-90"
            >
              <ShoppingBag size={15} aria-hidden="true" />
              Panier
              {cartCount > 0 && <span className="rounded-full bg-[var(--shop-accent-foreground)] px-1.5 text-[10px] font-bold leading-4 text-[var(--shop-accent)]">{cartCount}</span>}
            </Button>
          </div>
        </div>
      </header>
      <Dialog open={sellerOpen && canOpenSellerCard} onOpenChange={onSellerOpenChange}>
        <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
          <DialogHeader className="items-center text-center sm:text-center">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--shop-primary)]">À propos de la boutique</p>
            <div className="mt-3 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--shop-primary)]/20 bg-[hsl(var(--muted)/.45)] p-2">
              {sellerImageUrl
                ? <img src={sellerImageUrl} alt={`Logo de ${storeName}`} className="h-full w-full rounded-full object-cover" />
                : <UserRound size={44} className="text-[hsl(var(--muted-foreground))]" aria-hidden="true" />}
            </div>
            <DialogTitle className="mt-3 text-2xl">{seller.name || storeName}</DialogTitle>
            <DialogDescription>{storeName}</DialogDescription>
          </DialogHeader>
          <div className="mt-2 grid gap-2">
            {seller.email && <a href={`mailto:${seller.email}`} className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors hover:bg-[hsl(var(--muted)/.55)]"><Mail size={17} className="text-[var(--shop-primary)]" aria-hidden="true" /><span className="min-w-0 break-all">{seller.email}</span></a>}
            {seller.phone && <a href={`tel:${seller.phone}`} className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors hover:bg-[hsl(var(--muted)/.55)]"><Phone size={17} className="text-[var(--shop-primary)]" aria-hidden="true" /><span>{seller.phone}</span></a>}
            {!seller.email && !seller.phone && <p className="rounded-xl bg-[hsl(var(--muted)/.55)] px-4 py-3 text-center text-sm text-[hsl(var(--muted-foreground))]">Les coordonnées du vendeur ne sont pas renseignées.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
