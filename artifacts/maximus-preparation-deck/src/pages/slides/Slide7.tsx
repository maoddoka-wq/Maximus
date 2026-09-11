export default function Slide7() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text font-body">
      <div className="absolute left-0 top-0 h-full w-[22vw] bg-primary/45" />
      <div className="absolute right-[8vw] top-[11vh] text-[1.5vw] font-semibold uppercase tracking-[0.22em] text-accent">06 — Finance</div>
      <div className="relative flex h-full w-full flex-col px-[8vw] py-[10vh]">
        <h2 className="max-w-[70vw] font-display text-[3.8vw] font-semibold leading-[1.02] tracking-[-0.055em] text-balance">Du paiement au règlement</h2>
        <div className="mt-[5vh] grid flex-1 grid-cols-[0.95fr_1.65fr] gap-[6vw]">
          <div className="flex flex-col justify-center">
            <div className="border-l-[0.2vw] border-accent pl-[2vw]"><div className="font-display text-[6.4vw] font-semibold leading-[0.85] tracking-[-0.1em] text-accent">3 %</div><div className="mt-[1vh] text-[1.7vw] uppercase tracking-[0.16em] text-muted">DiamanoPay</div></div>
            <div className="mt-[5vh] border-l-[0.2vw] border-white/35 pl-[2vw]"><div className="font-display text-[6.4vw] font-semibold leading-[0.85] tracking-[-0.1em]">2 %</div><div className="mt-[1vh] text-[1.7vw] uppercase tracking-[0.16em] text-muted">MAXIMUS</div></div>
            <div className="mt-[5vh] border-l-[0.2vw] border-[var(--slide-teal)] pl-[2vw]"><div className="font-display text-[6.4vw] font-semibold leading-[0.85] tracking-[-0.1em] text-[var(--slide-teal)]">95 %</div><div className="mt-[1vh] text-[1.7vw] uppercase tracking-[0.16em] text-muted">Vendeur</div></div>
          </div>
          <div className="grid grid-cols-2 gap-x-[4vw] gap-y-[2.5vh] pt-[1vh]">
            <div className="col-span-2 border-t-[0.08vw] border-accent/55 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">DiamanoPay confirme le paiement avant la finalisation</div>
            <div className="border-t-[0.08vw] border-white/15 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">Le stock est réservé puis libéré si le paiement échoue</div>
            <div className="border-t-[0.08vw] border-white/15 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">Chaque vente répartit 3 % à DiamanoPay, 2 % à MAXIMUS et 95 % au vendeur</div>
            <div className="border-t-[0.08vw] border-white/15 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">Le vendeur peut retirer les fonds après livraison ou après sept jours sans litige</div>
            <div className="border-t-[0.08vw] border-accent/55 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">Les règlements sont réconciliables sans double crédit</div>
          </div>
        </div>
        <div className="flex justify-between text-[1.5vw] uppercase tracking-[0.18em] text-muted"><span>MAXIMUS ERP</span><span>07 / 10</span></div>
      </div>
    </div>
  );
}
