export default function NSGPresence() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[7vh] text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">11 — PRÉSENCES · 1/3</div>
      <div className="relative flex h-full w-full items-center gap-[6vw] px-[9vw] py-[12vh]">
        <div className="w-[38vw]">
          <p className="text-[1.6vw] font-bold uppercase tracking-[0.15em] text-teal">MODULE ÉQUIPES</p>
          <h2 className="mt-[1.4vh] font-display text-[4.2vw] font-semibold leading-[1.02]">Un suivi quotidien des présences</h2>
          <p className="mt-[2vh] text-[2.05vw] leading-[1.35] text-muted">Les horaires et les pointages donnent aux responsables un historique commun des présences et absences.</p>
        </div>
        <div className="flex-1 border-l border-primary/20 pl-[3vw]">
          <p className="text-[1.5vw] font-bold uppercase tracking-[0.15em] text-accent">PARCOURS DISPONIBLES</p>
          <h3 className="mt-[1.6vh] font-display text-[2.5vw] font-semibold">Présence et absence</h3>
          <p className="mt-[0.7vh] text-[2vw] leading-[1.3] text-muted">Enregistrer les événements de présence, les absences et les horaires configurés.</p>
          <h3 className="mt-[2.4vh] font-display text-[2.5vw] font-semibold">Congés et historique</h3>
          <p className="mt-[0.7vh] text-[2vw] leading-[1.3] text-muted">Consulter les événements et rapports disponibles selon les autorisations.</p>
          <h3 className="mt-[2.4vh] font-display text-[2.5vw] font-semibold">Pointage QR</h3>
          <p className="mt-[0.7vh] text-[2vw] leading-[1.3] text-muted">Un employé utilise son compte pour pointer sur le QR du jour affiché par un responsable.</p>
        </div>
        <div className="absolute bottom-[4vh] left-[8vw] right-[8vw] flex justify-between text-[1.5vw] text-muted"><span>Les horaires et tolérances se règlent avec NSG</span><span>11 / 25</span></div>
      </div>
    </div>
  );
}