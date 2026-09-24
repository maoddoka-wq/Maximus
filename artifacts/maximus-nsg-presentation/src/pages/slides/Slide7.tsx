export default function Slide7() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg text-text font-body">
      <div className="absolute left-[8vw] top-[11vh] text-[1.5vw] font-semibold uppercase tracking-[0.2em] text-accent">
        07 — TRANSPORT
      </div>
      <div className="relative flex h-full w-full items-center px-[8vw] py-[12vh]">
        <div className="w-[50vw]">
          <p className="text-[1.6vw] font-semibold uppercase tracking-[0.18em] text-accent">
            Périmètre actuel : Taxi
          </p>
          <h2 className="mt-[1.8vh] font-display text-[4.2vw] font-semibold leading-[1.02] tracking-[-0.055em]">
            Transport
          </h2>
          <div className="mt-[3vh] deck-rule w-[8vw]" />
          <div className="mt-[3.5vh] space-y-[1.8vh] text-[2.1vw] leading-[1.2]">
            <p>Gestion des chauffeurs</p>
            <p>Suivi des véhicules</p>
            <p>Organisation et historique des courses</p>
          </div>
          <p className="mt-[3.5vh] max-w-[43vw] border-t border-accent/35 pt-[2vh] text-[2vw] leading-[1.3] text-muted">
            Ce module est conçu pour les opérations Taxi ; il ne constitue pas un outil de gestion du fret maritime ou aérien.
          </p>
        </div>
        <div className="absolute right-[8vw] top-[25vh] flex h-[47vh] w-[32vw] flex-col justify-center gap-[2vh]">
          <div className="flex items-center justify-between border border-white/10 bg-surface/85 px-[1.8vw] py-[2vh]">
            <span className="text-[1.5vw] font-semibold uppercase tracking-[0.15em] text-accent">01</span>
            <span className="font-display text-[2vw] font-semibold">Chauffeur</span>
          </div>
          <div className="ml-[2vw] h-[2vh] w-[0.15vw] bg-accent/60" />
          <div className="flex items-center justify-between border border-white/10 bg-surface/85 px-[1.8vw] py-[2vh]">
            <span className="text-[1.5vw] font-semibold uppercase tracking-[0.15em] text-accent">02</span>
            <span className="font-display text-[2vw] font-semibold">Véhicule</span>
          </div>
          <div className="ml-[2vw] h-[2vh] w-[0.15vw] bg-accent/60" />
          <div className="flex items-center justify-between border border-accent/35 bg-accent/10 px-[1.8vw] py-[2vh]">
            <span className="text-[1.5vw] font-semibold uppercase tracking-[0.15em] text-accent">03</span>
            <span className="font-display text-[2vw] font-semibold">Course et historique</span>
          </div>
        </div>
        <div className="absolute bottom-[5vh] left-[8vw] right-[8vw] flex justify-between text-[1.5vw] uppercase tracking-[0.16em] text-muted">
          <span>MAXIMUS × NSG</span>
          <span>07 / 08</span>
        </div>
      </div>
    </div>
  );
}