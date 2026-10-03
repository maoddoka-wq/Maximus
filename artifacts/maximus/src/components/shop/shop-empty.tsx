import type { LucideIcon } from 'lucide-react';

/** Composed empty state for public storefront lists. */
export function ShopEmpty({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--shop-primary)]/10 text-[var(--shop-primary)]">
        <Icon size={22} aria-hidden="true" />
      </span>
      <p className="text-base font-bold">{title}</p>
      {text && <p className="max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">{text}</p>}
    </div>
  );
}
