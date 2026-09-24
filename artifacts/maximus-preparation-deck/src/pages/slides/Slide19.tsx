import { DeckPage } from '../SlideLayout';

export default function Slide19() {
  return (
    <DeckPage section="09 — PAIE · 1/3" title="Constituer une liste de bénéficiaires maîtrisée" subtitle="Centraliser les personnes concernées avant de préparer les règlements." page="19">
      <div className="grid h-full grid-cols-[1.1fr_0.9fr] gap-[2vw]">
        <div className="flex flex-col justify-center border border-white/12 bg-surface/80 p-[2.3vw]">
          <div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Référentiel paie</div>
          <div className="mt-[1.8vh] space-y-[1.3vh] text-[2vw] leading-[1.28]">
            <p>Créer et maintenir les bénéficiaires autorisés.</p>
            <p>Retrouver les informations nécessaires aux campagnes de paiement.</p>
            <p>Contrôler les changements avant leur utilisation.</p>
          </div>
        </div>
        <div className="flex flex-col justify-center border border-accent/35 bg-accent/10 p-[2.3vw]">
          <span className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">À garder en tête</span>
          <p className="mt-[1.8vh] font-display text-[2.8vw] font-semibold leading-[1.15]">La préparation des virements ne remplace pas le paramétrage des règles de paie.</p>
          <p className="mt-[1.5vh] text-[2vw] leading-[1.25] text-muted">Les calculs réglementaires et la validation interne sont définis par l’entreprise.</p>
        </div>
      </div>
    </DeckPage>
  );
}