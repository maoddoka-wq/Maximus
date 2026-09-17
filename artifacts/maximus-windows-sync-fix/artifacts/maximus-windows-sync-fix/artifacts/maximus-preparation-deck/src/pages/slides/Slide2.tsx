export default function Slide2() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text font-body deck-grid">
      <div className="absolute right-[-8vw] top-[-15vh] h-[55vw] w-[55vw] rounded-full border-[0.08vw] border-accent/20" />
      <div className="absolute right-[8vw] top-[11vh] text-[1.5vw] font-semibold uppercase tracking-[0.22em] text-accent">01 — Contexte</div>
      <div className="relative flex h-full w-full flex-col px-[8vw] py-[10vh]">
        <div className="flex items-end justify-between">
          <h2 className="max-w-[66vw] font-display text-[3.8vw] font-semibold leading-[1.02] tracking-[-0.055em] text-balance">Le besoin : reprendre le contrôle de l’activité</h2>
          <div className="mb-[0.6vh] text-[5vw] font-display font-semibold tracking-[-0.08em] text-accent/25">01</div>
        </div>
        <div className="mt-[5vh] grid flex-1 grid-cols-[0.8fr_1.8fr] gap-[5vw]">
          <div className="relative border-t-[0.16vw] border-accent pt-[2.5vh]">
            <div className="font-display text-[5.5vw] font-semibold leading-none tracking-[-0.08em] text-accent">05</div>
            <p className="mt-[2vh] max-w-[18vw] text-[1.7vw] leading-[1.3] text-muted">points de contrôle à réunir dans une même lecture opérationnelle.</p>
          </div>
          <div className="grid grid-cols-2 gap-x-[4vw] gap-y-[2.5vh] pt-[1vh]">
            <div className="border-t-[0.08vw] border-white/15 pt-[1.8vh] text-[2.05vw] leading-[1.22] text-pretty">Les opérations sont réparties entre plusieurs outils</div>
            <div className="border-t-[0.08vw] border-white/15 pt-[1.8vh] text-[2.05vw] leading-[1.22] text-pretty">Les stocks, ventes, présences et paies doivent rester cohérents</div>
            <div className="border-t-[0.08vw] border-white/15 pt-[1.8vh] text-[2.05vw] leading-[1.22] text-pretty">Chaque entreprise doit contrôler ses équipes et ses secteurs</div>
            <div className="border-t-[0.08vw] border-white/15 pt-[1.8vh] text-[2.05vw] leading-[1.22] text-pretty">Les paiements et les fichiers doivent rester traçables</div>
            <div className="col-span-2 border-t-[0.08vw] border-accent/50 pt-[1.8vh] text-[2.05vw] leading-[1.22] text-pretty">Les décisions doivent être vérifiables avant la livraison</div>
          </div>
        </div>
        <div className="flex justify-between text-[1.5vw] uppercase tracking-[0.18em] text-muted"><span>MAXIMUS ERP</span><span>02 / 10</span></div>
      </div>
    </div>
  );
}
