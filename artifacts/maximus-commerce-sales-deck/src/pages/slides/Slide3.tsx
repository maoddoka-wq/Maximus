export default function Slide3() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[7vw] top-[7vh]">
        <p className="font-mono text-[1.5vw] uppercase tracking-[0.14em] text-primary">
          Deux façons de vendre
        </p>
        <h1 className="mt-[2.2vh] text-balance font-display text-[4vw] font-bold leading-[1.02] tracking-[-0.05em]">
          Un catalogue, deux canaux de vente
        </h1>
        <p className="mt-[1.8vh] max-w-[76vw] text-pretty text-[2vw] leading-[1.3] text-muted">
          Présentez vos produits en ligne ou enregistrez la vente directement au
          magasin.
        </p>
      </div>
      <div className="absolute left-[8vw] top-[49vh] flex h-[22vh] w-[25vw] flex-col justify-between rounded-[0.8rem] border border-border bg-surface p-[2.3vw]">
        <p className="font-mono text-[1.5vw] uppercase tracking-[0.1em] text-primary">
          Votre catalogue
        </p>
        <div>
          <h2 className="font-display text-[2.8vw] font-bold tracking-[-0.04em]">
            Produits
          </h2>
          <p className="mt-[1vh] text-[2vw] leading-[1.2] text-muted">
            Articles publiés, prêts à vendre.
          </p>
        </div>
      </div>
      <div className="absolute left-[33vw] top-[59.5vh] h-[0.4vh] w-[10vw] bg-primary" />
      <div className="absolute left-[42.5vw] top-[42vh] h-[35vh] w-[0.4vw] bg-primary" />
      <div className="absolute left-[42.5vw] top-[42vh] h-[0.4vh] w-[7vw] bg-primary" />
      <div className="absolute left-[42.5vw] top-[77vh] h-[0.4vh] w-[7vw] bg-primary" />
      <div className="absolute left-[49vw] top-[33vh] flex h-[25vh] w-[42vw] flex-col justify-between rounded-[0.8rem] border border-border bg-secondary p-[2.3vw]">
        <p className="font-mono text-[1.5vw] uppercase tracking-[0.1em] text-primary">
          Canal en ligne
        </p>
        <div>
          <h2 className="font-display text-[3vw] font-bold tracking-[-0.04em]">
            Boutique publique
          </h2>
          <p className="mt-[1.2vh] text-[2vw] text-muted">
            Les clients découvrent vos produits et passent commande.
          </p>
        </div>
      </div>
      <div className="absolute left-[49vw] top-[64vh] flex h-[25vh] w-[42vw] flex-col justify-between rounded-[0.8rem] border border-border bg-surface p-[2.3vw]">
        <p className="font-mono text-[1.5vw] uppercase tracking-[0.1em] text-primary">
          Canal en magasin
        </p>
        <div>
          <h2 className="font-display text-[3vw] font-bold tracking-[-0.04em]">
            Caisse comptoir
          </h2>
          <p className="mt-[1.2vh] text-[2vw] text-muted">
            Vous enregistrez les ventes réalisées au point de vente.
          </p>
        </div>
      </div>
      <div className="absolute bottom-[5vh] left-[7vw] right-[7vw] flex justify-between border-t border-border pt-[1.7vh] font-mono text-[1.5vw] uppercase tracking-[0.08em] text-muted">
        <span>MAXIMUS · Centre de pilotage des ventes</span>
        <span>03 / 08</span>
      </div>
    </div>
  );
}
