export default function Payroll() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[10vh] text-[1.5vw] font-semibold uppercase tracking-[0.2em] text-accent">
        09 — MODULE MÉTIER
      </div>
      <div className="relative flex h-full w-full flex-col px-[8vw] pt-[16vh] pb-[8vh]">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[1.6vw] font-semibold uppercase tracking-[0.18em] text-accent">06 — ÉQUIPES</p>
            <h2 className="mt-[1.8vh] font-display text-[4vw] font-semibold leading-[1.02] tracking-[-0.055em]">
              Paie
            </h2>
          </div>
          <p className="font-display text-[8vw] font-semibold leading-none tracking-[-0.08em] text-accent/90">06</p>
        </div>
        <p className="mt-[2vh] max-w-[65vw] text-[2vw] leading-[1.3] text-muted">
          Un parcours dédié à la préparation et au suivi des opérations de paie.
        </p>
        <div className="mt-[5vh] grid flex-1 grid-cols-4 gap-[1vw]">
          <div className="border border-white/10 bg-surface/85 p-[1.6vw]">
            <p className="font-display text-[3vw] font-semibold text-accent">01</p>
            <h3 className="mt-[1.5vh] font-display text-[2.3vw] font-semibold">Bénéficiaires</h3>
            <p className="mt-[1vh] text-[2vw] leading-[1.25] text-muted">Gérer les dossiers de paie.</p>
          </div>
          <div className="border border-white/10 bg-surface/85 p-[1.6vw]">
            <p className="font-display text-[3vw] font-semibold text-accent">02</p>
            <h3 className="mt-[1.5vh] font-display text-[2.3vw] font-semibold">Préparation</h3>
            <p className="mt-[1vh] text-[2vw] leading-[1.25] text-muted">Préparer les opérations de paie.</p>
          </div>
          <div className="border border-white/10 bg-surface/85 p-[1.6vw]">
            <p className="font-display text-[3vw] font-semibold text-accent">03</p>
            <h3 className="mt-[1.5vh] font-display text-[2.3vw] font-semibold">Validation</h3>
            <p className="mt-[1vh] text-[2vw] leading-[1.25] text-muted">Contrôler avant l’exécution.</p>
          </div>
          <div className="border border-accent/35 bg-accent/10 p-[1.6vw]">
            <p className="font-display text-[3vw] font-semibold text-accent">04</p>
            <h3 className="mt-[1.5vh] font-display text-[2.3vw] font-semibold">Suivi</h3>
            <p className="mt-[1vh] text-[2vw] leading-[1.25] text-muted">Virements groupés et historique.</p>
          </div>
        </div>
        <div className="flex justify-between pt-[2vh] text-[1.5vw] uppercase tracking-[0.16em] text-muted">
          <span>MAXIMUS ERP</span>
          <span>09 / 09</span>
        </div>
      </div>
    </div>
  );
}