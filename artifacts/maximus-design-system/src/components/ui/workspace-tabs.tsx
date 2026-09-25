import type { LucideIcon } from 'lucide-react';

export type WorkspaceTabItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
};

type WorkspaceTabsProps = {
  items: readonly WorkspaceTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  testIdPrefix?: string;
  className?: string;
};

export function WorkspaceTabs({
  items,
  activeId,
  onChange,
  ariaLabel,
  testIdPrefix,
  className = '',
}: WorkspaceTabsProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className={`module-tabs flex min-w-0 gap-1.5 overflow-x-auto ${className}`}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeId === item.id;

        return (
          <button
            key={item.id}
            type="button"
            data-testid={testIdPrefix ? `${testIdPrefix}-${item.id}` : undefined}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChange(item.id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-3 text-sm font-bold transition ${
              isActive
                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm'
                : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            {Icon && <Icon size={16} aria-hidden="true" />}
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}