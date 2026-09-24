import { DeckPage } from '../SlideLayout';

export default function Slide12() {
  return (
    <DeckPage section="07 — E-COMMERCE · 1/4" title="Construire un catalogue prêt pour la vente" subtitle="Une boutique publique s’appuie sur un catalogue maîtrisé, des catégories claires et des informations fiables." page="12">
      <div className="grid h-full grid-cols-[0.85fr_1.15fr] gap-[2vw]">
        <div className="flex flex-col justify-between border border-accent/35 bg-accent/10 p-[2.3vw]">
          <div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Un catalogue par boutique</div>
          <p className="font-display text-[3.6vw] font-semibold leading-[1.05]">Vendre des produits physiques ou numériques.</p>
          <p className="text-[2vw] leading-[1.3] text-muted">Les fiches et les fichiers numériques restent rattachés à l’entreprise.</p>
        </div>
        <div className="grid grid-cols-2 gap-[1.2vw]">
          <div className="border border-white/12 bg-surface/80 p-[1.8vw]"><h3 className="font-display text-[2.15vw] font-semibold">Fiches produit</h3><p className="mt-[1vh] text-[2vw] leading-[1.24] text-muted">Nom, description, prix et médias produits.</p></div>
          <div className="border border-white/12 bg-surface/80 p-[1.8vw]"><h3 className="font-display text-[2.15vw] font-semibold">Catégories</h3><p className="mt-[1vh] text-[2vw] leading-[1.24] text-muted">Organiser les produits pour guider le visiteur.</p></div>
          <div className="border border-white/12 bg-surface/80 p-[1.8vw]"><h3 className="font-display text-[2.15vw] font-semibold">Publication</h3><p className="mt-[1vh] text-[2vw] leading-[1.24] text-muted">Créer en brouillon puis publier selon les règles de la boutique.</p></div>
          <div className="border border-white/12 bg-surface/80 p-[1.8vw]"><h3 className="font-display text-[2.15vw] font-semibold">Fichier numérique</h3><p className="mt-[1vh] text-[2vw] leading-[1.24] text-muted">Associer le fichier avant d’ouvrir la vente numérique.</p></div>
        </div>
      </div>
    </DeckPage>
  );
}