import { DeckPage } from '../SlideLayout';

export default function Slide21() {
  return (
    <DeckPage section="09 — PAIE · 3/3" title="Confirmer les virements et garder une trace" subtitle="Les paiements restent suivis par état jusqu’à confirmation du fournisseur de règlement." page="21">
      <div className="grid h-full grid-cols-[0.92fr_1.08fr] gap-[2vw]">
        <div className="flex flex-col justify-center border border-accent/35 bg-accent/10 p-[2.2vw]">
          <div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Cycle contrôlé</div>
          <div className="mt-[1.5vh] font-display text-[3.2vw] font-semibold leading-[1.06]">Préparer<br />→ Valider<br />→ Financer<br />→ Transférer</div>
        </div>
        <div className="flex flex-col justify-center gap-[1.5vh] border border-white/12 bg-surface/80 p-[2.2vw]">
          <p className="text-[2vw] leading-[1.3]">Le solde de paie est actualisé à partir des événements confirmés, pas d’une simple demande de virement.</p>
          <p className="text-[2vw] leading-[1.3]">Les fonds à transférer sont réservés pour éviter une double utilisation.</p>
          <p className="text-[2vw] leading-[1.3]">L’historique permet de retrouver l’état de chaque campagne.</p>
          <div className="border-t border-accent/35 pt-[1.2vh] text-[2vw] leading-[1.25] text-muted">Profils : consultation paie, gestionnaire, responsable, employé et manager.</div>
        </div>
      </div>
    </DeckPage>
  );
}