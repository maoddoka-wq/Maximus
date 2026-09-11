export default function Slide4() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text font-body deck-grid">
      <div className="absolute left-0 top-0 h-[1.2vh] w-full bg-accent" />
      <div className="absolute right-[8vw] top-[11vh] text-[1.5vw] font-semibold uppercase tracking-[0.22em] text-accent">03 — Gouvernance</div>
      <div className="relative flex h-full w-full flex-col px-[8vw] py-[10vh]">
        <h2 className="max-w-[73vw] font-display text-[3.8vw] font-semibold leading-[1.02] tracking-[-0.055em] text-balance">Une organisation maîtrisée par entreprise</h2>
        <div className="mt-[4vh] grid flex-1 grid-cols-[1fr_1.6fr] gap-[5vw]">
          <div className="flex flex-col justify-between border-r-[0.08vw] border-white/15 pr-[4vw]">
            <div><div className="font-display text-[6.2vw] font-semibold leading-none tracking-[-0.08em] text-accent">01</div><p className="mt-[1.5vh] text-[1.9vw] leading-[1.2] text-muted">Une hiérarchie lisible avant toute action.</p></div>
            <div className="relative h-[24vh] border-l-[0.16vw] border-accent/70 pl-[2vw]"><div className="absolute left-[-0.48vw] top-0 h-[0.8vw] w-[0.8vw] rounded-full bg-accent" /><div className="pt-[1vh] text-[1.7vw] uppercase tracking-[0.15em] text-accent">Entreprise</div><div className="mt-[2.5vh] h-[0.16vw] w-[14vw] bg-white/20" /><div className="mt-[2.5vh] text-[1.7vw] uppercase tracking-[0.15em] text-muted">Secteurs</div><div className="mt-[2.5vh] h-[0.16vw] w-[9vw] bg-white/20" /><div className="mt-[2.5vh] text-[1.7vw] uppercase tracking-[0.15em] text-muted">Employés</div></div>
          </div>
          <div className="grid grid-cols-2 gap-x-[4vw] gap-y-[2.6vh] pt-[1vh]">
            <div className="border-t-[0.08vw] border-accent/55 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">L’entreprise définit sa structure et ses secteurs</div>
            <div className="border-t-[0.08vw] border-white/15 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">Les rôles et permissions sont configurés par secteur</div>
            <div className="border-t-[0.08vw] border-white/15 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">Les managers gèrent leurs employés sans accéder aux autres unités</div>
            <div className="border-t-[0.08vw] border-white/15 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">Les autorisations effectives sont contrôlées côté serveur</div>
            <div className="col-span-2 border-t-[0.08vw] border-white/15 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">Chaque action importante reste traçable</div>
          </div>
        </div>
        <div className="flex justify-between text-[1.5vw] uppercase tracking-[0.18em] text-muted"><span>MAXIMUS ERP</span><span>04 / 10</span></div>
      </div>
    </div>
  );
}
