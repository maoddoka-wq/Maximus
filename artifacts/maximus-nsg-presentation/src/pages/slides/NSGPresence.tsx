export default function NSGPresence() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[9vh] text-[1.5vw] font-semibold uppercase tracking-[0.2em] text-accent">
        07 — MODULE ÉQUIPES
      </div>
      <div className="relative flex h-full w-full items-center gap-[7vw] px-[9vw] py-[12vh]">
        <div className="w-[30vw]">
          <p className="font-display text-[9vw] font-semibold leading-none tracking-[-0.08em] text-accent">03</p>
          <p className="mt-[2vh] text-[1.5vw] font-semibold uppercase tracking-[0.18em] text-muted">PRÉSENCES</p>
          <div className="mt-[3vh] border-l-[0.25vw] border-accent pl-[1.5vw]">
            <p className="text-[2vw] leading-[1.25] text-muted">
              Un suivi commun des pointages et des absences de l’équipe.
            </p>
          </div>
        </div>
        <div className="max-w-[50vw]">
          <h2 className="font-display text-[3.8vw] font-semibold leading-[1.02] tracking-[-0.055em]">
            Présences au quotidien
          </h2>
          <div className="mt-[3vh] grid grid-cols-2 gap-[1vw]">
            <div className="border border-white/10 bg-surface/80 p-[1.5vw]">
              <h3 className="font-display text-[2.2vw] font-semibold">Pointage</h3>
              <p className="mt-[0.8vh] text-[1.75vw] leading-[1.22] text-muted">Enregistrement par employé, avec parcours QR disponible.</p>
            </div>
            <div className="border border-white/10 bg-surface/80 p-[1.5vw]">
              <h3 className="font-display text-[2.2vw] font-semibold">Horaires</h3>
              <p className="mt-[0.8vh] text-[1.75vw] leading-[1.22] text-muted">Référentiels et suivi des horaires d’équipe.</p>
            </div>
            <div className="border border-white/10 bg-surface/80 p-[1.5vw]">
              <h3 className="font-display text-[2.2vw] font-semibold">Absences</h3>
              <p className="mt-[0.8vh] text-[1.75vw] leading-[1.22] text-muted">Centraliser les absences et leur suivi.</p>
            </div>
            <div className="border border-accent/35 bg-accent/10 p-[1.5vw]">
              <h3 className="font-display text-[2.2vw] font-semibold">Supervision</h3>
              <p className="mt-[0.8vh] text-[1.75vw] leading-[1.22] text-muted">Consulter l’activité selon les permissions attribuées.</p>
            </div>
          </div>
        </div>
        <div className="absolute bottom-[4vh] left-[8vw] right-[8vw] flex justify-between text-[1.4vw] uppercase tracking-[0.16em] text-muted">
          <span>Paramétrage des horaires à valider avec NSG</span>
          <span>07 / 12</span>
        </div>
      </div>
    </div>
  );
}