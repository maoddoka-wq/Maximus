import { ShoppingBag, type LucideIcon } from 'lucide-react';

/** Product / rental card for the public storefront grids and rails. */
export function ShopOfferCard({
  imageUrl,
  icon: Icon,
  badge,
  name,
  price,
  priceValue,
  compareAtPrice,
  compareAtLabel,
  priceSuffix,
  availability,
  onOpen,
  onAdd,
}: {
  imageUrl: string;
  icon: LucideIcon;
  badge: string;
  name: string;
  price: string;
  priceValue: number;
  compareAtPrice?: number | null;
  compareAtLabel?: string;
  priceSuffix?: string;
  availability?: string;
  onOpen?: () => void;
  onAdd?: () => void;
}) {
  const isAvailable = availability !== 'Indisponible';
  const discount = compareAtPrice && compareAtPrice > priceValue ? Math.round((1 - priceValue / compareAtPrice) * 100) : null;
  const category = badge.split(' · ')[1] || badge;
  return (
    <article className="shop-offer-card group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]">
      <button
        type="button"
        onClick={onOpen}
        disabled={!onOpen}
        aria-label={onOpen ? `Voir ${name}` : undefined}
        className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-[hsl(var(--muted)/.5)] disabled:cursor-default focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--shop-primary)]"
      >
        {imageUrl
          ? <img src={imageUrl} alt={name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
          : <Icon size={30} className="text-[hsl(var(--muted-foreground))]" aria-hidden="true" />}
        {discount !== null && <span className="absolute left-2 top-2 rounded-md bg-[hsl(var(--destructive))] px-1.5 py-0.5 text-[10px] font-bold text-[hsl(var(--destructive-foreground))]">-{discount}%</span>}
      </button>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-3.5">
        <p className="truncate text-[10px] font-bold uppercase tracking-[.12em] text-[var(--shop-primary)]">{category}</p>
        {onOpen
          ? <button type="button" onClick={onOpen} className="line-clamp-2 min-h-10 w-full break-words text-left text-sm font-semibold leading-5 text-[hsl(var(--foreground))] hover:underline">{name}</button>
          : <h3 className="line-clamp-2 min-h-10 break-words text-sm font-semibold leading-5 text-[hsl(var(--foreground))]">{name}</h3>}
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
          <p className="text-base font-bold leading-5 text-[hsl(var(--foreground))]">
            {price}
            {priceSuffix && <span className="ml-0.5 text-[10px] font-medium text-[hsl(var(--muted-foreground))]">{priceSuffix}</span>}
          </p>
          {discount !== null && compareAtLabel && <span className="truncate text-xs text-[hsl(var(--muted-foreground))] line-through">{compareAtLabel}</span>}
        </div>
        {availability && (
          <p className={`flex items-center gap-1.5 text-[11px] font-semibold ${isAvailable ? 'text-[hsl(var(--foreground)/.75)]' : 'text-[hsl(var(--muted-foreground))]'}`}>
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${isAvailable ? 'bg-[var(--shop-primary)]' : 'bg-[hsl(var(--muted-foreground)/.5)]'}`} />
            {availability}
          </p>
        )}
        {onAdd && isAvailable && (
          <button
            type="button"
            onClick={onAdd}
            className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--shop-accent)] px-3 py-2 text-xs font-bold text-[var(--shop-accent-foreground)] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--shop-accent)]"
          >
            <ShoppingBag size={13} aria-hidden="true" />
            Ajouter au panier
          </button>
        )}
      </div>
    </article>
  );
}
