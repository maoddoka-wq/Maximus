export default function NSGPayroll() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[9vh] text-[1.5vw] font-semibold uppercase tracking-[0.2em] text-accent">
        08 — MODULE ÉQUIPES
      </div>
      <div className="relative flex h-full w-full flex-col px-[8vw] pt-[15vh] pb-[7vh]">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[1.5vw] font-semibold uppercase tracking-[0.18em] text-accent">04 / PAIE</p>
            <h2 className="mt-[1vh] font-display text-[3.8vw] font-semibold leading-[1.02] tracking-[-0.055em]">
              Préparer et suivre la paie
            </h2>
          </div>
          <p className="font-display text-[7vw] font-semibold leading-none tracking-[-0.08em] text-accent/90">04</p>
        </div>
        <p className="mt-[1.5vh] max-w-[70vw] text-[1.9vw] leading-[1.25] text-muted">
          Un parcours de gestion dédié aux bénéficiaires, à la préparation des opérations et à leur suivi.
        </p>
        <div className="mt-[4vh] grid flex-1 grid-cols-4 gap-[1vw]">
          <div className="border border-white/10 bg-surface/80 p-[1.6vw]">
            <p className="font-display text-[3vw] font-semibold text-accent">01</p>
            <h3 className="mt-[1.4vh] font-display text-[2.25vw] font-semibold">Bénéficiaires</h3>
            <p className="mt-[0.9vh] text-[1.8vw] leading-[1.22] text-muted">Créer et tenir à jour les dossiers autorisés.</p>
          </div>
          <div className="border border-white/10 bg-surface/80 p-[1.6vw]">
            <p className="font-display text-[3vw] font-semibold text-accent">02</p>
            <h3 className="mt-[1.4vh] font-display text-[2.25vw] font-semibold">Préparation</h3>
            <p className="mt-[0.9vh] text-[1.8vw] leading-[1.22] text-muted">Préparer une opération de paie.</p>
          </div>
          <div className="border border-white/10 bg-surface/80 p-[1.6vw]">
            <p className="font-display text-[3vw] font-semibold text-accent">03</p>
            <h3 className="mt-[1.4vh] font-display text-[2.25vw] font-semibold">Validation</h3>
            <p className="mt-[0.9vh] text-[1.8vw] leading-[1.22] text-muted">Réserver la validation aux rôles autorisés.</p>
          </div>
          <div className="border border-accent/35 bg-accent/10 p-[1.6vw]">
            <p className="font-display text-[3vw] font-semibold text-accent">04</p>
            <h3 className="mt-[1.4vh] font-display text-[2.25vw] font-semibold">Suivi</h3>
            <p className="mt-[0.9vh] text-[1.8vw] leading-[1.22] text-muted">Virements groupés et historique des opérations.</p>
          </div>
        </div>
        <p className="pt-[1.5vh] text-[1.55vw] leading-[1.2] text-muted">
          Les règles de paie, pièces requises et circuits d’approbation doivent être validés avec NSG avant mise en service.
        </p>
        <div className="flex justify-end pt-[1vh] text-[1.4vw] uppercase tracking-[0.16em] text-muted">
          <span>08 / 12</span>
        </div>
      </div>
    </div>
  );
}