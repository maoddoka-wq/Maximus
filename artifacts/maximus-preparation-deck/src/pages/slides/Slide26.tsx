import { DeckPage } from '../SlideLayout';

export default function Slide26() {
  return (
    <DeckPage section="11 — IMMOBILIER · 2/3" title="Transformer un bien en annonce publiée" subtitle="Une annonce est liée à un bien actif; sa publication suit un statut distinct du portefeuille interne." page="26">
      <div className="grid h-full grid-cols-3 gap-[1.3vw]">
        <div className="flex flex-col justify-between border border-white/12 bg-surface/80 p-[2vw]"><span className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Étape 01</span><div><h3 className="font-display text-[2.4vw] font-semibold">Sélectionner</h3><p className="mt-[1vh] text-[2vw] leading-[1.28] text-muted">Choisir un bien actif et reprendre ses principales informations.</p></div></div>
        <div className="flex flex-col justify-between border border-white/12 bg-surface/80 p-[2vw]"><span className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Étape 02</span><div><h3 className="font-display text-[2.4vw] font-semibold">Enrichir</h3><p className="mt-[1vh] text-[2vw] leading-[1.28] text-muted">Ajouter un titre, une description, des médias et une mise en avant.</p></div></div>
        <div className="flex flex-col justify-between border border-accent/35 bg-accent/10 p-[2vw]"><span className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Étape 03</span><div><h3 className="font-display text-[2.4vw] font-semibold">Publier</h3><p className="mt-[1vh] text-[2vw] leading-[1.28] text-muted">Garder en brouillon ou publier sur la vitrine immobilière.</p></div></div>
        <div className="col-span-3 flex items-center justify-between border-t border-white/15 pt-[1.2vh]">
          <p className="text-[2vw] leading-[1.2] text-muted">Archiver un bien archive aussi les annonces qui lui sont liées.</p>
          <span className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Bien ≠ annonce</span>
        </div>
      </div>
    </DeckPage>
  );
}