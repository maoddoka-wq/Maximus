import { DeckPage } from '../SlideLayout';

export default function Slide13() {
  return (
    <DeckPage section="07 — E-COMMERCE · 2/4" title="Offrir au client un parcours d’achat complet" subtitle="La vitrine, le panier et l’espace client sont séparés pour chaque boutique." page="13">
      <div className="grid h-full grid-cols-[0.8fr_1.2fr] gap-[2vw]">
        <div className="flex flex-col items-center justify-center border border-accent/35 bg-accent/10 text-center">
          <div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Côté acheteur</div>
          <div className="mt-[2vh] font-display text-[4.2vw] font-semibold leading-[0.95]">La boutique<br /><span className="text-accent">de l’entreprise</span></div>
          <p className="mt-[2vh] max-w-[29vw] text-[2vw] leading-[1.28] text-muted">Accessible au public par l’adresse configurée pour le commerce.</p>
        </div>
        <div className="grid grid-cols-2 gap-[1.2vw]">
          <div className="border-t-[0.12vw] border-accent pt-[1.5vh]"><h3 className="font-display text-[2.2vw] font-semibold">Découvrir</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.22] text-muted">Parcourir les produits, catégories et promotions publiés.</p></div>
          <div className="border-t-[0.12vw] border-white/20 pt-[1.5vh]"><h3 className="font-display text-[2.2vw] font-semibold">Commander</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.22] text-muted">Ajouter au panier et transmettre les informations de commande.</p></div>
          <div className="border-t-[0.12vw] border-white/20 pt-[1.5vh]"><h3 className="font-display text-[2.2vw] font-semibold">Gérer son compte</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.22] text-muted">Retrouver adresses, favoris, commandes et historique.</p></div>
          <div className="border-t-[0.12vw] border-white/20 pt-[1.5vh]"><h3 className="font-display text-[2.2vw] font-semibold">Sur mobile</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.22] text-muted">L’expérience PWA est isolée par boutique afin de limiter les mélanges de paniers.</p></div>
          <div className="col-span-2 self-end border-t border-accent/30 pt-[1.5vh] text-[2vw] leading-[1.2] text-muted">Chaque client et chaque commande restent liés à la boutique et à l’entreprise concernées.</div>
        </div>
      </div>
    </DeckPage>
  );
}