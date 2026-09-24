export default function Slide6() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg text-text font-body">
      <div className="absolute left-[8vw] top-[11vh] text-[1.5vw] font-semibold uppercase tracking-[0.2em] text-accent">
        06 — ÉQUIPES
      </div>
      <div className="relative flex h-full w-full flex-col px-[8vw] pt-[16vh] pb-[8vh]">
        <h2 className="max-w-[62vw] font-display text-[4vw] font-semibold leading-[1.02] tracking-[-0.055em]">
          Gestion des équipes
        </h2>
        <p className="mt-[1.8vh] max-w-[55vw] text-[2vw] leading-[1.25] text-muted">
          Des outils distincts pour organiser les responsabilités, les présences et la paie.
        </p>
        <div className="mt-[5vh] grid flex-1 grid-cols-3 gap-[1.2vw]">
          <div className="border border-white/10 bg-surface/85 p-[2vw]">
            <p className="font-display text-[5vw] font-semibold leading-none tracking-[-0.06em] text-accent">01</p>
            <h3 className="mt-[3vh] font-display text-[2.6vw] font-semibold">Organisation</h3>
            <p className="mt-[1.5vh] text-[2vw] leading-[1.3] text-muted">Comptes, rôles et responsabilités adaptés aux fonctions.</p>
          </div>
          <div className="border border-white/10 bg-surface/85 p-[2vw]">
            <p className="font-display text-[5vw] font-semibold leading-none tracking-[-0.06em] text-accent">02</p>
            <h3 className="mt-[3vh] font-display text-[2.6vw] font-semibold">Présences</h3>
            <p className="mt-[1.5vh] text-[2vw] leading-[1.3] text-muted">Pointages, absences et suivi quotidien des équipes.</p>
          </div>
          <div className="border border-accent/35 bg-accent/10 p-[2vw]">
            <p className="font-display text-[5vw] font-semibold leading-none tracking-[-0.06em] text-accent">03</p>
            <h3 className="mt-[3vh] font-display text-[2.6vw] font-semibold">Paie</h3>
            <p className="mt-[1.5vh] text-[2vw] leading-[1.3] text-muted">Bénéficiaires et préparation des salaires.</p>
          </div>
        </div>
        <div className="flex justify-between pt-[2vh] text-[1.5vw] uppercase tracking-[0.16em] text-muted">
          <span>MAXIMUS × NSG</span>
          <span>06 / 08</span>
        </div>
      </div>
    </div>
  );
}