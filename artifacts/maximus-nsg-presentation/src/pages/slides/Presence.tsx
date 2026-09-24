export default function Presence() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[10vh] text-[1.5vw] font-semibold uppercase tracking-[0.2em] text-accent">
        08 — MODULE MÉTIER
      </div>
      <div className="relative flex h-full w-full items-center gap-[8vw] px-[9vw] py-[12vh]">
        <div className="w-[32vw]">
          <p className="font-display text-[10vw] font-semibold leading-none tracking-[-0.08em] text-accent">05</p>
          <p className="mt-[2vh] text-[1.6vw] font-semibold uppercase tracking-[0.2em] text-muted">
            SUIVI DES ÉQUIPES
          </p>
        </div>
        <div className="max-w-[48vw]">
          <h2 className="font-display text-[4.2vw] font-semibold leading-[1.02] tracking-[-0.055em]">
            Présences
          </h2>
          <p className="mt-[2vh] text-[2vw] leading-[1.3] text-muted">
            Le suivi quotidien des horaires et des présences de l’équipe.
          </p>
          <div className="mt-[4vh] space-y-[1.5vh] text-[2.15vw] leading-[1.24]">
            <p>Pointage des employés</p>
            <p>Suivi des absences</p>
            <p>Gestion des horaires</p>
            <p>Vue d’ensemble de la présence quotidienne</p>
          </div>
        </div>
        <div className="absolute bottom-[5vh] left-[8vw] right-[8vw] flex justify-between text-[1.5vw] uppercase tracking-[0.16em] text-muted">
          <span>MAXIMUS ERP</span>
          <span>08 / 09</span>
        </div>
      </div>
    </div>
  );
}