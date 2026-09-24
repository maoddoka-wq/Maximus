export default function Commerce() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[10vh] text-[1.5vw] font-semibold uppercase tracking-[0.2em] text-accent">
        04 — MODULE MÉTIER
      </div>
      <div className="relative flex h-full w-full items-center gap-[8vw] px-[10vw] py-[12vh]">
        <div className="w-[35vw]">
          <p className="font-display text-[10vw] font-semibold leading-none tracking-[-0.08em] text-accent">01</p>
          <p className="mt-[2vh] text-[1.6vw] font-semibold uppercase tracking-[0.2em] text-muted">
            CLIENTS · VENTES · ACHATS
          </p>
        </div>
        <div className="max-w-[45vw]">
          <h2 className="font-display text-[4vw] font-semibold leading-[1.02] tracking-[-0.055em]">
            Gestion commerciale
          </h2>
          <div className="mt-[3vh] deck-rule w-[8vw]" />
          <div className="mt-[4vh] space-y-[2.2vh] text-[2.15vw] leading-[1.24]">
            <p>Fiches clients et suivi commercial</p>
            <p>Devis, commandes, factures et ventes</p>
            <p>Produits, fournisseurs et achats</p>
            <p>Rapports et indicateurs d’activité</p>
          </div>
        </div>
        <div className="absolute bottom-[5vh] left-[8vw] right-[8vw] flex justify-between text-[1.5vw] uppercase tracking-[0.16em] text-muted">
          <span>MAXIMUS ERP</span>
          <span>04 / 09</span>
        </div>
      </div>
    </div>
  );
}