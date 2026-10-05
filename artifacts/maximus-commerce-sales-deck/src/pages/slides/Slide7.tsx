export default function Slide7() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[7vw] top-[7vh]">
        <p className="font-mono text-[1.5vw] uppercase tracking-[0.14em] text-primary">
          Lire l’activité
        </p>
        <h1 className="mt-[2.2vh] text-balance font-display text-[4vw] font-bold leading-[1.02] tracking-[-0.05em]">
          Des rapports pour lire l’activité
        </h1>
        <p className="mt-[1.8vh] max-w-[78vw] text-pretty text-[2vw] leading-[1.3] text-muted">
          Filtrez par période et par source, puis consultez les ventes et les
          commandes dans leur contexte.
        </p>
      </div>
      <div className="absolute left-[7vw] top-[37vh] h-[47vh] w-[27vw] rounded-[0.8rem] border border-border bg-surface p-[2.2vw]">
        <p className="font-mono text-[1.5vw] uppercase tracking-[0.12em] text-primary">
          Filtres du rapport
        </p>
        <div className="mt-[2.5vh]">
          <p className="text-[2vw] font-semibold">Période</p>
          <div className="mt-[1vh] rounded-[0.8rem] border border-border bg-bg px-[1.3vw] py-[1.1vh] text-[2vw] text-muted">
            Période sélectionnée
          </div>
        </div>
        <div className="mt-[2.2vh]">
          <p className="text-[2vw] font-semibold">Source</p>
          <div className="mt-[1vh] rounded-[0.8rem] border border-border bg-bg px-[1.3vw] py-[1.1vh] text-[2vw] text-muted">
            En ligne ou comptoir
          </div>
        </div>
        <div className="mt-[2.8vh] border-t border-border pt-[1.8vh]">
          <p className="text-[2vw] leading-[1.25] text-muted">
            Choisissez le périmètre qui correspond à votre question.
          </p>
        </div>
      </div>
      <div className="absolute left-[38vw] top-[37vh] h-[47vh] w-[55vw] rounded-[0.8rem] border border-border bg-secondary p-[2.2vw]">
        <div className="flex items-start justify-between border-b border-border pb-[1.8vh]">
          <div>
            <p className="font-mono text-[1.5vw] uppercase tracking-[0.12em] text-primary">
              Rapport des ventes
            </p>
            <h2 className="mt-[0.7vh] font-display text-[2.7vw] font-bold tracking-[-0.04em]">
              Synthèse par canal
            </h2>
          </div>
          <p className="font-mono text-[1.5vw] uppercase tracking-[0.08em] text-muted">
            Résultats filtrés
          </p>
        </div>
        <div className="mt-[2.2vh] grid grid-cols-2 gap-[1.3vw]">
          <div className="rounded-[0.8rem] border border-border bg-surface p-[1.5vw]">
            <p className="font-mono text-[1.5vw] uppercase tracking-[0.08em] text-muted">
              Source
            </p>
            <p className="mt-[1vh] text-[2vw] font-semibold">
              Boutique en ligne
            </p>
          </div>
          <div className="rounded-[0.8rem] border border-border bg-surface p-[1.5vw]">
            <p className="font-mono text-[1.5vw] uppercase tracking-[0.08em] text-muted">
              Source
            </p>
            <p className="mt-[1vh] text-[2vw] font-semibold">
              Vente comptoir
            </p>
          </div>
        </div>
        <div className="mt-[2vh] flex items-center justify-between border-t border-border pt-[1.8vh]">
          <p className="text-[2vw] font-semibold">Totaux par devise</p>
          <p className="text-[2vw] text-muted">Statuts des commandes</p>
          <p className="font-mono text-[1.5vw] uppercase tracking-[0.08em] text-primary">
            Imprimer · PDF
          </p>
        </div>
        <p className="mt-[1.7vh] font-mono text-[1.5vw] tracking-[0.02em] text-muted">
          Chaque montant reste présenté dans sa devise d’origine.
        </p>
      </div>
      <div className="absolute bottom-[5vh] left-[7vw] right-[7vw] flex justify-between border-t border-border pt-[1.7vh] font-mono text-[1.5vw] uppercase tracking-[0.08em] text-muted">
        <span>MAXIMUS · Centre de pilotage des ventes</span>
        <span>07 / 08</span>
      </div>
    </div>
  );
}
