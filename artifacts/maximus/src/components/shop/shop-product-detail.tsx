import type { ReactNode } from 'react';
import { ShoppingBag, Truck } from 'lucide-react';
import { ShopBackLink } from './shop-page';

type Zone = { id: string; name: string; description?: string | null; fee: number };

/** Product detail layout: gallery left, purchase panel right (stacked on mobile). */
export function ShopProductDetail({
  gallery,
  name,
  category,
  kindLabel,
  priceLabel,
  priceSuffix,
  compareAtLabel,
  description,
  stock,
  showZones,
  zones,
  formatFee,
  addLabel,
  onBack,
  onAdd,
}: {
  gallery: ReactNode;
  name: string;
  category: string;
  kindLabel: string;
  priceLabel: string;
  priceSuffix?: string;
  compareAtLabel?: string;
  description: string;
  stock: number;
  showZones: boolean;
  zones: Zone[];
  formatFee: (fee: number) => string;
  addLabel: string;
  onBack: () => void;
  onAdd: () => void;
}) {
  const available = stock > 0;
  return (
    <section className="mx-auto max-w-6xl">
      <ShopBackLink label="Retour à la boutique" onClick={onBack} testId="button-product-back" />
      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] lg:gap-12">
        <div className="min-w-0">{gallery}</div>
        <div className="flex min-w-0 flex-col lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em]">
            <span className="rounded-full bg-[var(--shop-primary)]/10 px-2.5 py-1 text-[var(--shop-primary)]">{kindLabel}</span>
            {category && <span className="text-[hsl(var(--muted-foreground))]">{category}</span>}
          </div>
          <h1 className="mt-4 break-words text-3xl font-bold leading-tight tracking-[-.04em] sm:text-4xl">{name}</h1>
          <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-[hsl(var(--border))] pb-5">
            <p className="text-3xl font-bold tracking-[-.03em]">
              {priceLabel}
              {priceSuffix && <span className="ml-1 text-sm font-semibold text-[hsl(var(--muted-foreground))]">/ {priceSuffix}</span>}
            </p>
            {compareAtLabel && <p className="text-base text-[hsl(var(--muted-foreground))] line-through">{compareAtLabel}</p>}
          </div>
          <p className="mt-5 flex items-center gap-2 text-sm font-semibold">
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${available ? 'bg-[var(--shop-primary)]' : 'bg-[hsl(var(--muted-foreground)/.5)]'}`} />
            {available ? `${stock} unité${stock > 1 ? 's' : ''} disponible${stock > 1 ? 's' : ''}` : 'Indisponible'}
          </p>
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[hsl(var(--muted-foreground))]">{description || 'Une référence sélectionnée par votre boutique.'}</p>
          <button
            type="button"
            data-testid="button-product-add"
            onClick={onAdd}
            disabled={!available}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--shop-accent)] px-5 py-3.5 text-sm font-bold text-[var(--shop-accent-foreground)] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--shop-accent)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingBag size={16} aria-hidden="true" />
            {addLabel}
          </button>
          {showZones && zones.length > 0 && (
            <div className="mt-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
              <p className="flex items-center gap-2 text-sm font-bold"><Truck size={16} aria-hidden="true" className="text-[var(--shop-primary)]" />Zones de livraison disponibles</p>
              <ul className="mt-3 divide-y divide-[hsl(var(--border))]">
                {zones.map(zone => (
                  <li key={zone.id} className="flex items-start justify-between gap-3 py-2.5 text-xs">
                    <span className="min-w-0"><strong className="block text-sm">{zone.name}</strong>{zone.description && <span className="mt-0.5 block text-[hsl(var(--muted-foreground))]">{zone.description}</span>}</span>
                    <strong className="shrink-0 text-sm">{zone.fee > 0 ? formatFee(zone.fee) : 'Gratuit'}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
