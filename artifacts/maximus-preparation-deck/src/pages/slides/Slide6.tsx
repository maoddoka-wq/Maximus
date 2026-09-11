export default function Slide6() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text font-body deck-grid">
      <div className="absolute right-[8vw] top-[11vh] text-[1.5vw] font-semibold uppercase tracking-[0.22em] text-accent">05 — E-commerce</div>
      <div className="relative flex h-full w-full flex-col px-[8vw] py-[10vh]">
        <h2 className="max-w-[76vw] font-display text-[3.8vw] font-semibold leading-[1.02] tracking-[-0.055em] text-balance">Une expérience e-commerce complète</h2>
        <div className="mt-[5vh] grid flex-1 grid-cols-[0.9fr_1.8fr] gap-[5vw]">
          <div className="relative overflow-hidden border border-accent/45 bg-accent/10 p-[2.5vw]">
            <div className="absolute right-[-4vw] top-[-4vw] h-[18vw] w-[18vw] rounded-full border-[0.08vw] border-accent/35" />
            <div className="relative"><div className="text-[1.5vw] uppercase tracking-[0.2em] text-accent">Parcours public</div><div className="mt-[4vh] font-display text-[4.4vw] font-semibold leading-[0.95] tracking-[-0.07em]">Boutique</div><div className="mt-[1vh] font-display text-[4.4vw] font-semibold leading-[0.95] tracking-[-0.07em] text-accent">isolée</div><div className="mt-[5vh] h-[0.16vw] w-[10vw] bg-accent" /><p className="mt-[2vh] text-[1.8vw] leading-[1.25] text-muted">Une vitrine, un panier et des commandes séparés pour chaque boutique.</p></div>
          </div>
          <div className="grid grid-cols-2 gap-x-[4vw] gap-y-[2.4vh] pt-[1vh]">
            <div className="border-t-[0.08vw] border-accent/55 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">Boutique publique par slug ou domaine personnalisé</div>
            <div className="border-t-[0.08vw] border-white/15 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">PWA isolée pour chaque boutique</div>
            <div className="border-t-[0.08vw] border-white/15 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">Comptes clients, adresses, favoris et paniers séparés</div>
            <div className="border-t-[0.08vw] border-white/15 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">Produits physiques, numériques, locations et livraisons</div>
            <div className="border-t-[0.08vw] border-white/15 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">Téléchargement numérique uniquement après paiement confirmé</div>
            <div className="border-t-[0.08vw] border-accent/55 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">Zones de livraison et tarifs conservés dans les commandes</div>
          </div>
        </div>
        <div className="flex justify-between text-[1.5vw] uppercase tracking-[0.18em] text-muted"><span>MAXIMUS ERP</span><span>06 / 10</span></div>
      </div>
    </div>
  );
}
