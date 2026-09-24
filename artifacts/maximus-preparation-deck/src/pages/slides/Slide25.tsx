import { DeckPage } from '../SlideLayout';

export default function Slide25() {
  return (
    <DeckPage section="11 — IMMOBILIER · 1/3" title="Créer un portefeuille de biens fiable" subtitle="La fiche interne décrit le patrimoine ou l’offre locative avant toute publication commerciale." page="25">
      <div className="grid h-full grid-cols-[0.9fr_1.1fr] gap-[2vw]">
        <div className="flex flex-col justify-center border border-accent/35 bg-accent/10 p-[2.2vw]">
          <div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Fiche bien</div>
          <p className="mt-[1.6vh] font-display text-[3vw] font-semibold leading-[1.1]">Un dossier interne, distinct de l’annonce publique.</p>
        </div>
        <div className="grid grid-cols-2 gap-[1.2vw]">
          <div className="border border-white/12 bg-surface/80 p-[1.7vw]"><h3 className="font-display text-[2.15vw] font-semibold">Identification</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.22] text-muted">Référence, type de bien, vente ou location et statut.</p></div>
          <div className="border border-white/12 bg-surface/80 p-[1.7vw]"><h3 className="font-display text-[2.15vw] font-semibold">Localisation</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.22] text-muted">Ville, quartier et adresse selon le niveau de détail choisi.</p></div>
          <div className="border border-white/12 bg-surface/80 p-[1.7vw]"><h3 className="font-display text-[2.15vw] font-semibold">Caractéristiques</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.22] text-muted">Surface, pièces, salles d’eau, état et informations utiles.</p></div>
          <div className="border border-white/12 bg-surface/80 p-[1.7vw]"><h3 className="font-display text-[2.15vw] font-semibold">Médias</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.22] text-muted">Image principale et galerie de photos ou vidéos.</p></div>
        </div>
      </div>
    </DeckPage>
  );
}