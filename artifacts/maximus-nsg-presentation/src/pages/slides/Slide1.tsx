const base = import.meta.env.BASE_URL;

export default function Slide1() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg text-text font-body">
      <img
        src={`${base}maximus-hero.png`}
        crossOrigin="anonymous"
        className="absolute inset-0 h-full w-full object-cover object-center"
        alt="Équipe de pilotage face à des tableaux de bord opérationnels"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,20,36,0.98)_0%,rgba(11,20,36,0.88)_46%,rgba(11,20,36,0.18)_100%)]" />
      <div className="absolute inset-0 deck-grid opacity-25" />
      <div className="absolute left-[8vw] top-[13vh] h-[74vh] w-[0.2vw] bg-accent" />
      <div className="relative z-10 flex h-full w-full flex-col justify-between px-[11vw] py-[9vh]">
        <div className="flex items-center gap-[1.2vw] text-[1.5vw] font-semibold uppercase tracking-[0.22em] text-accent">
          <span className="h-[0.75vw] w-[0.75vw] rounded-full bg-accent" />
          MAXIMUS ERP
          <span className="text-muted">/</span>
          PRÉSENTATION CLIENTE
        </div>
        <div className="max-w-[58vw]">
          <p className="text-[1.7vw] font-semibold uppercase tracking-[0.19em] text-accent">NÉMADI SERVICES GROUP</p>
          <h1 className="mt-[2.2vh] font-display text-[6.4vw] font-semibold leading-[0.94] tracking-[-0.07em] text-balance">
            MAXIMUS
          </h1>
          <p className="mt-[1.4vh] font-display text-[3.6vw] font-medium leading-[1.02] tracking-[-0.045em]">
            pour NSG
          </p>
          <div className="mt-[3.4vh] deck-rule w-[10vw]" />
          <p className="mt-[2.5vh] max-w-[43vw] text-[2.2vw] leading-[1.25] text-muted text-pretty">
            Présentation des modules disponibles pour les équipes et les fonctions de gestion.
          </p>
        </div>
        <div className="flex items-end justify-between text-[1.5vw] uppercase tracking-[0.16em] text-muted">
          <span>Transit · dédouanement · logistique</span>
          <span>01 / 08</span>
        </div>
      </div>
    </div>
  );
}