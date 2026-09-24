import { DeckPage } from '../SlideLayout';

export default function Slide4() {
  return (
    <DeckPage section="03 — CONFIGURATION" title="Chaque entreprise choisit ses propres fonctionnalités" subtitle="Les besoins de l’entreprise définissent modules, packs, fonctions et accès." page="04">
      <div className="grid h-full grid-cols-[1.45fr_0.75fr] gap-[2vw]">
        <div className="grid grid-cols-3 gap-[1.2vw]">
          <div className="flex flex-col justify-center border border-white/12 bg-surface/80 p-[1.5vw]"><span className="font-display text-[3vw] font-semibold text-accent">1</span><h3 className="mt-[1vh] font-display text-[2.1vw] font-semibold leading-[1.08]">Décrire le besoin</h3><p className="mt-[1vh] text-[2vw] leading-[1.15] text-muted">Choisir les processus et équipes concernés.</p></div>
          <div className="flex flex-col justify-center border border-white/12 bg-surface/80 p-[1.5vw]"><span className="font-display text-[3vw] font-semibold text-accent">2</span><h3 className="mt-[1vh] font-display text-[2.1vw] font-semibold leading-[1.08]">Composer l’offre</h3><p className="mt-[1vh] text-[2vw] leading-[1.15] text-muted">Choisir modules, packs et fonctionnalités.</p></div>
          <div className="flex flex-col justify-center border border-white/12 bg-surface/80 p-[1.5vw]"><span className="font-display text-[3vw] font-semibold text-accent">3</span><h3 className="mt-[1vh] font-display text-[2.1vw] font-semibold leading-[1.08]">Définir les accès</h3><p className="mt-[1vh] text-[2vw] leading-[1.15] text-muted">Attribuer à chacun les actions nécessaires.</p></div>
        </div>
        <div className="flex flex-col justify-center bg-accent/10 p-[1.7vw]">
          <div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Principe MAXIMUS</div>
          <p className="mt-[1.2vh] font-display text-[2.4vw] font-semibold leading-[1.12]">L’entreprise choisit ce qu’elle active.</p>
          <p className="mt-[1.2vh] text-[2vw] leading-[1.18] text-muted">Les modules se combinent. Les demandes hors catalogue sont validées avant publication.</p>
        </div>
      </div>
    </DeckPage>
  );
}