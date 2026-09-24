export default function NSGDemoFlow() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[9vh] text-[1.5vw] font-semibold uppercase tracking-[0.2em] text-accent">
        10 — SCÉNARIO DE DÉMONSTRATION
      </div>
      <div className="relative flex h-full w-full flex-col px-[8vw] pt-[15vh] pb-[7vh]">
        <h2 className="font-display text-[3.8vw] font-semibold leading-[1.02] tracking-[-0.055em]">
          Valider les parcours sur des opérations test
        </h2>
        <p className="mt-[1.5vh] text-[1.9vw] leading-[1.25] text-muted">
          Une démonstration ciblée permet de vérifier l’adéquation avant de généraliser l’usage.
        </p>
        <div className="mt-[4vh] grid flex-1 grid-cols-5 gap-[1vw]">
          <div className="border-t-[0.25vw] border-accent bg-surface/80 p-[1.3vw]">
            <p className="font-display text-[3.2vw] font-semibold text-accent">01</p>
            <h3 className="mt-[1.2vh] font-display text-[2vw] font-semibold">Créer un client test</h3>
            <p className="mt-[1vh] text-[1.65vw] leading-[1.22] text-muted">Valider les champs et la visibilité de la fiche.</p>
          </div>
          <div className="border-t-[0.25vw] border-accent bg-surface/80 p-[1.3vw]">
            <p className="font-display text-[3.2vw] font-semibold text-accent">02</p>
            <h3 className="mt-[1.2vh] font-display text-[2vw] font-semibold">Préparer un devis</h3>
            <p className="mt-[1vh] text-[1.65vw] leading-[1.22] text-muted">Contrôler les articles et le circuit commercial.</p>
          </div>
          <div className="border-t-[0.25vw] border-accent bg-surface/80 p-[1.3vw]">
            <p className="font-display text-[3.2vw] font-semibold text-accent">03</p>
            <h3 className="mt-[1.2vh] font-display text-[2vw] font-semibold">Suivre la vente</h3>
            <p className="mt-[1vh] text-[1.65vw] leading-[1.22] text-muted">Examiner commande, facture et rapport.</p>
          </div>
          <div className="border-t-[0.25vw] border-teal bg-surface/80 p-[1.3vw]">
            <p className="font-display text-[3.2vw] font-semibold text-teal">04</p>
            <h3 className="mt-[1.2vh] font-display text-[2vw] font-semibold">Tester le stock</h3>
            <p className="mt-[1vh] text-[1.65vw] leading-[1.22] text-muted">À inclure seulement si un stock NSG est retenu.</p>
          </div>
          <div className="border-t-[0.25vw] border-accent bg-surface/80 p-[1.3vw]">
            <p className="font-display text-[3.2vw] font-semibold text-accent">05</p>
            <h3 className="mt-[1.2vh] font-display text-[2vw] font-semibold">Valider équipe & paie</h3>
            <p className="mt-[1vh] text-[1.65vw] leading-[1.22] text-muted">Tester permissions, pointage et circuit de paie.</p>
          </div>
        </div>
        <div className="flex justify-between pt-[1.5vh] text-[1.4vw] uppercase tracking-[0.16em] text-muted">
          <span>Utiliser des données de démonstration, non des dossiers clients réels</span>
          <span>10 / 12</span>
        </div>
      </div>
    </div>
  );
}