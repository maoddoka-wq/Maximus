import type { CSSProperties, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@workspace/maximus-design-system/components/ui/card';

export type AuthHighlight = { icon: LucideIcon; title: string; text: string };

/**
 * Two-column authentication composition shared by the MAXIMUS login and the
 * company-branded login. The showcase column is hidden below `lg`; the card
 * column is always visible and carries the form.
 */
export function AuthLayout({
  showcase,
  children,
  showcaseStyle,
  testId,
}: {
  showcase: ReactNode;
  children: ReactNode;
  showcaseStyle?: CSSProperties;
  testId?: string;
}) {
  return (
    <main data-testid={testId} className="grid min-h-[100dvh] bg-[hsl(var(--background))] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
      <section
        className="auth-showcase relative hidden overflow-hidden bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] lg:flex lg:flex-col"
        style={showcaseStyle}
      >
        <div aria-hidden="true" className="auth-showcase__grid absolute inset-0" />
        <div className="relative flex min-h-full flex-col p-12 xl:p-16">{showcase}</div>
      </section>
      <section className="flex min-w-0 items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-md fade-up">{children}</div>
      </section>
    </main>
  );
}

export function AuthHighlights({ items }: { items: AuthHighlight[] }) {
  return (
    <ul className="grid gap-3">
      {items.map(({ icon: Icon, title, text }) => (
        <li key={title} className="flex items-start gap-4 rounded-xl border border-[hsl(var(--sidebar-foreground)/.1)] bg-[hsl(var(--sidebar-foreground)/.04)] p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--accent)/.16)] text-[hsl(var(--accent))]">
            <Icon size={17} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{title}</span>
            <span className="mt-1 block text-xs leading-5 text-[hsl(var(--sidebar-foreground)/.62)]">{text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
  footer,
  eyebrowStyle,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  eyebrowStyle?: CSSProperties;
}) {
  return (
    <Card className="border-[hsl(var(--card-border))] shadow-[var(--shadow-soft)]">
      <CardContent className="p-6 sm:p-8">
        <p className="mono text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--primary))]" style={eyebrowStyle}>
          {eyebrow}
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-[-.04em] sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{description}</p>
        <div className="mt-7">{children}</div>
        {footer && <div className="mt-7 border-t border-[hsl(var(--border))] pt-5">{footer}</div>}
      </CardContent>
    </Card>
  );
}
