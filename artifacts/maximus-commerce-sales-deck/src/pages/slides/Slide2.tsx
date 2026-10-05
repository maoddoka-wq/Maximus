export default function Slide2() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[7vw] top-[7vh]">
        <p className="font-mono text-[1.5vw] uppercase tracking-[0.14em] text-primary">
          Le pilotage commercial
        </p>
        <h1 className="mt-[2.2vh] text-balance font-display text-[4vw] font-bold leading-[1.02] tracking-[-0.05em]">
          La vente au-delà de la vitrine
        </h1>
        <p className="mt-[1.8vh] max-w-[75vw] text-pretty text-[2vw] leading-[1.3] text-muted">
          La boutique publique est un canal parmi d’autres : MAXIMUS accompagne
          aussi les ventes au magasin et leur suivi.
        </p>
      </div>
      <div className="absolute left-[7vw] top-[38vh] grid h-[43vh] w-[86vw] grid-cols-4 gap-[1.5vw]">
        <div className="flex flex-col justify-between rounded-[0.8rem] border border-border bg-surface p-[2.2vw]">
          <p className="font-mono text-[1.5vw] uppercase tracking-[0.1em] text-primary">
            01 / Produits
          </p>
          <div>
            <h2 className="font-display text-[2.7vw] font-bold tracking-[-0.04em]">
              Catalogue
            </h2>
            <p className="mt-[1.5vh] text-[2vw] leading-[1.25] text-muted">
              Des produits prêts à être présentés et vendus.
            </p>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-[0.8rem] border border-border bg-surface p-[2.2vw]">
          <p className="font-mono text-[1.5vw] uppercase tracking-[0.1em] text-primary">
            02 / En ligne
          </p>
          <div>
            <h2 className="font-display text-[2.7vw] font-bold tracking-[-0.04em]">
              Boutique
            </h2>
            <p className="mt-[1.5vh] text-[2vw] leading-[1.25] text-muted">
              Une vitrine publique, même sans site existant.
            </p>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-[0.8rem] border border-border bg-surface p-[2.2vw]">
          <p className="font-mono text-[1.5vw] uppercase tracking-[0.1em] text-primary">
            03 / En magasin
          </p>
          <div>
            <h2 className="font-display text-[2.7vw] font-bold tracking-[-0.04em]">
              Caisse
            </h2>
            <p className="mt-[1.5vh] text-[2vw] leading-[1.25] text-muted">
              Les ventes au comptoir enregistrées dans MAXIMUS.
            </p>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-[0.8rem] border border-border bg-secondary p-[2.2vw]">
          <p className="font-mono text-[1.5vw] uppercase tracking-[0.1em] text-primary">
            04 / Analyse
          </p>
          <div>
            <h2 className="font-display text-[2.7vw] font-bold tracking-[-0.04em]">
              Rapports
            </h2>
            <p className="mt-[1.5vh] text-[2vw] leading-[1.25] text-muted">
              L’activité filtrée par période et par source.
            </p>
          </div>
        </div>
      </div>
      <div className="absolute bottom-[5vh] left-[7vw] right-[7vw] flex justify-between border-t border-border pt-[1.7vh] font-mono text-[1.5vw] uppercase tracking-[0.08em] text-muted">
        <span>MAXIMUS · Centre de pilotage des ventes</span>
        <span>02 / 08</span>
      </div>
    </div>
  );
}
