export default function Slide6() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[7vw] top-[7vh]">
        <p className="font-mono text-[1.5vw] uppercase tracking-[0.14em] text-primary">
          Garder le fil
        </p>
        <h1 className="mt-[2.2vh] text-balance font-display text-[4vw] font-bold leading-[1.02] tracking-[-0.05em]">
          Le suivi des commandes et des ventes
        </h1>
        <p className="mt-[1.8vh] max-w-[76vw] text-pretty text-[2vw] leading-[1.3] text-muted">
          Chaque canal garde ses repères, de la commande en ligne aux ventes
          enregistrées au comptoir.
        </p>
      </div>
      <div className="absolute left-[7vw] top-[37vh] h-[49vh] w-[41vw] rounded-[0.8rem] border border-border bg-surface p-[2.4vw]">
        <div className="flex items-center justify-between border-b border-border pb-[1.8vh]">
          <p className="font-mono text-[1.5vw] uppercase tracking-[0.1em] text-primary">
            Canal 01
          </p>
          <p className="font-mono text-[1.5vw] uppercase tracking-[0.1em] text-muted">
            En ligne
          </p>
        </div>
        <h2 className="mt-[2.5vh] font-display text-[3.1vw] font-bold leading-[1.04] tracking-[-0.04em]">
          Commandes de la boutique
        </h2>
        <div className="mt-[2.5vh] space-y-[1.8vh]">
          <div className="flex items-center justify-between border-b border-border pb-[1.5vh]">
            <p className="text-[2vw]">Consulter les commandes</p>
            <div className="h-[1.1vh] w-[3vw] rounded-full bg-primary" />
          </div>
          <div className="flex items-center justify-between border-b border-border pb-[1.5vh]">
            <p className="text-[2vw]">Vérifier leur état</p>
            <div className="h-[1.1vh] w-[3vw] rounded-full bg-secondary" />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[2vw]">Retrouver l’activité récente</p>
            <div className="h-[1.1vh] w-[3vw] rounded-full bg-secondary" />
          </div>
        </div>
      </div>
      <div className="absolute left-[52vw] top-[37vh] h-[49vh] w-[41vw] rounded-[0.8rem] border border-border bg-secondary p-[2.4vw]">
        <div className="flex items-center justify-between border-b border-border pb-[1.8vh]">
          <p className="font-mono text-[1.5vw] uppercase tracking-[0.1em] text-primary">
            Canal 02
          </p>
          <p className="font-mono text-[1.5vw] uppercase tracking-[0.1em] text-muted">
            Au comptoir
          </p>
        </div>
        <h2 className="mt-[2.5vh] font-display text-[3.1vw] font-bold leading-[1.04] tracking-[-0.04em]">
          Activité du magasin
        </h2>
        <div className="mt-[2.5vh] space-y-[1.8vh]">
          <div className="flex items-center justify-between border-b border-border pb-[1.5vh]">
            <p className="text-[2vw]">Consulter la synthèse du jour</p>
            <div className="h-[1.1vh] w-[3vw] rounded-full bg-primary" />
          </div>
          <div className="flex items-center justify-between border-b border-border pb-[1.5vh]">
            <p className="text-[2vw]">Parcourir les ventes récentes</p>
            <div className="h-[1.1vh] w-[3vw] rounded-full bg-secondary" />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[2vw]">Garder une vue sur les encaissements</p>
            <div className="h-[1.1vh] w-[3vw] rounded-full bg-secondary" />
          </div>
        </div>
      </div>
      <div className="absolute bottom-[5vh] left-[7vw] right-[7vw] flex justify-between border-t border-border pt-[1.7vh] font-mono text-[1.5vw] uppercase tracking-[0.08em] text-muted">
        <span>MAXIMUS · Centre de pilotage des ventes</span>
        <span>06 / 08</span>
      </div>
    </div>
  );
}
