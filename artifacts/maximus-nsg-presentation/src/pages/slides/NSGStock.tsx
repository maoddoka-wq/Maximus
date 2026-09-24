export default function NSGStock() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[9vh] text-[1.5vw] font-semibold uppercase tracking-[0.2em] text-accent">
        05 — MODULE À CONFIRMER
      </div>
      <div className="relative flex h-full w-full flex-col px-[8vw] pt-[15vh] pb-[7vh]">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[1.5vw] font-semibold uppercase tracking-[0.18em] text-accent">02 / GESTION DE STOCK</p>
            <h2 className="mt-[1vh] font-display text-[3.8vw] font-semibold leading-[1.02] tracking-[-0.055em]">
              Suivre les articles et les mouvements
            </h2>
          </div>
          <p className="font-display text-[7vw] font-semibold leading-none tracking-[-0.08em] text-accent/90">02</p>
        </div>
        <div className="mt-[2vh] flex items-center gap-[1vw] border border-accent/35 bg-accent/10 px-[1.6vw] py-[1.3vh]">
          <span className="text-[1.5vw] font-semibold uppercase tracking-[0.15em] text-accent">À valider avec NSG</span>
          <span className="text-[1.8vw] text-muted">Le module est utile si l’entreprise tient des stocks physiques à suivre.</span>
        </div>
        <div className="mt-[3vh] grid flex-1 grid-cols-2 gap-[1.2vw]">
          <div className="border border-white/10 bg-surface/80 p-[1.7vw]">
            <h3 className="font-display text-[2.35vw] font-semibold">Articles possibles</h3>
            <ul className="mt-[1.4vh] space-y-[0.8vh] text-[1.85vw] leading-[1.23] text-muted">
              <li>Consommables et fournitures</li>
              <li>Équipements ou matériel d’activité</li>
              <li>Emballages et articles de manutention</li>
              <li>Produits agricoles, si NSG les stocke</li>
            </ul>
          </div>
          <div className="border border-white/10 bg-surface/80 p-[1.7vw]">
            <h3 className="font-display text-[2.35vw] font-semibold">Opérations disponibles</h3>
            <ul className="mt-[1.4vh] space-y-[0.8vh] text-[1.85vw] leading-[1.23] text-muted">
              <li>Fiches articles et références</li>
              <li>Entrées, sorties et demandes</li>
              <li>Inventaires et rapports</li>
              <li>Alertes liées aux seuils de stock</li>
            </ul>
          </div>
        </div>
        <p className="pt-[1.5vh] text-[1.55vw] leading-[1.2] text-muted">
          Ces exemples sont à confirmer ; le module porte sur les stocks d’articles, pas sur les dossiers douaniers ou de transit.
        </p>
        <div className="flex justify-end pt-[1vh] text-[1.4vw] uppercase tracking-[0.16em] text-muted">
          <span>05 / 12</span>
        </div>
      </div>
    </div>
  );
}