export default function NSGScope() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[9vh] text-[1.5vw] font-semibold uppercase tracking-[0.2em] text-accent">
        11 — PÉRIMÈTRE ET LIMITES
      </div>
      <div className="relative flex h-full w-full flex-col px-[8vw] pt-[15vh] pb-[7vh]">
        <h2 className="max-w-[76vw] font-display text-[3.5vw] font-semibold leading-[1.04] tracking-[-0.055em]">
          Distinguer gestion d’entreprise et opérations spécialisées
        </h2>
        <div className="mt-[3.5vh] grid flex-1 grid-cols-2 gap-[1.3vw]">
          <div className="border border-accent/35 bg-accent/10 p-[2vw]">
            <p className="text-[1.5vw] font-semibold uppercase tracking-[0.16em] text-accent">COUVERT PAR LES MODULES PRÉSENTÉS</p>
            <h3 className="mt-[1.8vh] font-display text-[2.5vw] font-semibold">Gestion interne de NSG</h3>
            <ul className="mt-[2vh] space-y-[1.1vh] text-[1.9vw] leading-[1.24] text-muted">
              <li>Suivi commercial des clients et des ventes</li>
              <li>Gestion d’articles et mouvements de stock</li>
              <li>Présences, absences et horaires</li>
              <li>Préparation et suivi des opérations de paie</li>
            </ul>
          </div>
          <div className="border border-white/10 bg-surface/85 p-[2vw]">
            <p className="text-[1.5vw] font-semibold uppercase tracking-[0.16em] text-muted">À NE PAS PRÉSENTER COMME DISPONIBLE</p>
            <h3 className="mt-[1.8vh] font-display text-[2.5vw] font-semibold">Dossiers métier spécialisés</h3>
            <ul className="mt-[2vh] space-y-[1.1vh] text-[1.9vw] leading-[1.24] text-muted">
              <li>Gestion détaillée des dossiers de transit</li>
              <li>Préparation ou dépôt de déclarations douanières</li>
              <li>Suivi multimodal des expéditions et formalités associées</li>
              <li>Échanges automatisés avec les systèmes douaniers</li>
            </ul>
          </div>
        </div>
        <p className="pt-[1.5vh] text-[1.65vw] leading-[1.25] text-muted">
          Ces besoins doivent être couverts par les outils métier déjà utilisés par NSG ou faire l’objet d’un cadrage séparé.
        </p>
        <div className="flex justify-end pt-[1vh] text-[1.4vw] uppercase tracking-[0.16em] text-muted">
          <span>11 / 12</span>
        </div>
      </div>
    </div>
  );
}