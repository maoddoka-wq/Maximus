import { DeckPage } from '../SlideLayout';

export default function Slide4() {
  return (
    <DeckPage section="03 — CONFIGURATION" title="Chaque entreprise choisit ses propres fonctionnalités" subtitle="La configuration part du besoin métier, puis se traduit en modules, packs et droits d’accès." page="04">
      <div className="grid h-full grid-cols-[1.45fr_0.75fr] gap-[2vw]">
        <div className="grid grid-cols-3 gap-[1.2vw]">
          <div className="border border-white/12 bg-surface/80 p-[1.8vw]"><span className="font-display text-[3.3vw] font-semibold text-accent">1</span><h3 className="mt-[2vh] font-display text-[2.25vw] font-semibold">Décrire le besoin</h3><p className="mt-[1.5vh] text-[2vw] leading-[1.28] text-muted">Quels processus gérer, pour quelles équipes et avec quels résultats attendus ?</p></div>
          <div className="border border-white/12 bg-surface/80 p-[1.8vw]"><span className="font-display text-[3.3vw] font-semibold text-accent">2</span><h3 className="mt-[2vh] font-display text-[2.25vw] font-semibold">Composer l’offre</h3><p className="mt-[1.5vh] text-[2vw] leading-[1.28] text-muted">Sélectionner les modules, packs métier et fonctionnalités du catalogue publié.</p></div>
          <div className="border border-white/12 bg-surface/80 p-[1.8vw]"><span className="font-display text-[3.3vw] font-semibold text-accent">3</span><h3 className="mt-[2vh] font-display text-[2.25vw] font-semibold">Définir les accès</h3><p className="mt-[1.5vh] text-[2vw] leading-[1.28] text-muted">Associer à chaque équipe les fonctions et actions dont elle a besoin.</p></div>
        </div>
        <div className="flex flex-col justify-center bg-accent/10 p-[2.1vw]">
          <div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Principe MAXIMUS</div>
          <p className="mt-[2vh] font-display text-[2.7vw] font-semibold leading-[1.14]">L’entreprise commande son périmètre utile.</p>
          <p className="mt-[2vh] text-[2vw] leading-[1.3] text-muted">Les modules standards sont combinables. Une demande hors catalogue se cadre et se valide avant publication.</p>
        </div>
      </div>
    </DeckPage>
  );
}