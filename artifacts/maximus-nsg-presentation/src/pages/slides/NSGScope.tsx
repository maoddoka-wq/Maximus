export default function NSGScope() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[9vh] text-[1.5vw] font-semibold uppercase tracking-[0.2em] text-accent">
        11 — PÉRIMÈTRE ET LIMITES
      </div>
      <div className="relative flex h-full w-full flex-col px-[8vw] pt-[14vh] pb-[5vh]">
        <h2 className="font-display text-[3.4vw] font-semibold leading-[1.02] tracking-[-0.055em]">
          Périmètre fonctionnel de la proposition
        </h2>
        <p className="mt-[1vh] text-[1.55vw] leading-[1.2] text-muted">
          Ce que les modules MAXIMUS présentés couvrent — et ce qu’ils ne remplacent pas.
        </p>
        <div className="mt-[2.5vh] grid flex-1 grid-cols-2 gap-[1.3vw]">
          <div className="border border-accent/35 bg-accent/10 p-[1.6vw]">
            <p className="text-[1.3vw] font-semibold uppercase tracking-[0.16em] text-accent">COUVERT PAR LES MODULES PRÉSENTÉS</p>
            <h3 className="mt-[1.2vh] font-display text-[2.2vw] font-semibold">Gestion interne de NSG</h3>
            <ul className="mt-[1.5vh] space-y-[0.8vh] text-[1.65vw] leading-[1.2] text-muted">
              <li>Suivi commercial des clients et des ventes</li>
              <li>Gestion d’articles et mouvements de stock</li>
              <li>Présences, absences et horaires</li>
              <li>Préparation et suivi des opérations de paie</li>
            </ul>
          </div>
          <div className="border border-white/10 bg-surface/85 p-[1.6vw]">
            <p className="text-[1.3vw] font-semibold uppercase tracking-[0.16em] text-muted">HORS PÉRIMÈTRE MAXIMUS PRÉSENTÉ</p>
            <h3 className="mt-[1.2vh] font-display text-[2.2vw] font-semibold">Dossiers métier spécialisés</h3>
            <ul className="mt-[1.5vh] space-y-[0.8vh] text-[1.65vw] leading-[1.2] text-muted">
              <li>Gestion détaillée des dossiers de transit</li>
              <li>Préparation et dépôt de déclarations douanières</li>
              <li>Suivi multimodal des expéditions</li>
              <li>Échanges automatisés avec les systèmes douaniers</li>
            </ul>
          </div>
        </div>
        <p className="pt-[1.2vh] text-[1.35vw] leading-[1.2] text-muted">
          Ces besoins relèvent des outils métier déjà utilisés par NSG ou d’un cadrage séparé.
        </p>
        <div className="flex justify-end pt-[0.6vh] text-[1.3vw] uppercase tracking-[0.16em] text-muted">
          <span>11 / 12</span>
        </div>
      </div>
    </div>
  );
}