import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

/** Back link used at the top of storefront sub-pages. */
export function ShopBackLink({ label, onClick, testId }: { label: string; onClick: () => void; testId?: string }) {
  return (
    <button type="button" data-testid={testId} onClick={onClick} className="group inline-flex items-center gap-2 rounded-lg py-1 text-sm font-semibold text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--shop-primary)]">
      <ArrowLeft size={15} aria-hidden="true" className="transition-transform group-hover:-translate-x-0.5" />
      {label}
    </button>
  );
}

/** Eyebrow + title + description header shared by storefront sub-pages. */
export function ShopPageHeader({ eyebrow, title, description, aside }: { eyebrow: string; title: string; description?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--shop-primary)]">{eyebrow}</p>
        <h1 className="mt-1.5 break-words text-2xl font-bold tracking-[-.035em] sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{description}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}

/** Bordered surface used for storefront panels. */
export function ShopPanel({ children, className = '', title, icon }: { children: ReactNode; className?: string; title?: string; icon?: ReactNode }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-6 ${className}`}>
      {title && <h2 className="mb-4 flex items-center gap-2 text-base font-bold tracking-[-.02em]">{icon}{title}</h2>}
      {children}
    </section>
  );
}
