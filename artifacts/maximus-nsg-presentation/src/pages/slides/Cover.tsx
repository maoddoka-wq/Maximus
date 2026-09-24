const base = import.meta.env.BASE_URL;

export default function Cover() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <img
        src={`${base}maximus-hero.png`}
        crossOrigin="anonymous"
        className="absolute inset-0 h-full w-full object-cover object-center"
        alt="Espace de pilotage avec des tableaux de bord MAXIMUS"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,20,36,0.98)_0%,rgba(11,20,36,0.88)_46%,rgba(11,20,36,0.18)_100%)]" />
      <div className="absolute inset-0 deck-grid opacity-25" />
      <div className="absolute left-[8vw] top-[13vh] h-[74vh] w-[0.2vw] bg-accent" />
      <div className="relative z-10 flex h-full w-full flex-col justify-between px-[11vw] py-[9vh]">
        <div className="flex items-center gap-[1.2vw] text-[1.5vw] font-semibold uppercase tracking-[0.22em] text-accent">
          <span className="h-[0.75vw] w-[0.75vw] rounded-full bg-accent" />
          ERP MODULAIRE
          <span className="text-muted">/</span>
          PRÉSENTATION GÉNÉRALE
        </div>
        <div className="max-w-[60vw]">
          <p className="text-[1.7vw] font-semibold uppercase tracking-[0.19em] text-accent">PLATEFORME DE GESTION</p>
          <h1 className="mt-[2.2vh] font-display text-[7.2vw] font-semibold leading-[0.94] tracking-[-0.07em] text-balance">
            MAXIMUS
          </h1>
          <p className="mt-[1.7vh] font-display text-[3.2vw] font-medium leading-[1.08] tracking-[-0.045em]">
            Un ERP, plusieurs métiers.
          </p>
          <div className="mt-[3.4vh] deck-rule w-[10vw]" />
          <p className="mt-[2.5vh] max-w-[44vw] text-[2.2vw] leading-[1.25] text-muted text-pretty">
            Vue d’ensemble des modules actuellement disponibles dans MAXIMUS.
          </p>
        </div>
        <div className="flex items-end justify-between text-[1.5vw] uppercase tracking-[0.16em] text-muted">
          <span>MAXIMUS ERP · Gestion d’entreprise</span>
          <span>01 / 09</span>
        </div>
      </div>
    </div>
  );
}