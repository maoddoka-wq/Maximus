import { DeckPage } from '../SlideLayout';

export default function Slide15() {
  return (
    <DeckPage section="07 — E-COMMERCE · 4/4" title="Configurer les ventes, les livraisons et les options" subtitle="L’e-commerce s’adapte au modèle de vente retenu, sous réserve des réglages et services activés." page="15">
      <div className="grid h-full grid-cols-[1.1fr_0.9fr] gap-[2vw]">
        <div className="grid grid-cols-2 gap-[1.2vw]">
          <div className="border border-white/12 bg-surface/80 p-[1.7vw]"><h3 className="font-display text-[2.2vw] font-semibold">Paiements</h3><p className="mt-[1vh] text-[2vw] leading-[1.25] text-muted">Wave ou Orange Money selon le fournisseur configuré; l’état payé dépend de sa confirmation.</p></div>
          <div className="border border-white/12 bg-surface/80 p-[1.7vw]"><h3 className="font-display text-[2.2vw] font-semibold">Livraisons</h3><p className="mt-[1vh] text-[2vw] leading-[1.25] text-muted">Définir zones, frais et délais indicatifs avant d’accepter les commandes.</p></div>
          <div className="border border-white/12 bg-surface/80 p-[1.7vw]"><h3 className="font-display text-[2.2vw] font-semibold">Location</h3><p className="mt-[1vh] text-[2vw] leading-[1.25] text-muted">Présenter un parcours de demande ou réservation adapté au produit loué.</p></div>
          <div className="border border-white/12 bg-surface/80 p-[1.7vw]"><h3 className="font-display text-[2.2vw] font-semibold">Numérique et promotions</h3><p className="mt-[1vh] text-[2vw] leading-[1.25] text-muted">Publier les fichiers après contrôle; gérer les offres et la vue financière.</p></div>
        </div>
        <div className="flex flex-col justify-center border border-accent/35 bg-accent/10 p-[2vw]">
          <div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Packs disponibles selon le catalogue</div>
          <p className="mt-[1.5vh] text-[2vw] leading-[1.35]">Catalogue en ligne · vente physique et numérique · produits numériques · location et réservation · supervision · employé · manager.</p>
          <p className="mt-[2vh] border-t border-accent/30 pt-[1.5vh] text-[2vw] leading-[1.25] text-muted">Le module ne remplace pas une solution de transit douanier ou de transport international; les engagements de livraison restent à cadrer.</p>
        </div>
      </div>
    </DeckPage>
  );
}