import { DeckPage } from '../SlideLayout';

export default function Slide6() {
  return (
    <DeckPage section="05 — GESTION COMMERCIALE · 1/3" title="De la demande client à la pièce commerciale" subtitle="Un parcours structuré pour suivre les échanges, les ventes et les documents associés." page="06">
      <div className="grid h-full grid-cols-4 gap-[1.2vw]">
        <div className="flex flex-col justify-between border border-white/12 bg-surface/80 p-[1.8vw]"><span className="font-display text-[3vw] font-semibold text-accent">01</span><div><h3 className="font-display text-[2.25vw] font-semibold">Client</h3><p className="mt-[1.2vh] text-[2vw] leading-[1.28] text-muted">Créer et retrouver la fiche client, ses coordonnées et son historique commercial.</p></div></div>
        <div className="flex flex-col justify-between border border-white/12 bg-surface/80 p-[1.8vw]"><span className="font-display text-[3vw] font-semibold text-accent">02</span><div><h3 className="font-display text-[2.25vw] font-semibold">Devis</h3><p className="mt-[1.2vh] text-[2vw] leading-[1.28] text-muted">Préparer une proposition et garder une trace des articles et montants proposés.</p></div></div>
        <div className="flex flex-col justify-between border border-white/12 bg-surface/80 p-[1.8vw]"><span className="font-display text-[3vw] font-semibold text-accent">03</span><div><h3 className="font-display text-[2.25vw] font-semibold">Vente</h3><p className="mt-[1.2vh] text-[2vw] leading-[1.28] text-muted">Enregistrer la vente, son statut et son mode d’encaissement.</p></div></div>
        <div className="flex flex-col justify-between border border-accent/35 bg-accent/10 p-[1.8vw]"><span className="font-display text-[3vw] font-semibold text-accent">04</span><div><h3 className="font-display text-[2.25vw] font-semibold">Facture et suivi</h3><p className="mt-[1.2vh] text-[2vw] leading-[1.28] text-muted">Produire les pièces prévues et consulter l’historique ou les rapports.</p></div></div>
      </div>
    </DeckPage>
  );
}
