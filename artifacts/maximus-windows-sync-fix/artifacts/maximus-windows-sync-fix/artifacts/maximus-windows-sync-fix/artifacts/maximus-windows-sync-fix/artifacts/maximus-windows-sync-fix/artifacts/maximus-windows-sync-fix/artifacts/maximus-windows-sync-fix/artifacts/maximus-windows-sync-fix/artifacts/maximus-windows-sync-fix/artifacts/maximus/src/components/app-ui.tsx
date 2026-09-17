import { Check, Eye, EyeOff, LoaderCircle, Plus, Search } from 'lucide-react';
import { Link } from 'wouter';
import { useState, type HTMLInputTypeAttribute, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';

import type { Icon } from '@/lib/navigation';
import type { StoreData } from '@/lib/store';

export function Brand({
  inverse = false,
  homeHref,
  large = false,
}: {
  inverse?: boolean;
  homeHref?: string;
  large?: boolean;
}) {
  return (
    <Link
      data-testid="link-brand"
      href={homeHref ?? (inverse ? '/' : '/maximus/dashboard')}
      className={`inline-flex items-center ${large ? 'gap-4' : 'gap-3'}`}
    >
      <span
        className={`flex items-center justify-center overflow-hidden bg-[hsl(var(--accent)/.18)] shadow-sm ${
          large ? 'h-14 w-14 rounded-2xl' : 'h-9 w-9 rounded-xl'
        }`}
      >
        <img src="/maximus-mark.svg" alt="Logo MAXIMUS" className="h-full w-full object-cover" />
      </span>
      <span
        className={`${large ? 'text-xl' : 'text-lg'} font-black tracking-[-.06em] ${
          inverse ? 'text-[hsl(var(--sidebar-foreground))]' : ''
        }`}
      >
        MAXIMUS<span className="text-[hsl(var(--accent))]">.</span>
      </span>
    </Link>
  );
}

export function Step({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 text-sm font-bold ${
        active || done ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'
      }`}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
          done
            ? 'bg-[hsl(var(--primary))] text-white'
            : active
              ? 'bg-[hsl(var(--accent))]'
              : 'border border-[hsl(var(--border))]'
        }`}
      >
        {done ? <Check size={14} /> : n}
      </span>
      <span className="mobile-hide">{label}</span>
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  testId,
  help,
}: {
  label: ReactNode;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: HTMLInputTypeAttribute;
  testId?: string;
  help?: string;
}) {
  const labelText = typeof label === 'string' ? label : 'ce champ';
  const explanation = help ?? `Saisissez ${labelText.toLowerCase().replace(' *', '')}.`;
  const fieldTestId = testId ?? '';
  const isPassword = type === 'password';
  const [passwordVisible, setPasswordVisible] = useState(false);
  const autoComplete = fieldTestId.includes('login-email')
    ? 'email'
    : fieldTestId.includes('login-password')
      ? 'current-password'
      : type === 'email'
        ? 'email'
        : type === 'password'
          ? 'new-password'
          : undefined;

  return (
    <label className="block text-sm font-semibold">
      {label}
      <span className="relative mt-2 block">
        <input
          data-testid={testId}
          autoComplete={autoComplete}
          type={isPassword && passwordVisible ? 'text' : type}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3.5 py-3 text-sm font-normal transition focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.14)] ${isPassword ? 'pr-11' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            data-testid={fieldTestId ? `button-toggle-password-${fieldTestId}` : undefined}
            aria-label={passwordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            onClick={() => setPasswordVisible((visible) => !visible)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
          >
            {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </span>
      <span className="mt-1 block text-[10px] font-normal leading-4 text-[hsl(var(--muted-foreground))]">
        {explanation}
      </span>
    </label>
  );
}

export function Metric({
  label,
  value,
  suffix = '',
  detail,
  icon: MetricIcon,
  accent = false,
  warning = false,
}: {
  label: string;
  value: string;
  suffix?: string;
  detail: string;
  icon: Icon;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <div className={`metric-card card-surface fade-up rounded-2xl p-5 ${accent ? 'border-[hsl(var(--primary)/.25)]' : ''}`}>
      <div className="flex items-start justify-between">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            warning
              ? 'bg-[hsl(var(--accent)/.2)] text-[hsl(var(--foreground))]'
              : accent
                ? 'bg-[hsl(var(--primary)/.11)] text-[hsl(var(--primary))]'
                : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
          }`}
        >
          <MetricIcon size={17} />
        </span>
        {accent && (
          <span className="mono rounded-full bg-[hsl(var(--primary)/.1)] px-2 py-1 text-[9px] font-bold text-[hsl(var(--primary))]">
            LIVE
          </span>
        )}
      </div>
      <p className="mt-5 text-xs font-medium text-[hsl(var(--muted-foreground))]">{label}</p>
      <p data-testid={`metric-value-${label}`} className="mt-1 text-2xl font-bold tracking-[-.05em]">
        {value}
        <span className="text-sm font-medium">{suffix}</span>
      </p>
      <p
        className={`mt-2 text-[11px] ${
          warning ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--muted-foreground))]'
        }`}
      >
        {detail}
      </p>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIF: 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]',
    VALIDÉ: 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]',
    CONFIRMÉ: 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]',
    'À JOUR': 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]',
    PAYÉE: 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]',
    ESSAI: 'bg-[hsl(var(--accent)/.22)] text-[hsl(var(--foreground))]',
    'EN ATTENTE': 'bg-[hsl(var(--accent)/.22)] text-[hsl(var(--foreground))]',
    OUVERTE: 'bg-[hsl(var(--accent)/.22)] text-[hsl(var(--foreground))]',
    'NON CONFIGURÉ': 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]',
    MAINTENANCE: 'bg-[hsl(var(--accent)/.22)] text-[hsl(var(--foreground))]',
    IMPAYÉ: 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]',
    'EN RETARD': 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]',
    SUSPENDU: 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]',
    RÉSILIÉ: 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]',
    EXPIRÉ: 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]',
    BROUILLON: 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]',
  };

  return (
    <span
      data-testid={`status-${status.replace(/\s/g, '-').toLowerCase()}`}
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${styles[status] ?? styles.BROUILLON}`}
    >
      {status}
    </span>
  );
}

