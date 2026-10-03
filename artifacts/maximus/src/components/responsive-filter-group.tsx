import { useId, useState, type ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@workspace/maximus-design-system/components/ui/button';
import { filterToggleLabel } from '@/lib/filter-group';

type ResponsiveFilterGroupProps = {
  /** Main search field. Always visible. */
  search: ReactNode;
  /** Supplementary controlled filters. Always mounted; collapsed behind a toggle below md. */
  children: ReactNode;
  activeCount?: number;
  /** Resets supplementary filters; offered on phones while a filter is active. */
  onClear?: () => void;
  label?: string;
  testId?: string;
};

export function ResponsiveFilterGroup({
  search,
  children,
  activeCount = 0,
  onClear,
  label = 'Filtres',
  testId = 'filters',
}: ResponsiveFilterGroupProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="responsive-filters mb-4 flex flex-col gap-3 md:flex-row md:items-center" data-testid={testId}>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {search}
        <Button
          type="button"
          variant="outline"
          aria-expanded={open}
          aria-controls={panelId}
          data-testid={`${testId}-toggle`}
          onClick={() => setOpen(value => !value)}
          className="responsive-filters__toggle shrink-0 md:hidden"
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          {filterToggleLabel(label, activeCount)}
        </Button>
      </div>
      <div id={panelId} data-testid={`${testId}-panel`} className={`${open ? 'flex' : 'hidden'} flex-col gap-2 md:flex md:flex-row md:items-center`}>
        {children}
        {onClear && activeCount > 0 && (
          <Button type="button" variant="ghost" onClick={onClear} data-testid={`${testId}-clear`} className="md:hidden">
            Effacer les filtres
          </Button>
        )}
      </div>
    </div>
  );
}
