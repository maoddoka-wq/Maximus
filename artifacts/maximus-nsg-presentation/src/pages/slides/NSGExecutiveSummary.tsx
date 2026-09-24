export default function NSGExecutiveSummary() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[7vh] text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">02 — SYNTHÈSE EXÉCUTIVE</div>
      <div className="relative flex h-full w-full flex-col px-[8vw] pt-[15vh] pb-[7vh]">
        <h2 className="max-w-[76vw] font-display text-[4.1vw] font-semibold leading-[1.03]">Un socle opérationnel, avec des options justifiées par le besoin</h2>
        <p className="mt-[1.6vh] max-w-[70vw] text-[2.05vw] leading-[1.32] text-muted">La proposition sépare ce qui répond aux besoins de gestion interne de ce qui dépend du modèle de vente de NSG.</p>
        <div className="mt-[4vh] grid flex-1 grid-cols-[1.12fr_0.88fr] gap-[2vw]">
          <div className="flex flex-col justify-center bg-primary px-[2.3vw] py-[2.5vh] text-white">
            <p className="text-[1.5vw] font-bold uppercase tracking-[0.15em] text-[#edc894]">SOCLE À PRIORISER</p>
            <p className="mt-[1.8vh] font-display text-[3vw] leading-[1.15]">Gestion commerciale</p>
            <p className="mt-[0.5vh] font-display text-[3vw] leading-[1.15]">Présences</p>
            <p className="mt-[0.5vh] font-display text-[3vw] leading-[1.15]">Paie</p>
            <p className="mt-[1.8vh] max-w-[42vw] text-[1.9vw] leading-[1.35] text-white/80">À cadrer avec les responsables avant d’activer les parcours et de définir les permissions.</p>
          </div>
          <div className="flex flex-col justify-center gap-[2.4vh]">
            <div className="border-b border-primary/15 pb-[2vh]">
              <p className="text-[1.5vw] font-bold uppercase tracking-[0.14em] text-accent">STOCK · CONDITIONNEL</p>
              <p className="mt-[0.8vh] text-[2vw] leading-[1.34] text-muted">À retenir si NSG gère des articles physiques en entrepôt ou sur site.</p>
            </div>
            <div className="border-b border-primary/15 pb-[2vh]">
              <p className="text-[1.5vw] font-bold uppercase tracking-[0.14em] text-teal">E-COMMERCE · OPTION</p>
              <p className="mt-[0.8vh] text-[2vw] leading-[1.34] text-muted">À étudier pour présenter des produits agricoles et prendre des commandes directes en ligne.</p>
            </div>
            <div>
              <p className="text-[1.5vw] font-bold uppercase tracking-[0.14em] text-primary">TRANSIT ET DOUANE</p>
              <p className="mt-[0.8vh] text-[2vw] leading-[1.34] text-muted">Les opérations spécialisées restent dans les outils métier adaptés.</p>
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-[1.5vh] text-[1.5vw] text-muted"><span>02 / 25</span></div>
      </div>
    </div>
  );
}