export function ActivityRow({ activity, delay = 0 }: { activity: StoreData['activities'][number]; delay?: number }) {
  return (
    <div
      data-testid={`row-activity-${activity.id}`}
      className={`flex items-center gap-3 px-5 py-4 fade-up fade-up-delay-${Math.min(delay + 1, 3)}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--muted))] text-[10px] font-black text-[hsl(var(--primary))]">
        {activity.user
          .split(' ')
          .map((part) => part[0])
          .join('')}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          <strong>{activity.user}</strong> {activity.action}
        </p>
        <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
          {activity.module} · {activity.object}
        </p>
      </div>
      <span className="mobile-hide text-[10px] text-[hsl(var(--muted-foreground))]">{activity.date}</span>
    </div>
  );
}

export function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="table-scroll">
      <table className="data-table w-full min-w-[680px] text-left text-sm">
        <thead className="bg-[hsl(var(--muted)/.55)] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-5 py-3 font-bold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, rowIndex) => (
            <tr
              data-testid={`table-row-${rowIndex}`}
              key={rowIndex}
              className="transition hover:bg-[hsl(var(--muted)/.35)]"
            >
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-5 py-4">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Toolbar({
  search,
  setSearch,
  children,
}: {
  search: string;
  setSearch: (value: string) => void;
  children?: ReactNode;
}) {
  return (
    <div className="toolbar mb-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative min-w-0 max-w-sm flex-1">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
        <input
          data-testid="input-table-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher..."
          className="w-full rounded-lg border bg-[hsl(var(--card))] py-2.5 pl-9 pr-3 text-sm"
        />
      </div>
      <div className="action-row">{children}</div>
    </div>
  );
}

export function ActionButton({
  children,
  onClick,
  primary = false,
  testId,
  icon: ButtonIcon = Plus,
  disabled = false,
  loading = false,
  className = '',
}: {
  children: ReactNode;
  onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void | Promise<unknown>;
  primary?: boolean;
  testId?: string;
  icon?: Icon;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const busy = loading || pending;
  const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (busy) {
      event.preventDefault();
      return;
    }
    const result = onClick?.(event);
    if (!result || typeof (result as PromiseLike<unknown>).then !== 'function') return;
    setPending(true);
    void Promise.resolve(result).then(
      () => setPending(false),
      () => setPending(false),
    );
  };

  return (
    <button
      type="button"
      data-testid={testId}
      onClick={handleClick}
      disabled={disabled || busy}
      aria-busy={busy}
      className={`app-action btn flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-bold disabled:cursor-wait disabled:opacity-60 ${
        primary
          ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
          : 'border bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]'
      } ${className}`}
    >
      {busy ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <ButtonIcon size={15} />}
      {children}
    </button>
  );
}