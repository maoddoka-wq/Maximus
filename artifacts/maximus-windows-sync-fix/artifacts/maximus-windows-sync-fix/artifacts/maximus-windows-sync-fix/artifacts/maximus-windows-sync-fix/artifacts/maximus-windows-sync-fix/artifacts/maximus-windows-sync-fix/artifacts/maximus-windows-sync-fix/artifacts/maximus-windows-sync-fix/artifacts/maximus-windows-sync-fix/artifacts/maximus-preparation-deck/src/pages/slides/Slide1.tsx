const base = import.meta.env.BASE_URL;

export default function Slide1() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text font-body">
      <img src={base + 'maximus-hero.png'} crossOrigin="anonymous" className="absolute inset-0 h-full w-full object-cover opacity-70" alt="Centre de pilotage opérationnel" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,20,36,0.98)_0%,rgba(11,20,36,0.84)_42%,rgba(11,20,36,0.25)_100%)]" />
      <div className="absolute inset-0 deck-grid opacity-30" />
      <div className="absolute left-[8vw] top-[13vh] h-[74vh] w-[0.22vw] bg-accent" />
      <div className="relative z-10 flex h-full w-full flex-col justify-between px-[10vw] py-[10vh]">
        <div className="flex items-center gap-[1.2vw] text-[1.5vw] font-semibold uppercase tracking-[0.22em] text-accent">
          <span className="h-[0.8vw] w-[0.8vw] rounded-full bg-accent" />
          MAXIMUS ERP
        </div>
        <div className="max-w-[58vw]">
          <h1 className="font-display text-[6.6vw] font-semibold leading-[0.94] tracking-[-0.07em] text-balance">MAXIMUS ERP</h1>
          <div className="mt-[4vh] deck-rule w-[11vw]" />
          <p className="mt-[3vh] max-w-[46vw] font-display text-[2.45vw] font-medium leading-[1.16] text-pretty">Piloter chaque entreprise, chaque secteur et chaque opération depuis un seul espace.</p>
          <div className="mt-[5vh] grid max-w-[48vw] grid-cols-3 gap-[1.1vw] text-[1.5vw] leading-[1.25] text-muted">
            <div className="border-l-[0.16vw] border-accent/70 pl-[1vw]">Présentation de préparation</div>
            <div className="border-l-[0.16vw] border-accent/70 pl-[1vw]">Plateforme modulaire multi-entreprises</div>
            <div className="border-l-[0.16vw] border-accent/70 pl-[1vw]">Déploiement en production sur Render</div>
          </div>
        </div>
        <div className="flex items-end justify-between text-[1.5vw] uppercase tracking-[0.18em] text-muted">
          <span>Présentation de préparation</span>
          <span>01 / 10</span>
        </div>
      </div>
    </div>
  );
}
