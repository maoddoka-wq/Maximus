export default function Slide8() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text font-body deck-grid">
      <div className="absolute left-[8vw] top-[11vh] text-[1.5vw] font-semibold uppercase tracking-[0.22em] text-accent">07 — Décision</div>
      <div className="relative flex h-full w-full flex-col px-[8vw] py-[10vh]">
        <h2 className="max-w-[70vw] font-display text-[3.8vw] font-semibold leading-[1.02] tracking-[-0.055em] text-balance">MAXIMUS accompagne la décision</h2>
        <div className="mt-[5vh] grid flex-1 grid-cols-[1fr_1.55fr] gap-[6vw]">
          <div className="relative flex items-center justify-center border border-accent/40 bg-accent/10">
            <div className="absolute h-[25vw] w-[25vw] rounded-full border-[0.08vw] border-accent/25" />
            <div className="absolute h-[18vw] w-[18vw] rounded-full border-[0.08vw] border-accent/35" />
            <div className="relative text-center"><div className="font-display text-[6.8vw] font-semibold leading-none tracking-[-0.1em] text-accent">MAXI</div><div className="mt-[2vh] text-[1.6vw] uppercase tracking-[0.18em] text-muted">Contexte contrôlé</div></div>
          </div>
          <div className="grid grid-cols-2 gap-x-[4vw] gap-y-[2.4vh] pt-[1vh]">
            <div className="col-span-2 border-t-[0.08vw] border-accent/55 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">MAXI répond depuis le contexte de l’entreprise connectée</div>
            <div className="border-t-[0.08vw] border-white/15 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">Les données sont filtrées par session, entreprise et modules autorisés</div>
            <div className="border-t-[0.08vw] border-white/15 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">L’assistant n’effectue aucune mutation implicite</div>
            <div className="border-t-[0.08vw] border-white/15 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">Le catalogue, les modules et les packs passent par brouillon puis publication</div>
            <div className="border-t-[0.08vw] border-accent/55 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">La configuration métier reste compréhensible par un humain</div>
          </div>
        </div>
        <div className="flex justify-between text-[1.5vw] uppercase tracking-[0.18em] text-muted"><span>MAXIMUS ERP</span><span>08 / 10</span></div>
      </div>
    </div>
  );
}
