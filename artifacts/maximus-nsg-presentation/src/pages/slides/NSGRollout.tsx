export default function NSGRollout() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[9vh] text-[1.5vw] font-semibold uppercase tracking-[0.2em] text-accent">
        12 — RECOMMANDATION FINALE
      </div>
      <div className="relative flex h-full w-full flex-col px-[8vw] pt-[15vh] pb-[7vh]">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-[3.8vw] font-semibold leading-[1.02] tracking-[-0.055em]">
              Démarrer par les besoins confirmés
            </h2>
            <p className="mt-[1.5vh] text-[1.9vw] leading-[1.25] text-muted">
              Une mise en place progressive, sans activer de périmètre non nécessaire.
            </p>
          </div>
          <p className="font-display text-[6.5vw] font-semibold leading-none tracking-[-0.08em] text-accent/90">NSG</p>
        </div>
        <div className="mt-[3.5vh] grid flex-1 grid-cols-3 gap-[1.2vw]">
          <div className="border border-accent/35 bg-accent/10 p-[1.7vw]">
            <p className="text-[1.4vw] font-semibold uppercase tracking-[0.18em] text-accent">ÉTAPE 1</p>
            <h3 className="mt-[1.5vh] font-display text-[2.4vw] font-semibold">Cadrer</h3>
            <p className="mt-[1.2vh] text-[1.8vw] leading-[1.24] text-muted">
              Confirmer les offres commerciales, les rôles, les règles de paie et les besoins réels de stock.
            </p>
          </div>
          <div className="border border-white/10 bg-surface/85 p-[1.7vw]">
            <p className="text-[1.4vw] font-semibold uppercase tracking-[0.18em] text-accent">ÉTAPE 2</p>
            <h3 className="mt-[1.5vh] font-display text-[2.4vw] font-semibold">Configurer</h3>
            <p className="mt-[1.2vh] text-[1.8vw] leading-[1.24] text-muted">
              Prioriser Gestion commerciale, Présences et Paie ; ajouter Stock si NSG tient des articles à suivre.
            </p>
          </div>
          <div className="border border-white/10 bg-surface/85 p-[1.7vw]">
            <p className="text-[1.4vw] font-semibold uppercase tracking-[0.18em] text-accent">ÉTAPE 3</p>
            <h3 className="mt-[1.5vh] font-display text-[2.4vw] font-semibold">Valider</h3>
            <p className="mt-[1.2vh] text-[1.8vw] leading-[1.24] text-muted">
              Tester les parcours avec les responsables ; étudier E-commerce uniquement pour une vente directe en ligne.
            </p>
          </div>
        </div>
        <div className="mt-[2vh] flex items-center justify-between border-t border-white/15 pt-[1.8vh]">
          <p className="max-w-[65vw] text-[1.8vw] leading-[1.22] text-muted">
            Proposition à confirmer avec les responsables de Némadi Services Group.
          </p>
          <p className="text-[1.4vw] font-semibold uppercase tracking-[0.16em] text-accent">MAXIMUS ERP</p>
        </div>
        <div className="flex justify-end pt-[1vh] text-[1.4vw] uppercase tracking-[0.16em] text-muted">
          <span>12 / 12</span>
        </div>
      </div>
    </div>
  );
}