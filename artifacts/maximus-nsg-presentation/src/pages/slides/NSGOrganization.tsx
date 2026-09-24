export default function NSGOrganization() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[9vh] text-[1.5vw] font-semibold uppercase tracking-[0.2em] text-accent">
        06 — CAPACITÉ TRANSVERSALE
      </div>
      <div className="relative flex h-full w-full flex-col px-[8vw] pt-[15vh] pb-[7vh]">
        <h2 className="font-display text-[3.8vw] font-semibold leading-[1.02] tracking-[-0.055em]">
          Organisation des accès
        </h2>
        <p className="mt-[1.5vh] max-w-[68vw] text-[1.9vw] leading-[1.25] text-muted">
          Les comptes et permissions peuvent suivre les responsabilités de l’équipe, sans donner à chacun les mêmes accès.
        </p>
        <div className="mt-[3.5vh] grid flex-1 grid-cols-2 gap-[1.2vw]">
          <div className="flex items-start gap-[1.2vw] border border-white/10 bg-surface/80 p-[1.6vw]">
            <span className="font-display text-[3.2vw] font-semibold leading-none text-accent">01</span>
            <div>
              <h3 className="font-display text-[2.3vw] font-semibold">Direction</h3>
              <p className="mt-[0.8vh] text-[1.8vw] leading-[1.23] text-muted">Vue d’ensemble et indicateurs autorisés.</p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw] border border-white/10 bg-surface/80 p-[1.6vw]">
            <span className="font-display text-[3.2vw] font-semibold leading-none text-accent">02</span>
            <div>
              <h3 className="font-display text-[2.3vw] font-semibold">Équipe commerciale</h3>
              <p className="mt-[0.8vh] text-[1.8vw] leading-[1.23] text-muted">Clients, devis et opérations commerciales.</p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw] border border-white/10 bg-surface/80 p-[1.6vw]">
            <span className="font-display text-[3.2vw] font-semibold leading-none text-accent">03</span>
            <div>
              <h3 className="font-display text-[2.3vw] font-semibold">Responsable de stock</h3>
              <p className="mt-[0.8vh] text-[1.8vw] leading-[1.23] text-muted">À créer uniquement si ce périmètre est retenu.</p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw] border border-accent/35 bg-accent/10 p-[1.6vw]">
            <span className="font-display text-[3.2vw] font-semibold leading-none text-accent">04</span>
            <div>
              <h3 className="font-display text-[2.3vw] font-semibold">RH / paie</h3>
              <p className="mt-[0.8vh] text-[1.8vw] leading-[1.23] text-muted">Accès aux présences et opérations de paie autorisées.</p>
            </div>
          </div>
        </div>
        <div className="flex justify-between pt-[1.5vh] text-[1.4vw] uppercase tracking-[0.16em] text-muted">
          <span>Répartition indicative, à adapter à l’organisation réelle de NSG</span>
          <span>06 / 12</span>
        </div>
      </div>
    </div>
  );
}