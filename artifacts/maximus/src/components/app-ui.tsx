import { Link } from 'wouter';


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

// Shared primitives come from the MAXIMUS design system package. Brand stays
// local because it references this app's own public mark asset.
export { Step } from '@workspace/maximus-design-system/components/ui/step-indicator';
export { Field } from '@workspace/maximus-design-system/components/ui/app-field';
export { Metric } from '@workspace/maximus-design-system/components/ui/metric-card';
export { StatusBadge } from '@workspace/maximus-design-system/components/ui/status-badge';
export { ActivityRow } from '@workspace/maximus-design-system/components/ui/activity-row';
export { DataTable } from '@workspace/maximus-design-system/components/ui/data-table';
export { Toolbar } from '@workspace/maximus-design-system/components/ui/toolbar';
export { ActionButton } from '@workspace/maximus-design-system/components/ui/action-button';
