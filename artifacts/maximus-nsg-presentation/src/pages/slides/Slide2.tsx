const base = import.meta.env.BASE_URL;

export default function Slide2() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg text-text font-body">
      <div className="absolute right-0 top-0 h-full w-[50vw] bg-surface" />
      <div className="absolute right-[5vw] top-[16vh] h-[61vh] w-[45vw] overflow-hidden border border-white/10">
        <img
          src={`${base}nsg-port.jpg`}
          crossOrigin="anonymous"
          className="h-full w-full object-cover"
          alt="Terminal de conteneurs présenté dans le profil de NSG"
        />
        <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgba(11,20,36,0.9))] px-[2vw] pb-[2vh] pt-[12vh]">
          <p className="text-[1.5vw] font-semibold uppercase tracking-[0.17em] text-text/90">
            Profil transmis pour la présentation
          </p>
        </div>
      </div>
      <div className="absolute left-[8vw] top-[11vh] text-[1.5vw] font-semibold uppercase tracking-[0.2em] text-accent">
        02 — PROFIL DE L’ENTREPRISE
      </div>
      <div className="relative z-10 flex h-full w-full flex-col justify-center px-[8vw]">
        <div className="max-w-[40vw]">
          <h2 className="font-display text-[4vw] font-semibold leading-[1.02] tracking-[-0.055em] text-balance">
            Activités de NSG
          </h2>
          <p className="mt-[2.5vh] max-w-[38vw] text-[2vw] leading-[1.35] text-muted">
            Une entreprise sénégalaise active sur plusieurs étapes de la chaîne logistique.
          </p>
          <div className="mt-[4vh] space-y-[1.7vh] text-[2vw] leading-[1.2]">
            <div className="flex items-start gap-[1vw]"><span className="mt-[0.7vh] h-[0.55vw] w-[0.55vw] shrink-0 bg-accent" /><span>Transit, dédouanement et opérations sous-régionales</span></div>
            <div className="flex items-start gap-[1vw]"><span className="mt-[0.7vh] h-[0.55vw] w-[0.55vw] shrink-0 bg-accent" /><span>Import/export maritime, aérien et terrestre</span></div>
            <div className="flex items-start gap-[1vw]"><span className="mt-[0.7vh] h-[0.55vw] w-[0.55vw] shrink-0 bg-accent" /><span>Manutention, empotage et dépotage</span></div>
            <div className="flex items-start gap-[1vw]"><span className="mt-[0.7vh] h-[0.55vw] w-[0.55vw] shrink-0 bg-accent" /><span>Export agricole et conseil supply chain</span></div>
          </div>
        </div>
        <div className="absolute bottom-[5vh] left-[8vw] right-[8vw] flex justify-between text-[1.5vw] uppercase tracking-[0.16em] text-muted">
          <span>MAXIMUS × NSG</span>
          <span>02 / 08</span>
        </div>
      </div>
    </div>
  );
}