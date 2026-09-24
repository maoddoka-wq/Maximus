import { DeckPage } from '../SlideLayout';

export default function Slide24() {
  return (
    <DeckPage section="10 — TRANSPORT · 3/3" title="Piloter l’activité et proposer un parcours public" subtitle="Les responsables suivent la flotte; une entreprise peut également activer la demande de course en ligne." page="24">
      <div className="grid h-full grid-cols-[1fr_1fr] gap-[2vw]">
        <div className="flex flex-col justify-center border border-white/12 bg-surface/80 p-[2.2vw]">
          <div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Vue d’exploitation</div>
          <div className="mt-[1.7vh] space-y-[1.3vh] text-[2vw] leading-[1.28]">
            <p>Courses du jour et historique des statuts.</p>
            <p>Chauffeurs actifs et véhicules disponibles.</p>
            <p>Recettes suivies par période.</p>
            <p>Position GPS considérée récente si elle date de cinq minutes ou moins.</p>
          </div>
        </div>
        <div className="flex flex-col justify-center border border-accent/35 bg-accent/10 p-[2.2vw]">
          <div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Parcours public</div>
          <p className="mt-[1.5vh] font-display text-[2.7vw] font-semibold leading-[1.14]">Demander, suivre ou annuler une course.</p>
          <p className="mt-[1.3vh] text-[2vw] leading-[1.3] text-muted">La vitrine Taxi exige une entreprise active et une boutique publiée. Les fonctions GPS dépendent des permissions et de la fraîcheur du signal.</p>
        </div>
      </div>
    </DeckPage>
  );
}