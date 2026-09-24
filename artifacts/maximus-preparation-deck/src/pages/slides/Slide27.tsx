import { DeckPage } from '../SlideLayout';

export default function Slide27() {
  return (
    <DeckPage section="11 — IMMOBILIER · 3/3" title="Recevoir des prospects et organiser les visites" subtitle="Les demandes de contact provenant de la vitrine s’ajoutent au suivi de l’agence." page="27">
      <div className="grid h-full grid-cols-[1fr_0.8fr_1fr] items-center gap-[1.3vw]">
        <div className="border border-white/12 bg-surface/80 p-[1.8vw]"><h3 className="font-display text-[2.25vw] font-semibold">Annonce publiée</h3><p className="mt-[1vh] text-[2vw] leading-[1.24] text-muted">Le visiteur consulte le bien et peut envoyer une demande.</p></div>
        <div className="flex h-[22vh] flex-col items-center justify-center border-y-[0.16vw] border-accent text-center">
          <span className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Vitrine publique</span>
          <span className="mt-[1vh] font-display text-[2.4vw] font-semibold">Contact · Visite</span>
        </div>
        <div className="border border-accent/35 bg-accent/10 p-[1.8vw]"><h3 className="font-display text-[2.25vw] font-semibold">Prospect</h3><p className="mt-[1vh] text-[2vw] leading-[1.24] text-muted">La demande suit un statut : nouvelle, contactée, clôturée.</p></div>
        <div className="col-span-3 grid grid-cols-2 gap-[1.3vw] border-t border-white/15 pt-[1.4vh]">
          <p className="text-[2vw] leading-[1.23] text-muted">Tableau de bord : biens disponibles, annonces publiées et demandes reçues.</p>
          <p className="text-[2vw] leading-[1.23] text-muted">Mandats et agents sont des rubriques prévues au catalogue; le périmètre de leur gestion avancée est à confirmer au cadrage.</p>
        </div>
      </div>
    </DeckPage>
  );
}