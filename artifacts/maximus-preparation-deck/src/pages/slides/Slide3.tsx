export default function Slide3() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text font-body">
      <div className="absolute inset-y-0 right-0 w-[38vw] bg-primary/45" />
      <div className="absolute right-[8vw] top-[11vh] text-[1.5vw] font-semibold uppercase tracking-[0.22em] text-accent">02 — Proposition</div>
      <div className="relative flex h-full w-full flex-col px-[8vw] py-[10vh]">
        <h2 className="max-w-[64vw] font-display text-[3.8vw] font-semibold leading-[1.02] tracking-[-0.055em] text-balance">La réponse MAXIMUS</h2>
        <div className="mt-[5vh] grid flex-1 grid-cols-[1.35fr_0.95fr] gap-[6vw]">
          <div className="grid grid-cols-2 gap-[1.4vw] content-start">
            <div className="min-h-[22vh] border border-white/12 bg-surface/80 p-[2vw]"><div className="font-display text-[3.2vw] font-semibold text-accent">01</div><p className="mt-[3vh] text-[2.05vw] leading-[1.18] text-pretty">Un espace de pilotage unique pour l’entreprise</p></div>
            <div className="min-h-[22vh] border border-white/12 bg-surface/80 p-[2vw]"><div className="font-display text-[3.2vw] font-semibold text-accent">02</div><p className="mt-[3vh] text-[2.05vw] leading-[1.18] text-pretty">Des modules activables selon les besoins métier</p></div>
            <div className="min-h-[22vh] border border-white/12 bg-surface/80 p-[2vw]"><div className="font-display text-[3.2vw] font-semibold text-accent">03</div><p className="mt-[3vh] text-[2.05vw] leading-[1.18] text-pretty">Des packs composés par secteur, sans recréer les fonctionnalités</p></div>
            <div className="min-h-[22vh] border border-white/12 bg-surface/80 p-[2vw]"><div className="font-display text-[3.2vw] font-semibold text-accent">04</div><p className="mt-[3vh] text-[2.05vw] leading-[1.18] text-pretty">Une configuration évolutive sans modifier le code</p></div>
            <div className="col-span-2 border border-accent/40 bg-accent/10 p-[2vw]"><div className="font-display text-[3.2vw] font-semibold text-accent">05</div><p className="mt-[2vh] text-[2.05vw] leading-[1.18] text-pretty">Une séparation stricte des données entre entreprises</p></div>
          </div>
          <div className="flex flex-col justify-end border-l-[0.16vw] border-accent pl-[3vw] pb-[3vh]">
            <div className="font-display text-[7vw] font-semibold leading-[0.85] tracking-[-0.1em] text-white/10">ERP</div>
            <div className="mt-[2vh] h-[0.16vw] w-[9vw] bg-accent" />
            <p className="mt-[2vh] max-w-[20vw] text-[1.8vw] leading-[1.25] text-muted">Une même base pour décider, exécuter et contrôler.</p>
          </div>
        </div>
        <div className="flex justify-between text-[1.5vw] uppercase tracking-[0.18em] text-muted"><span>MAXIMUS ERP</span><span>03 / 10</span></div>
      </div>
    </div>
  );
}
