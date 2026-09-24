import { DeckPage } from '../SlideLayout';

export default function Slide22() {
  return (
    <DeckPage section="10 — TRANSPORT · 1/3" title="Structurer les chauffeurs et la flotte" subtitle="Le module Transport organise l’activité Taxi autour d’employés qualifiés, de véhicules et de paramètres de course." page="22">
      <div className="grid h-full grid-cols-3 gap-[1.2vw]">
        <div className="flex flex-col justify-between border border-white/12 bg-surface/80 p-[1.9vw]"><span className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Équipe</span><div><h3 className="font-display text-[2.45vw] font-semibold">Chauffeurs actifs</h3><p className="mt-[1.2vh] text-[2vw] leading-[1.28] text-muted">Qualifier un employé existant et enregistrer son permis avant affectation.</p></div></div>
        <div className="flex flex-col justify-between border border-white/12 bg-surface/80 p-[1.9vw]"><span className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Flotte</span><div><h3 className="font-display text-[2.45vw] font-semibold">Véhicules suivis</h3><p className="mt-[1.2vh] text-[2vw] leading-[1.28] text-muted">Immatriculation, modèle, photo, chauffeur rattaché et état du véhicule.</p></div></div>
        <div className="flex flex-col justify-between border border-accent/35 bg-accent/10 p-[1.9vw]"><span className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Paramètres</span><div><h3 className="font-display text-[2.45vw] font-semibold">Tarification</h3><p className="mt-[1.2vh] text-[2vw] leading-[1.28] text-muted">Configurer les tarifs, les paramètres de course et les données publiques.</p></div></div>
        <div className="col-span-3 flex items-center justify-between border-t border-white/15 pt-[1.2vh]">
          <p className="text-[2vw] text-muted">États du véhicule : disponible · en course · maintenance.</p>
          <p className="text-[2vw] text-muted">Un véhicule en course n’est pas réaffecté à une nouvelle demande.</p>
        </div>
      </div>
    </DeckPage>
  );
}