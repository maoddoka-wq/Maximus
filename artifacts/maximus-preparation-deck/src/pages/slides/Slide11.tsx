import { DeckPage } from '../SlideLayout';

export default function Slide11() {
  return (
    <DeckPage section="06 — GESTION DE STOCK · 3/3" title="Inventorier, comparer et agir sur les écarts" subtitle="Les contrôles de stock aident à rapprocher les quantités enregistrées de la réalité terrain." page="11">
      <div className="grid h-full grid-cols-3 gap-[1.3vw]">
        <div className="flex flex-col justify-between border border-white/12 bg-surface/80 p-[2vw]"><span className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Contrôler</span><div><h3 className="font-display text-[2.5vw] font-semibold">Inventaire</h3><p className="mt-[1.2vh] text-[2vw] leading-[1.3] text-muted">Saisir et vérifier les quantités comptées sur le terrain.</p></div></div>
        <div className="flex flex-col justify-between border border-white/12 bg-surface/80 p-[2vw]"><span className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Repérer</span><div><h3 className="font-display text-[2.5vw] font-semibold">Alertes</h3><p className="mt-[1.2vh] text-[2vw] leading-[1.3] text-muted">Surveiller les articles sous leur seuil défini par l’entreprise.</p></div></div>
        <div className="flex flex-col justify-between border border-accent/35 bg-accent/10 p-[2vw]"><span className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Décider</span><div><h3 className="font-display text-[2.5vw] font-semibold">Rapports</h3><p className="mt-[1.2vh] text-[2vw] leading-[1.3] text-muted">Consulter l’état des articles et prioriser les actions de l’équipe.</p></div></div>
        <div className="col-span-3 flex items-center justify-between border-t border-accent/40 pt-[1.3vh]">
          <p className="max-w-[67vw] text-[2vw] leading-[1.25] text-muted">Le partage automatique du stock avec la boutique E-commerce se valide selon le périmètre et la configuration retenus.</p>
          <span className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Configuration entreprise</span>
        </div>
      </div>
    </DeckPage>
  );
}