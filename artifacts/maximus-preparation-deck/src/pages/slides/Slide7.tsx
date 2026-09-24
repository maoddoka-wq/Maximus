import { DeckPage } from '../SlideLayout';

export default function Slide7() {
  return (
    <DeckPage section="05 — GESTION COMMERCIALE · 2/3" title="Ventes, achats et suivi des encaissements" subtitle="Les opérations quotidiennes sont reliées aux clients, fournisseurs et indicateurs de l’activité." page="07">
      <div className="grid h-full grid-cols-2 gap-[2vw]">
        <div className="border border-white/12 bg-surface/80 p-[2.2vw]">
          <div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Côté ventes</div>
          <div className="mt-[1.8vh] grid grid-cols-2 gap-[1.1vw]">
            <div className="border-t border-white/15 pt-[1.2vh]"><h3 className="font-display text-[2.1vw] font-semibold">Caisse</h3><p className="mt-[0.7vh] text-[2vw] leading-[1.22] text-muted">Ouverture, mouvements et clôture selon l’organisation.</p></div>
            <div className="border-t border-white/15 pt-[1.2vh]"><h3 className="font-display text-[2.1vw] font-semibold">Crédits</h3><p className="mt-[0.7vh] text-[2vw] leading-[1.22] text-muted">Suivre les montants restant dus par client.</p></div>
            <div className="border-t border-white/15 pt-[1.2vh]"><h3 className="font-display text-[2.1vw] font-semibold">Factures</h3><p className="mt-[0.7vh] text-[2vw] leading-[1.22] text-muted">Retrouver les documents associés aux opérations.</p></div>
            <div className="border-t border-white/15 pt-[1.2vh]"><h3 className="font-display text-[2.1vw] font-semibold">Retours</h3><p className="mt-[0.7vh] text-[2vw] leading-[1.22] text-muted">Enregistrer un retour ou un avoir selon le flux activé.</p></div>
          </div>
        </div>
        <div className="border border-accent/35 bg-accent/10 p-[2.2vw]">
          <div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Côté approvisionnement</div>
          <div className="mt-[1.8vh] space-y-[1.5vh] text-[2vw] leading-[1.28]">
            <p>Fiches fournisseurs et historique des achats.</p>
            <p>Commandes d’achat, dépenses et suivi du paiement.</p>
            <p>Indicateurs de chiffre d’affaires et rapports commerciaux.</p>
            <p>Journal d’activité pour retrouver les opérations réalisées.</p>
          </div>
        </div>
      </div>
    </DeckPage>
  );
}