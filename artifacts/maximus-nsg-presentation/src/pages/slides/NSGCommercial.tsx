export default function NSGCommercial() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[7vh] text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">05 — GESTION COMMERCIALE · 1/3</div>
      <div className="relative flex h-full w-full flex-col px-[8vw] pt-[15vh] pb-[7vh]">
        <p className="text-[1.6vw] font-bold uppercase tracking-[0.16em] text-teal">MODULE PRIORITAIRE</p>
        <h2 className="mt-[1.2vh] max-w-[74vw] font-display text-[4vw] font-semibold leading-[1.02]">Suivre la relation client et les opérations commerciales</h2>
        <p className="mt-[1.8vh] max-w-[70vw] text-[2.05vw] leading-[1.32] text-muted">Un socle pour structurer les informations clients, préparer les offres et suivre les ventes de NSG.</p>
        <div className="mt-[4vh] grid flex-1 grid-cols-3 gap-[1.4vw]">
          <div className="border-t-[0.35vh] border-accent bg-surface px-[1.7vw] py-[2.2vh]">
            <p className="text-[1.5vw] font-bold uppercase tracking-[0.14em] text-accent">RELATION CLIENT</p>
            <h3 className="mt-[1.6vh] font-display text-[2.6vw] font-semibold">Clients et fournisseurs</h3>
            <p className="mt-[1.2vh] text-[2vw] leading-[1.32] text-muted">Fiches de contact et repères utiles au suivi des échanges commerciaux.</p>
          </div>
          <div className="border-t-[0.35vh] border-teal bg-surface px-[1.7vw] py-[2.2vh]">
            <p className="text-[1.5vw] font-bold uppercase tracking-[0.14em] text-teal">CYCLE COMMERCIAL</p>
            <h3 className="mt-[1.6vh] font-display text-[2.6vw] font-semibold">Offres et ventes</h3>
            <p className="mt-[1.2vh] text-[2vw] leading-[1.32] text-muted">Devis, commandes, ventes, factures et achats selon les parcours retenus.</p>
          </div>
          <div className="border-t-[0.35vh] border-primary bg-surface px-[1.7vw] py-[2.2vh]">
            <p className="text-[1.5vw] font-bold uppercase tracking-[0.14em] text-primary">SUIVI</p>
            <h3 className="mt-[1.6vh] font-display text-[2.6vw] font-semibold">Activité et rapports</h3>
            <p className="mt-[1.2vh] text-[2vw] leading-[1.32] text-muted">Consulter les opérations et les indicateurs disponibles selon les permissions.</p>
          </div>
        </div>
        <div className="flex justify-between pt-[1.5vh] text-[1.5vw] text-muted"><span>Le périmètre documentaire doit être confirmé par NSG</span><span>05 / 25</span></div>
      </div>
    </div>
  );
}