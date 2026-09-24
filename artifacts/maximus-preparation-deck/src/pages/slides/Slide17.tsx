import { DeckPage } from '../SlideLayout';

export default function Slide17() {
  return (
    <DeckPage section="08 — PRÉSENCES · 2/3" title="Relier le pointage à la vie de l’équipe" subtitle="Au-delà de la présence du jour, les responsables peuvent organiser les horaires et traiter les absences." page="17">
      <div className="grid h-full grid-cols-4 gap-[1.2vw]">
        <div className="flex flex-col justify-between border border-white/12 bg-surface/80 p-[1.7vw]"><span className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Temps</span><div><h3 className="font-display text-[2.25vw] font-semibold">Horaires</h3><p className="mt-[1vh] text-[2vw] leading-[1.25] text-muted">Organiser les horaires et les repères de présence selon l’équipe.</p></div></div>
        <div className="flex flex-col justify-between border border-white/12 bg-surface/80 p-[1.7vw]"><span className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Absence</span><div><h3 className="font-display text-[2.25vw] font-semibold">Justificatifs</h3><p className="mt-[1vh] text-[2vw] leading-[1.25] text-muted">Consigner le motif, la période et le traitement attendu.</p></div></div>
        <div className="flex flex-col justify-between border border-white/12 bg-surface/80 p-[1.7vw]"><span className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Demande</span><div><h3 className="font-display text-[2.25vw] font-semibold">Congés</h3><p className="mt-[1vh] text-[2vw] leading-[1.25] text-muted">Soumettre et suivre les demandes dans le flux de l’entreprise.</p></div></div>
        <div className="flex flex-col justify-between border border-accent/35 bg-accent/10 p-[1.7vw]"><span className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Suivi</span><div><h3 className="font-display text-[2.25vw] font-semibold">Historique</h3><p className="mt-[1vh] text-[2vw] leading-[1.25] text-muted">Revenir aux opérations et décisions déjà enregistrées.</p></div></div>
      </div>
    </DeckPage>
  );
}