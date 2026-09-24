import { DeckPage } from '../SlideLayout';

export default function Slide10() {
  return (
    <DeckPage section="06 — GESTION DE STOCK · 2/3" title="Tracer chaque entrée, sortie et demande" subtitle="Les mouvements sont enregistrés dans un flux consultable, avec des droits adaptés aux équipes terrain." page="10">
      <div className="grid h-full grid-cols-[1fr_0.75fr_1fr] items-center gap-[1.3vw]">
        <div className="space-y-[1.4vh]">
          <div className="border border-white/12 bg-surface/80 p-[1.7vw]"><h3 className="font-display text-[2.2vw] font-semibold">Entrées</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.22] text-muted">Réceptionner et enregistrer les quantités ajoutées.</p></div>
          <div className="border border-white/12 bg-surface/80 p-[1.7vw]"><h3 className="font-display text-[2.2vw] font-semibold">Demandes</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.22] text-muted">Faire circuler une demande avant l’opération autorisée.</p></div>
        </div>
        <div className="flex h-[22vh] flex-col items-center justify-center border-y-[0.16vw] border-accent text-center">
          <span className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Stock par entreprise</span>
          <span className="mt-[1vh] font-display text-[2.4vw] font-semibold">Journal des mouvements</span>
        </div>
        <div className="space-y-[1.4vh]">
          <div className="border border-white/12 bg-surface/80 p-[1.7vw]"><h3 className="font-display text-[2.2vw] font-semibold">Sorties</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.22] text-muted">Tracer les articles utilisés, délivrés ou déplacés.</p></div>
          <div className="border border-white/12 bg-surface/80 p-[1.7vw]"><h3 className="font-display text-[2.2vw] font-semibold">Équipe</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.22] text-muted">Les profils employés et managers n’ont pas les mêmes actions.</p></div>
        </div>
      </div>
    </DeckPage>
  );
}