import type { LucideIcon } from 'lucide-react';

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
  icon: LucideIcon;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`metric-card card-surface fade-up rounded-2xl p-5 ${
        accent ? 'border-[hsl(var(--primary)/.25)]' : ''
      }`}
    >
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
          <MetricIcon size={17} aria-hidden="true" />
        </span>
        {accent && (
          <span className="mono rounded-full bg-[hsl(var(--primary)/.1)] px-2 py-1 text-[9px] font-bold text-[hsl(var(--primary))]">
            LIVE
          </span>
        )}
      </div>
      <p className="mt-5 text-xs font-medium text-[hsl(var(--muted-foreground))]">{label}</p>
      <p
        data-testid={`metric-value-${label}`}
        className="mt-1 text-2xl font-bold tracking-[-.05em]"
      >
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