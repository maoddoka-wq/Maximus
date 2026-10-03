import { useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@workspace/maximus-design-system/components/ui/button';
import { railScrollTarget } from '@/lib/rail-scroll';

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
  /** Company workspaces already expose these features in the main menu. */
  sidebarNavigation?: boolean;
};

export function WorkspaceTabs({
  items,
  activeId,
  onChange,
  ariaLabel,
  testIdPrefix,
  className = '',
  sidebarNavigation = false,
}: WorkspaceTabsProps) {
  const railRef = useRef<HTMLElement | null>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    // Scroll only this rail: scrollIntoView would also move every scrollable ancestor.
    const rail = railRef.current;
    const chip = activeRef.current;
    if (!rail || !chip || typeof rail.scrollTo !== 'function') return;
    const railBox = rail.getBoundingClientRect();
    const chipBox = chip.getBoundingClientRect();
    rail.scrollTo({
      left: railScrollTarget(
        { width: rail.clientWidth, scrollWidth: rail.scrollWidth },
        { left: chipBox.left - railBox.left + rail.scrollLeft, width: chipBox.width },
      ),
    });
  }, [activeId, sidebarNavigation]);
  if (sidebarNavigation) return null;
  return (
    <nav
      ref={railRef}
      aria-label={ariaLabel}
      data-testid={testIdPrefix ? `${testIdPrefix}-rail` : undefined}
      className={`module-tabs flex min-w-0 gap-1.5 overflow-x-auto ${className}`}
    >
      {items.map(item => {
        const Icon = item.icon;
        const isActive = activeId === item.id;
        return (
          <Button
            key={item.id}
            ref={isActive ? activeRef : undefined}
            type="button"
            variant="ghost"
            data-testid={testIdPrefix ? `${testIdPrefix}-${item.id}` : undefined}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChange(item.id)}
            className={`inline-flex h-auto shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm md:px-3.5 md:py-3 font-bold transition ${
              isActive
                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] shadow-sm'
                : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            {Icon && <Icon size={16} aria-hidden="true" />}
            {item.label}
          </Button>
        );
      })}
    </nav>
  );
}