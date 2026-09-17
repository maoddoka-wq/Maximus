export default function Slide10() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text font-body deck-grid">
      <div className="absolute inset-x-0 bottom-0 h-[1.2vh] bg-accent" />
      <div className="absolute right-[8vw] top-[11vh] text-[1.5vw] font-semibold uppercase tracking-[0.22em] text-accent">09 — Démonstration</div>
      <div className="relative flex h-full w-full flex-col px-[8vw] py-[10vh]">
        <h2 className="max-w-[72vw] font-display text-[3.8vw] font-semibold leading-[1.02] tracking-[-0.055em] text-balance">Préparer la démonstration</h2>
        <div className="mt-[5vh] grid flex-1 grid-cols-[1.45fr_0.85fr] gap-[6vw]">
          <div className="grid grid-cols-2 gap-x-[4vw] gap-y-[2.7vh] pt-[1vh]">
            <div className="border-t-[0.08vw] border-accent/55 pt-[1.8vh]"><div className="font-display text-[2.5vw] font-semibold text-accent">01</div><p className="mt-[1.3vh] text-[2.05vw] leading-[1.18] text-pretty">Se connecter et ouvrir l’espace entreprise</p></div>
            <div className="border-t-[0.08vw] border-white/15 pt-[1.8vh]"><div className="font-display text-[2.5vw] font-semibold text-accent">02</div><p className="mt-[1.3vh] text-[2.05vw] leading-[1.18] text-pretty">Présenter la structure, les secteurs et les permissions</p></div>
            <div className="border-t-[0.08vw] border-white/15 pt-[1.8vh]"><div className="font-display text-[2.5vw] font-semibold text-accent">03</div><p className="mt-[1.3vh] text-[2.05vw] leading-[1.18] text-pretty">Montrer un parcours Stock → Commerce → Encaissement</p></div>
            <div className="border-t-[0.08vw] border-white/15 pt-[1.8vh]"><div className="font-display text-[2.5vw] font-semibold text-accent">04</div><p className="mt-[1.3vh] text-[2.05vw] leading-[1.18] text-pretty">Ouvrir la boutique et parcourir un achat client</p></div>
            <div className="border-t-[0.08vw] border-white/15 pt-[1.8vh]"><div className="font-display text-[2.5vw] font-semibold text-accent">05</div><p className="mt-[1.3vh] text-[2.05vw] leading-[1.18] text-pretty">Vérifier le paiement, le portefeuille et le téléchargement</p></div>
            <div className="border-t-[0.08vw] border-accent/55 pt-[1.8vh]"><div className="font-display text-[2.5vw] font-semibold text-accent">06</div><p className="mt-[1.3vh] text-[2.05vw] leading-[1.18] text-pretty">Terminer par la santé Render et les prochaines étapes</p></div>
          </div>
          <div className="flex flex-col justify-end border-l-[0.16vw] border-accent pl-[3vw] pb-[2vh]">
            <div className="font-display text-[5.8vw] font-semibold leading-[0.92] tracking-[-0.08em] text-balance">MAXIMUS</div>
            <div className="mt-[2.5vh] h-[0.16vw] w-[11vw] bg-accent" />
            <p className="mt-[2.5vh] max-w-[22vw] font-display text-[2.2vw] font-medium leading-[1.15] text-pretty">une plateforme opérationnelle, contrôlée et extensible.</p>
          </div>
        </div>
        <div className="flex justify-between text-[1.5vw] uppercase tracking-[0.18em] text-muted"><span>MAXIMUS ERP</span><span>10 / 10</span></div>
      </div>
    </div>
  );
}
