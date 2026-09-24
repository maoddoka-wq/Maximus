export default function NSGEcommerce() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[7vh] text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">17 — E-COMMERCE · 1/4</div>
      <div className="relative flex h-full w-full flex-col px-[8vw] pt-[15vh] pb-[7vh]">
        <p className="text-[1.6vw] font-bold uppercase tracking-[0.16em] text-accent">OPTION À ÉTUDIER</p>
        <h2 className="mt-[1.2vh] max-w-[78vw] font-display text-[4vw] font-semibold leading-[1.02]">Une boutique publique pour la vente directe</h2>
        <p className="mt-[1.6vh] max-w-[73vw] text-[2.05vw] leading-[1.32] text-muted">Le profil de NSG mentionne l’exportation de produits agricoles. Une boutique MAXIMUS devient pertinente si NSG veut aussi présenter des produits et recevoir des commandes en ligne.</p>
        <div className="mt-[3.5vh] grid flex-1 grid-cols-[1fr_0.12fr_1fr] items-stretch gap-[1.2vw]">
          <div className="flex flex-col justify-center bg-surface p-[2vw]">
            <p className="text-[1.5vw] font-bold uppercase tracking-[0.14em] text-primary">SI LES VENTES SONT B2B</p>
            <h3 className="mt-[1.3vh] font-display text-[2.8vw] font-semibold">Rester sur le cycle commercial</h3>
            <p className="mt-[1.2vh] text-[2vw] leading-[1.36] text-muted">La boutique publique n’est pas prioritaire si les produits sont vendus uniquement dans des relations professionnelles existantes.</p>
          </div>
          <div className="flex items-center justify-center text-[2.2vw] font-semibold text-accent">OU</div>
          <div className="flex flex-col justify-center bg-primary p-[2vw] text-white">
            <p className="text-[1.5vw] font-bold uppercase tracking-[0.14em] text-[#edc894]">SI NSG VEND EN DIRECT</p>
            <h3 className="mt-[1.3vh] font-display text-[2.8vw] font-semibold">Tester une vitrine de produits</h3>
            <p className="mt-[1.2vh] text-[2vw] leading-[1.36] text-white/85">Présenter un catalogue public, prendre les commandes et définir un parcours de paiement et de livraison adapté.</p>
          </div>
        </div>
        <div className="mt-[1.5vh] flex justify-between text-[1.5vw] text-muted"><span>À confirmer : type de client, marché visé et capacité de livraison</span><span>17 / 25</span></div>
      </div>
    </div>
  );
}