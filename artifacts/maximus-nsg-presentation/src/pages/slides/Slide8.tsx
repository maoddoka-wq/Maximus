export default function Slide8() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg text-text font-body">
      <div className="absolute left-[8vw] top-[11vh] text-[1.5vw] font-semibold uppercase tracking-[0.2em] text-accent">
        08 — DÉMONSTRATION
      </div>
      <div className="relative flex h-full w-full flex-col px-[8vw] pt-[16vh] pb-[8vh]">
        <h2 className="max-w-[68vw] font-display text-[4vw] font-semibold leading-[1.02] tracking-[-0.055em]">
          Démonstration pour NSG
        </h2>
        <p className="mt-[1.8vh] text-[2vw] text-muted">
          Un aperçu concret des fonctionnalités disponibles aujourd’hui.
        </p>
        <div className="mt-[6vh] grid flex-1 grid-cols-4 gap-[1.1vw]">
          <div className="border-t-[0.25vw] border-accent bg-surface/70 px-[1.6vw] py-[2.5vh]">
            <p className="font-display text-[5vw] font-semibold leading-none tracking-[-0.06em] text-accent">01</p>
            <h3 className="mt-[2.5vh] font-display text-[2.3vw] font-semibold">Commerce</h3>
            <p className="mt-[1.4vh] text-[2vw] leading-[1.25] text-muted">Client, devis, commande et vente.</p>
          </div>
          <div className="border-t-[0.25vw] border-accent bg-surface/70 px-[1.6vw] py-[2.5vh]">
            <p className="font-display text-[5vw] font-semibold leading-none tracking-[-0.06em] text-accent">02</p>
            <h3 className="mt-[2.5vh] font-display text-[2.3vw] font-semibold">Stock</h3>
            <p className="mt-[1.4vh] text-[2vw] leading-[1.25] text-muted">Article, mouvement et inventaire.</p>
          </div>
          <div className="border-t-[0.25vw] border-accent bg-surface/70 px-[1.6vw] py-[2.5vh]">
            <p className="font-display text-[5vw] font-semibold leading-none tracking-[-0.06em] text-accent">03</p>
            <h3 className="mt-[2.5vh] font-display text-[2.3vw] font-semibold">Équipes</h3>
            <p className="mt-[1.4vh] text-[2vw] leading-[1.25] text-muted">Organisation, présences et paie.</p>
          </div>
          <div className="border-t-[0.25vw] border-teal bg-surface/70 px-[1.6vw] py-[2.5vh]">
            <p className="font-display text-[5vw] font-semibold leading-none tracking-[-0.06em] text-teal">04</p>
            <h3 className="mt-[2.5vh] font-display text-[2.3vw] font-semibold">Transport</h3>
            <p className="mt-[1.4vh] text-[2vw] leading-[1.25] text-muted">À montrer si les courses Taxi concernent NSG.</p>
          </div>
        </div>
        <div className="mt-[3vh] flex items-center justify-between border-t border-white/10 pt-[2vh]">
          <p className="max-w-[58vw] text-[2vw] leading-[1.25] text-text/90">
            MAXIMUS présente ici ses modules existants, sans attribuer au Transport une gestion du fret.
          </p>
          <span className="text-[1.5vw] uppercase tracking-[0.16em] text-muted">08 / 08</span>
        </div>
      </div>
    </div>
  );
}