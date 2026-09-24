import { DeckPage } from '../SlideLayout';

export default function Slide18() {
  return (
    <DeckPage section="08 — PRÉSENCES · 3/3" title="Suivre l’activité et adapter les responsabilités" subtitle="Les vues et rapports donnent aux responsables une lecture consolidée, tandis que les employés disposent d’un accès cadré." page="18">
      <div className="grid h-full grid-cols-[1fr_1fr] gap-[2vw]">
        <div className="flex flex-col justify-center border border-white/12 bg-surface/80 p-[2.2vw]">
          <div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Vue responsable</div>
          <div className="mt-[1.8vh] space-y-[1.4vh] text-[2vw] leading-[1.28]">
            <p>Tableau de bord des présences et anomalies à vérifier.</p>
            <p>Historique par période et par personne.</p>
            <p>Rapports selon les fonctionnalités activées.</p>
          </div>
        </div>
        <div className="flex flex-col justify-center border border-accent/35 bg-accent/10 p-[2.2vw]">
          <div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Profils configurables</div>
          <p className="mt-[1.8vh] font-display text-[2.6vw] font-semibold leading-[1.15]">Consultation · Employé · Gestionnaire · Responsable · Manager</p>
          <p className="mt-[1.8vh] text-[2vw] leading-[1.3] text-muted">Les droits de création, consultation et modification se règlent par fonction du module.</p>
        </div>
      </div>
    </DeckPage>
  );
}