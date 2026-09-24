import { DeckPage } from '../SlideLayout';

export default function Slide15() {
  return (
    <DeckPage section="07 — E-COMMERCE · 4/4" title="Configurer les ventes, les livraisons et les options" subtitle="Chaque boutique active les options utiles à son modèle de vente." page="15">
      <div className="grid h-full grid-cols-[1.1fr_0.9fr] gap-[2vw]">
        <div className="grid min-h-0 grid-cols-2 grid-rows-2 gap-[1.2vw]">
          <div className="border border-white/12 bg-surface/80 p-[1.4vw]"><h3 className="font-display text-[2vw] font-semibold leading-tight">Paiements</h3><p className="mt-[0.7vh] text-[2vw] leading-[1.15] text-muted">Wave ou Orange Money, selon le fournisseur.</p></div>
          <div className="border border-white/12 bg-surface/80 p-[1.4vw]"><h3 className="font-display text-[2vw] font-semibold leading-tight">Livraisons</h3><p className="mt-[0.7vh] text-[2vw] leading-[1.15] text-muted">Zones et frais définis par l’entreprise.</p></div>
          <div className="border border-white/12 bg-surface/80 p-[1.4vw]"><h3 className="font-display text-[2vw] font-semibold leading-tight">Location</h3><p className="mt-[0.7vh] text-[2vw] leading-[1.15] text-muted">Demandes et réservations selon le produit.</p></div>
          <div className="border border-white/12 bg-surface/80 p-[1.4vw]"><h3 className="font-display text-[2vw] font-semibold leading-tight">Numérique et offres</h3><p className="mt-[0.7vh] text-[2vw] leading-[1.15] text-muted">Fichiers protégés, promotions et suivi.</p></div>
        </div>
        <div className="flex flex-col justify-center border border-accent/35 bg-accent/10 p-[1.7vw]">
          <div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Packs disponibles selon le catalogue</div>
          <p className="mt-[1vh] text-[2vw] leading-[1.18]">Vitrine · produits physiques ou numériques · location · employé · manager.</p>
          <p className="mt-[1.2vh] border-t border-accent/30 pt-[1vh] text-[2vw] leading-[1.15] text-muted">Le transit international et les engagements de livraison restent à cadrer séparément.</p>
        </div>
      </div>
    </DeckPage>
  );
}