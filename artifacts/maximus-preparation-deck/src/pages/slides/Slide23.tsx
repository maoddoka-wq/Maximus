import { DeckPage } from '../SlideLayout';

export default function Slide23() {
  return (
    <DeckPage section="10 — TRANSPORT · 2/3" title="Faire avancer chaque course avec un statut clair" subtitle="De la demande à la fin de trajet, les changements d’état suivent un cycle contrôlé." page="23">
      <div className="flex h-full flex-col justify-center">
        <div className="grid grid-cols-3 gap-[1.2vw]">
          <div className="border border-white/12 bg-surface/80 p-[1.7vw]"><span className="text-[1.5vw] font-bold text-accent">1 · DEMANDE</span><h3 className="mt-[1vh] font-display text-[2.25vw] font-semibold">À valider</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.22] text-muted">Départ, destination, passager, téléphone et tarif.</p></div>
          <div className="border border-white/12 bg-surface/80 p-[1.7vw]"><span className="text-[1.5vw] font-bold text-accent">2 · AFFECTATION</span><h3 className="mt-[1vh] font-display text-[2.25vw] font-semibold">Assignée</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.22] text-muted">Un chauffeur actif et un véhicule disponible sont associés.</p></div>
          <div className="border border-white/12 bg-surface/80 p-[1.7vw]"><span className="text-[1.5vw] font-bold text-accent">3 · EXÉCUTION</span><h3 className="mt-[1vh] font-display text-[2.25vw] font-semibold">En cours</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.22] text-muted">Le code de prise en charge confirme le démarrage.</p></div>
          <div className="col-span-3 grid grid-cols-2 gap-[1.2vw]">
            <div className="border border-accent/35 bg-accent/10 p-[1.6vw]"><h3 className="font-display text-[2.2vw] font-semibold">Terminée</h3><p className="mt-[0.6vh] text-[2vw] text-muted">La course est close; chauffeur et véhicule redeviennent disponibles.</p></div>
            <div className="border border-white/12 bg-surface/80 p-[1.6vw]"><h3 className="font-display text-[2.2vw] font-semibold">Annulée</h3><p className="mt-[0.6vh] text-[2vw] text-muted">La course est conservée dans l’historique avec son état final.</p></div>
          </div>
        </div>
      </div>
    </DeckPage>
  );
}