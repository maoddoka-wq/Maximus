import type { ReactNode } from 'react';

/** Quiet uppercase group label used inside the ERP sidebar (both navigation modes). */
export function SidebarSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="sidebar-section-label mb-1 flex items-center gap-2" role="presentation">
      <span aria-hidden="true" className="h-px w-3 bg-[hsl(var(--sidebar-foreground)/.3)]" />
      {children}
    </p>
  );
}
