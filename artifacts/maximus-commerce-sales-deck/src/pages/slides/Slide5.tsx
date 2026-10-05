export default function Slide5() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[7vw] top-[7vh]">
        <p className="font-mono text-[1.5vw] uppercase tracking-[0.14em] text-primary">
          Vente en magasin
        </p>
        <h1 className="mt-[2.2vh] text-balance font-display text-[4vw] font-bold leading-[1.02] tracking-[-0.05em]">
          La caisse au rythme du magasin
        </h1>
        <p className="mt-[1.8vh] max-w-[76vw] text-pretty text-[2vw] leading-[1.3] text-muted">
          Enregistrez les ventes physiques et leur moyen d’encaissement dans
          MAXIMUS.
        </p>
      </div>
      <div className="absolute left-[7vw] top-[37vh] h-[48vh] w-[55vw] rounded-[0.8rem] border border-border bg-surface p-[2.4vw]">
        <div className="flex items-center justify-between border-b border-border pb-[2vh]">
          <div>
            <p className="font-mono text-[1.5vw] uppercase tracking-[0.12em] text-primary">
              Point de vente
            </p>
            <h2 className="mt-[0.8vh] font-display text-[2.7vw] font-bold tracking-[-0.04em]">
              Vente comptoir
            </h2>
          </div>
          <div className="rounded-full border border-primary px-[1.4vw] py-[1vh] font-mono text-[1.5vw] uppercase tracking-[0.08em] text-primary">
            En magasin
          </div>
        </div>
        <div className="mt-[2.4vh] grid grid-cols-[1fr_auto] gap-[1.5vw]">
          <div className="rounded-[0.8rem] border border-border bg-secondary p-[1.8vw]">
            <p className="font-mono text-[1.5vw] uppercase tracking-[0.1em] text-muted">
              Articles
            </p>
            <div className="mt-[2vh] flex items-center justify-between border-b border-border pb-[1.4vh]">
              <p className="text-[2vw] font-semibold">Produits publiés en stock</p>
              <p className="font-mono text-[1.5vw] text-primary">Choisir</p>
            </div>
            <div className="mt-[1.5vh] flex items-center justify-between">
              <p className="text-[2vw] text-muted">Quantités de la vente</p>
              <div className="h-[2.2vh] w-[8vw] rounded-full bg-bg" />
            </div>
          </div>
          <div className="flex w-[17vw] flex-col justify-between rounded-[0.8rem] bg-primary p-[1.8vw] text-bg">
            <p className="font-mono text-[1.5vw] uppercase tracking-[0.1em]">
              Paiement
            </p>
            <div>
              <p className="font-display text-[2.4vw] font-bold leading-[1.05] tracking-[-0.04em]">
                Choisissez le mode d’encaissement
              </p>
              <div className="mt-[1.8vh] h-[0.5vh] w-[5vw] rounded-full bg-bg" />
            </div>
          </div>
        </div>
      </div>
      <div className="absolute left-[67vw] top-[41vh] w-[26vw]">
        <p className="font-mono text-[1.5vw] uppercase tracking-[0.12em] text-primary">
          Modes acceptés
        </p>
        <div className="mt-[1.8vh] space-y-[1.4vh]">
          <div className="rounded-[0.8rem] border border-border bg-surface px-[1.7vw] py-[1.4vh] text-[2vw] font-semibold">
            Espèces
          </div>
          <div className="rounded-[0.8rem] border border-border bg-surface px-[1.7vw] py-[1.4vh] text-[2vw] font-semibold">
            Wave
          </div>
          <div className="rounded-[0.8rem] border border-border bg-surface px-[1.7vw] py-[1.4vh] text-[2vw] font-semibold">
            Orange Money
          </div>
        </div>
        <p className="mt-[2.2vh] text-[2vw] leading-[1.3] text-muted">
          La vente rejoint ensuite l’activité récente du point de vente.
        </p>
      </div>
      <div className="absolute bottom-[5vh] left-[7vw] right-[7vw] flex justify-between border-t border-border pt-[1.7vh] font-mono text-[1.5vw] uppercase tracking-[0.08em] text-muted">
        <span>MAXIMUS · Centre de pilotage des ventes</span>
        <span>05 / 08</span>
      </div>
    </div>
  );
}
