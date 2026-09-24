export default function NSGStock() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[7vh] text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">08 — GESTION DE STOCK · 1/3</div>
      <div className="relative flex h-full w-full flex-col px-[8vw] pt-[15vh] pb-[7vh]">
        <p className="text-[1.6vw] font-bold uppercase tracking-[0.16em] text-accent">MODULE À CONFIRMER</p>
        <h2 className="mt-[1.2vh] max-w-[76vw] font-display text-[4vw] font-semibold leading-[1.02]">Suivre les articles physiques détenus par NSG</h2>
        <p className="mt-[1.7vh] max-w-[72vw] text-[2.05vw] leading-[1.32] text-muted">La pertinence dépend de l’existence de fournitures, d’équipements ou de marchandises que NSG veut compter et contrôler.</p>
        <div className="mt-[4vh] grid flex-1 grid-cols-[1.05fr_0.95fr] gap-[3vw]">
          <div className="flex flex-col justify-center border-y border-primary/15 py-[2vh]">
            <h3 className="font-display text-[2.8vw] font-semibold">Exemples à valider</h3>
            <p className="mt-[1.8vh] text-[2.05vw] leading-[1.45] text-muted">Fournitures et consommables</p>
            <p className="text-[2.05vw] leading-[1.45] text-muted">Matériel et équipements d’activité</p>
            <p className="text-[2.05vw] leading-[1.45] text-muted">Emballages ou articles de manutention</p>
            <p className="text-[2.05vw] leading-[1.45] text-muted">Produits agricoles réellement stockés</p>
          </div>
          <div className="flex flex-col justify-center bg-primary px-[2.2vw] py-[3vh] text-white">
            <p className="text-[1.5vw] font-bold uppercase tracking-[0.15em] text-[#edc894]">QUESTION DE DÉCISION</p>
            <p className="mt-[2vh] font-display text-[3vw] leading-[1.16]">Quels articles NSG doit-elle compter, dans quels lieux, et avec quels responsables ?</p>
            <p className="mt-[2vh] text-[1.8vw] leading-[1.35] text-white/80">Sans stock physique à gérer, ne pas activer ce périmètre par défaut.</p>
          </div>
        </div>
        <div className="flex justify-end pt-[1.5vh] text-[1.5vw] text-muted"><span>08 / 25</span></div>
      </div>
    </div>
  );
}