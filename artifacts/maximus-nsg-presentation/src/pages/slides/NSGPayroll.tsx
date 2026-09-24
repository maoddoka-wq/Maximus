export default function NSGPayroll() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[7vh] text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">14 — PAIE · 1/3</div>
      <div className="relative flex h-full w-full flex-col px-[8vw] pt-[15vh] pb-[7vh]">
        <p className="text-[1.6vw] font-bold uppercase tracking-[0.16em] text-teal">MODULE ÉQUIPES</p>
        <h2 className="mt-[1.2vh] max-w-[72vw] font-display text-[4vw] font-semibold leading-[1.02]">Préparer les opérations de paie avec des validations</h2>
        <p className="mt-[1.7vh] max-w-[70vw] text-[2.05vw] leading-[1.32] text-muted">Le module organise les bénéficiaires, la préparation des lots et le suivi des paiements autorisés.</p>
        <div className="mt-[4vh] grid flex-1 grid-cols-3 gap-[1.6vw]">
          <div className="flex flex-col justify-between border-t-[0.35vh] border-primary bg-surface p-[1.8vw]">
            <p className="text-[1.5vw] font-bold uppercase tracking-[0.14em] text-primary">1 — PRÉPARER</p>
            <div><h3 className="font-display text-[2.7vw] font-semibold">Bénéficiaires</h3><p className="mt-[1.2vh] text-[2vw] leading-[1.35] text-muted">Tenir à jour les bénéficiaires et les informations nécessaires au paiement.</p></div>
          </div>
          <div className="flex flex-col justify-between border-t-[0.35vh] border-accent bg-surface p-[1.8vw]">
            <p className="text-[1.5vw] font-bold uppercase tracking-[0.14em] text-accent">2 — AUTORISER</p>
            <div><h3 className="font-display text-[2.7vw] font-semibold">Lots de paie</h3><p className="mt-[1.2vh] text-[2vw] leading-[1.35] text-muted">Soumettre un lot à validation avant de déclencher son exécution.</p></div>
          </div>
          <div className="flex flex-col justify-between border-t-[0.35vh] border-teal bg-surface p-[1.8vw]">
            <p className="text-[1.5vw] font-bold uppercase tracking-[0.14em] text-teal">3 — SUIVRE</p>
            <div><h3 className="font-display text-[2.7vw] font-semibold">Résultats</h3><p className="mt-[1.2vh] text-[2vw] leading-[1.35] text-muted">Consulter le statut de chaque paiement et l’historique du lot.</p></div>
          </div>
        </div>
        <p className="pt-[1.4vh] text-[1.7vw] leading-[1.3] text-muted">La conformité et les règles de calcul de la paie doivent être vérifiées séparément avec NSG.</p>
        <div className="flex justify-end pt-[1vh] text-[1.5vw] text-muted"><span>14 / 25</span></div>
      </div>
    </div>
  );
}