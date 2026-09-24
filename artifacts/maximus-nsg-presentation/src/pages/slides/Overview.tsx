export default function Overview() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[10vh] text-[1.5vw] font-semibold uppercase tracking-[0.2em] text-accent">
        02 — VUE D’ENSEMBLE
      </div>
      <div className="relative flex h-full w-full flex-col px-[8vw] pt-[16vh] pb-[8vh]">
        <h2 className="max-w-[70vw] font-display text-[4vw] font-semibold leading-[1.02] tracking-[-0.055em]">
          MAXIMUS en bref
        </h2>
        <p className="mt-[1.8vh] max-w-[64vw] text-[2.2vw] leading-[1.3] text-muted">
          Une plateforme modulaire pour organiser les fonctions clés de l’entreprise.
        </p>
        <div className="mt-[5vh] grid flex-1 grid-cols-3 gap-[1.2vw]">
          <div className="border border-white/10 bg-surface/85 p-[2vw]">
            <p className="font-display text-[5vw] font-semibold leading-none tracking-[-0.06em] text-accent">01</p>
            <h3 className="mt-[3vh] font-display text-[2.6vw] font-semibold">Modules métier</h3>
            <p className="mt-[1.5vh] text-[2vw] leading-[1.3] text-muted">
              Des espaces dédiés au commerce, au stock, à l’immobilier et aux équipes.
            </p>
          </div>
          <div className="border border-white/10 bg-surface/85 p-[2vw]">
            <p className="font-display text-[5vw] font-semibold leading-none tracking-[-0.06em] text-accent">02</p>
            <h3 className="mt-[3vh] font-display text-[2.6vw] font-semibold">Accès par rôle</h3>
            <p className="mt-[1.5vh] text-[2vw] leading-[1.3] text-muted">
              Les droits sont organisés selon les fonctions et responsabilités.
            </p>
          </div>
          <div className="border border-accent/35 bg-accent/10 p-[2vw]">
            <p className="font-display text-[5vw] font-semibold leading-none tracking-[-0.06em] text-accent">03</p>
            <h3 className="mt-[3vh] font-display text-[2.6vw] font-semibold">Suivi opérationnel</h3>
            <p className="mt-[1.5vh] text-[2vw] leading-[1.3] text-muted">
              Tableaux de bord, historiques et rapports selon les modules utilisés.
            </p>
          </div>
        </div>
        <div className="flex justify-between pt-[2vh] text-[1.5vw] uppercase tracking-[0.16em] text-muted">
          <span>MAXIMUS ERP</span>
          <span>02 / 09</span>
        </div>
      </div>
    </div>
  );
}