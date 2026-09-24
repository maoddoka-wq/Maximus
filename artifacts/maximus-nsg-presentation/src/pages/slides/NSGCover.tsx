const base = import.meta.env.BASE_URL;

export default function NSGCover() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <img
        src={`${base}nsg-port.jpg`}
        crossOrigin="anonymous"
        className="absolute inset-0 h-full w-full object-cover object-center"
        alt="Port et conteneurs illustrant les activités de Némadi Services Group"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(18,39,58,0.92)_0%,rgba(18,39,58,0.78)_48%,rgba(18,39,58,0.12)_100%)]" />
      <div className="absolute inset-0 deck-grid opacity-20" />
      <div className="relative z-10 flex h-full w-full flex-col justify-between px-[9vw] py-[8vh]">
        <div className="text-[1.55vw] font-bold uppercase tracking-[0.2em] text-[#e4bd83]">
          MAXIMUS ERP <span className="px-[0.8vw] text-white/70">/</span> PROPOSITION POUR NSG
        </div>
        <div className="max-w-[66vw] text-white">
          <p className="text-[1.65vw] font-bold uppercase tracking-[0.18em] text-[#e4bd83]">
            NÉMADI SERVICES GROUP
          </p>
          <h1 className="mt-[2vh] font-display text-[6.6vw] font-semibold leading-[0.98] tracking-[-0.04em]">
            MAXIMUS
          </h1>
          <p className="mt-[1.2vh] max-w-[55vw] font-display text-[3.15vw] leading-[1.12]">
            Modules et parcours de gestion adaptés à vos activités
          </p>
          <div className="mt-[3vh] h-[0.22vh] w-[12vw] bg-[#e4bd83]" />
          <p className="mt-[2vh] max-w-[47vw] text-[2.05vw] leading-[1.35] text-white/85">
            Une proposition détaillée pour la gestion commerciale, les équipes, la paie, les stocks et la vente en ligne.
          </p>
        </div>
        <div className="flex items-end justify-between text-[1.5vw] uppercase tracking-[0.14em] text-white/80">
          <span>Proposition fonctionnelle à valider avec NSG</span>
          <span>01 / 25</span>
        </div>
      </div>
    </div>
  );
}