export default function Stock() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[10vh] text-[1.5vw] font-semibold uppercase tracking-[0.2em] text-accent">
        06 — MODULE MÉTIER
      </div>
      <div className="relative flex h-full w-full flex-col px-[8vw] pt-[16vh] pb-[8vh]">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-[4vw] font-semibold leading-[1.02] tracking-[-0.055em]">
              Gestion de stock
            </h2>
            <p className="mt-[1.8vh] text-[2vw] text-muted">
              Articles et mouvements suivis au fil des opérations.
            </p>
          </div>
          <p className="font-display text-[8vw] font-semibold leading-none tracking-[-0.08em] text-accent/90">03</p>
        </div>
        <div className="mt-[5vh] grid flex-1 grid-cols-2 gap-[1.4vw]">
          <div className="flex items-center gap-[2vw] border border-white/10 bg-surface/85 px-[2vw] py-[2.5vh]">
            <span className="font-display text-[3vw] font-semibold text-accent">A</span>
            <div>
              <h3 className="font-display text-[2.5vw] font-semibold">Référentiel</h3>
              <p className="mt-[0.8vh] text-[2vw] leading-[1.2] text-muted">Fiches produits, articles et références.</p>
            </div>
          </div>
          <div className="flex items-center gap-[2vw] border border-white/10 bg-surface/85 px-[2vw] py-[2.5vh]">
            <span className="font-display text-[3vw] font-semibold text-accent">B</span>
            <div>
              <h3 className="font-display text-[2.5vw] font-semibold">Mouvements</h3>
              <p className="mt-[0.8vh] text-[2vw] leading-[1.2] text-muted">Entrées, sorties et demandes.</p>
            </div>
          </div>
          <div className="flex items-center gap-[2vw] border border-white/10 bg-surface/85 px-[2vw] py-[2.5vh]">
            <span className="font-display text-[3vw] font-semibold text-accent">C</span>
            <div>
              <h3 className="font-display text-[2.5vw] font-semibold">Inventaires</h3>
              <p className="mt-[0.8vh] text-[2vw] leading-[1.2] text-muted">Contrôle des quantités et rapports.</p>
            </div>
          </div>
          <div className="flex items-center gap-[2vw] border border-accent/35 bg-accent/10 px-[2vw] py-[2.5vh]">
            <span className="font-display text-[3vw] font-semibold text-accent">D</span>
            <div>
              <h3 className="font-display text-[2.5vw] font-semibold">Seuils</h3>
              <p className="mt-[0.8vh] text-[2vw] leading-[1.2] text-muted">Alertes sur les niveaux de stock.</p>
            </div>
          </div>
        </div>
        <div className="flex justify-between pt-[2vh] text-[1.5vw] uppercase tracking-[0.16em] text-muted">
          <span>MAXIMUS ERP</span>
          <span>06 / 09</span>
        </div>
      </div>
    </div>
  );
}