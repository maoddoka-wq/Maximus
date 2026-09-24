export default function NSGRecommendation() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[9vh] text-[1.5vw] font-semibold uppercase tracking-[0.2em] text-accent">
        04 — CONFIGURATION PROPOSÉE
      </div>
      <div className="relative flex h-full w-full flex-col px-[8vw] pt-[15vh] pb-[7vh]">
        <h2 className="font-display text-[3.7vw] font-semibold leading-[1.02] tracking-[-0.055em]">
          Modules recommandés pour NSG
        </h2>
        <p className="mt-[1.5vh] text-[1.9vw] leading-[1.25] text-muted">
          Les priorités sont distinctes des options qui nécessitent une décision préalable.
        </p>
        <div className="mt-[3.5vh] grid flex-1 grid-cols-2 grid-rows-2 gap-[1.2vw]">
          <div className="border border-accent/40 bg-accent/10 p-[1.7vw]">
            <p className="text-[1.5vw] font-semibold uppercase tracking-[0.18em] text-accent">PRIORITÉ</p>
            <h3 className="mt-[1.2vh] font-display text-[2.5vw] font-semibold">Gestion commerciale</h3>
            <p className="mt-[1vh] text-[1.85vw] leading-[1.25] text-muted">
              Clients, devis, ventes, factures, achats et fournisseurs.
            </p>
          </div>
          <div className="border border-white/10 bg-surface/85 p-[1.7vw]">
            <p className="text-[1.5vw] font-semibold uppercase tracking-[0.18em] text-teal">ÉQUIPES</p>
            <h3 className="mt-[1.2vh] font-display text-[2.5vw] font-semibold">Présences + Paie</h3>
            <p className="mt-[1vh] text-[1.85vw] leading-[1.25] text-muted">
              Pointage, absences, préparation et suivi des opérations de paie.
            </p>
          </div>
          <div className="border border-white/10 bg-surface/85 p-[1.7vw]">
            <p className="text-[1.5vw] font-semibold uppercase tracking-[0.18em] text-accent">À CONFIRMER</p>
            <h3 className="mt-[1.2vh] font-display text-[2.5vw] font-semibold">Gestion de stock</h3>
            <p className="mt-[1vh] text-[1.85vw] leading-[1.25] text-muted">
              À retenir si NSG suit des articles ou équipements physiquement stockés.
            </p>
          </div>
          <div className="border border-white/10 bg-surface/85 p-[1.7vw]">
            <p className="text-[1.5vw] font-semibold uppercase tracking-[0.18em] text-muted">OPTION</p>
            <h3 className="mt-[1.2vh] font-display text-[2.5vw] font-semibold">E-commerce</h3>
            <p className="mt-[1vh] text-[1.85vw] leading-[1.25] text-muted">
              À étudier si NSG veut vendre des produits agricoles directement en ligne.
            </p>
          </div>
        </div>
        <div className="flex justify-between pt-[1.5vh] text-[1.4vw] uppercase tracking-[0.16em] text-muted">
          <span>Les rôles et permissions s’appliquent à tous les modules retenus</span>
          <span>04 / 25</span>
        </div>
      </div>
    </div>
  );
}