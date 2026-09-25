import { Search } from 'lucide-react';
import type { ReactNode } from 'react';

export function Toolbar({ search, setSearch, children }: { search: string; setSearch: (value: string) => void; children?: ReactNode }) {
  return (
    <div className="toolbar mb-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative min-w-0 max-w-sm flex-1">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
        <input data-testid="input-table-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher..." className="w-full rounded-lg border bg-[hsl(var(--card))] py-2.5 pl-9 pr-3 text-sm" />
      </div>
      <div className="action-row">{children}</div>
    </div>
  );
}