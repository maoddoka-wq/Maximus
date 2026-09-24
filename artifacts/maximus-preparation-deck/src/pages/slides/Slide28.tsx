import { DeckPage } from '../SlideLayout';

export default function Slide28() {
  return (
    <DeckPage section="12 — SOCLE TRANSVERSE · 1/3" title="Des données séparées, des accès sous contrôle" subtitle="La configuration multi-entreprises s’appuie sur un périmètre serveur et des autorisations liées aux modules." page="28">
      <div className="grid h-full grid-cols-[1.05fr_0.95fr] gap-[2vw]">
        <div className="flex flex-col justify-center border border-white/12 bg-surface/80 p-[2.2vw]">
          <div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Périmètre entreprise</div>
          <p className="mt-[1.5vh] font-display text-[2.7vw] font-semibold leading-[1.14]">La session détermine l’espace de données.</p>
          <p className="mt-[1.3vh] text-[2vw] leading-[1.3] text-muted">Un compte ne change pas d’entreprise en modifiant simplement une valeur dans son navigateur.</p>
        </div>
        <div className="flex flex-col justify-center border border-accent/35 bg-accent/10 p-[2.2vw]">
          <div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Périmètre collaborateur</div>
          <div className="mt-[1.4vh] space-y-[1.3vh] text-[2vw] leading-[1.28]">
            <p>Rôles et permissions définis par l’entreprise.</p>
            <p>Fonctions visibles seulement si elles sont autorisées.</p>
            <p>Actions de consultation, création et modification différenciées.</p>
            <p>Historique pour retrouver les opérations importantes.</p>
          </div>
        </div>
      </div>
    </DeckPage>
  );
}