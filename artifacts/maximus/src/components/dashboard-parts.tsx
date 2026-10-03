import type { ReactNode } from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { Button } from '@workspace/maximus-design-system/components/ui/button';

/** Lead band at the top of a dashboard: context on the left, primary actions on the right. */
export function DashboardHero({
  eyebrow,
  title,
  description,
  actions,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="dashboard-hero relative overflow-hidden rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] shadow-[var(--shadow-soft)]">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-[hsl(var(--primary))]" />
      <div className="grid gap-6 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0 max-w-2xl">
          <p className="mono text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--primary))]">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-.04em] sm:text-3xl">{title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">{description}</p>
          {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
        </div>
        {aside && <div className="min-w-0">{aside}</div>}
      </div>
    </section>
  );
}

/** Standard dashboard card with a consistent header row. */
export function DashboardPanel({
  eyebrow,
  title,
  icon: Icon,
  action,
  children,
  flush = false,
  className = '',
  testId,
}: {
  eyebrow?: string;
  title: string;
  icon?: LucideIcon;
  action?: { label: string; onClick: () => void; testId?: string };
  children: ReactNode;
  flush?: boolean;
  className?: string;
  testId?: string;
}) {
  return (
    <section data-testid={testId} className={`card-surface flex min-w-0 flex-col overflow-hidden rounded-2xl ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-[hsl(var(--border))] px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]">
              <Icon size={16} aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && <p className="mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">{eyebrow}</p>}
            <h2 className="truncate text-base font-bold tracking-[-.02em]">{title}</h2>
          </div>
        </div>
        {action && (
          <Button type="button" variant="ghost" size="sm" data-testid={action.testId} onClick={action.onClick} className="shrink-0 gap-1 text-[hsl(var(--primary))]">
            {action.label}
            <ChevronRight size={14} aria-hidden="true" />
          </Button>
        )}
      </header>
      <div className={flush ? 'min-w-0 flex-1' : 'min-w-0 flex-1 p-5'}>{children}</div>
    </section>
  );
}

/** Actionable alert row ("signal") inside a dashboard panel. */
export function SignalItem({
  icon: Icon,
  title,
  text,
  onClick,
  tone = 'default',
  testId,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  onClick: () => void;
  tone?: 'default' | 'warning';
  testId?: string;
}) {
  const warning = tone === 'warning';
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`group flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--primary))] ${warning ? 'border-[hsl(var(--accent)/.45)] bg-[hsl(var(--accent)/.1)] hover:bg-[hsl(var(--accent)/.17)]' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/.5)]'}`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${warning ? 'bg-[hsl(var(--accent)/.25)] text-[hsl(var(--foreground))]' : 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]'}`}>
        <Icon size={16} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm">{title}</strong>
        <span className="mt-0.5 block text-xs leading-5 text-[hsl(var(--muted-foreground))]">{text}</span>
      </span>
      <ChevronRight size={16} aria-hidden="true" className="mt-2 shrink-0 text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

/** Module shortcut tile used in dashboard quick-access grids. */
export function QuickLinkTile({
  icon: Icon,
  label,
  description,
  onClick,
  testId,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="group flex min-w-0 flex-col items-start gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-left transition-colors hover:border-[hsl(var(--primary)/.4)] hover:bg-[hsl(var(--primary)/.04)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--primary))]"
    >
      <span className="flex w-full items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]">
          <Icon size={18} aria-hidden="true" />
        </span>
        <ChevronRight size={16} aria-hidden="true" className="text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-0.5" />
      </span>
      <span className="min-w-0">
        <strong className="block text-sm">{label}</strong>
        <span className="mt-1 block text-xs leading-5 text-[hsl(var(--muted-foreground))]">{description}</span>
      </span>
    </button>
  );
}

/** Composed empty state for dashboard panels. */
export function PanelEmpty({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[hsl(var(--border))] px-4 py-8 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
        <Icon size={18} aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold">{title}</p>
      {text && <p className="max-w-xs text-xs leading-5 text-[hsl(var(--muted-foreground))]">{text}</p>}
    </div>
  );
}
