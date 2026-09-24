import type { ReactNode } from 'react';

type DeckPageProps = {
  section: string;
  title: string;
  subtitle: string;
  page: string;
  children: ReactNode;
};

export function DeckPage({ section, title, subtitle, page, children }: DeckPageProps) {
  return (
    <div className="w-screen h-screen overflow-hidden relative flex flex-col bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[7vh] text-[1.5vw] font-bold uppercase tracking-[0.2em] text-accent">{section}</div>
      <div className="relative flex h-full w-full flex-col px-[8vw] pb-[6vh] pt-[14vh]">
        <h2 className="max-w-[78vw] font-display text-[3.6vw] font-semibold leading-[1.02] tracking-[-0.055em] text-balance">{title}</h2>
        <p className="mt-[1.5vh] max-w-[74vw] text-[2vw] leading-[1.3] text-muted text-pretty">{subtitle}</p>
        <div className="mt-[3.2vh] min-h-0 flex-1">{children}</div>
        <div className="flex justify-between pt-[1.5vh] text-[1.5vw] uppercase tracking-[0.16em] text-muted">
          <span>MAXIMUS ERP · PRÉSENTATION GÉNÉRALE</span>
          <span>{page} / 30</span>
        </div>
      </div>
    </div>
  );
}