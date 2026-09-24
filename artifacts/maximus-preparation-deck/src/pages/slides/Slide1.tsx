const base = import.meta.env.BASE_URL;

export default function Slide1() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-[#0b1424] font-body text-white">
      <img src={`${base}maximus-hero.png`} crossOrigin="anonymous" className="absolute inset-0 h-full w-full object-cover opacity-55" alt="Activité portuaire et logistique" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,20,36,0.98)_0%,rgba(11,20,36,0.84)_48%,rgba(11,20,36,0.3)_100%)]" />
      <div className="absolute inset-0 deck-grid opacity-30" />
      <div className="absolute left-[8vw] top-[13vh] h-[74vh] w-[0.22vw] bg-[#d8ad66]" />
      <div className="relative z-10 flex h-full w-full flex-col justify-between px-[10vw] py-[9vh]">
        <div className="flex items-center gap-[1.2vw] text-[1.5vw] font-bold uppercase tracking-[0.22em] text-[#d8ad66]">
          <span className="h-[0.8vw] w-[0.8vw] rounded-full bg-[#d8ad66]" />
          PRÉSENTATION GÉNÉRALE
        </div>
        <div className="max-w-[65vw]">
          <h1 className="font-display text-[6.5vw] font-semibold leading-[0.94] tracking-[-0.07em] text-balance">MAXIMUS ERP</h1>
          <div className="mt-[4vh] deck-rule w-[11vw]" />
          <p className="mt-[3vh] max-w-[57vw] font-display text-[2.6vw] font-medium leading-[1.16] text-pretty">Une plateforme de gestion qui s’adapte aux priorités de chaque entreprise.</p>
          <div className="mt-[5vh] grid max-w-[60vw] grid-cols-3 gap-[1.3vw] text-[1.65vw] leading-[1.25] text-white/75">
            <div className="border-l-[0.16vw] border-[#d8ad66]/80 pl-[1vw]">7 modules standards</div>
            <div className="border-l-[0.16vw] border-[#d8ad66]/80 pl-[1vw]">Fonctionnalités à choisir</div>
            <div className="border-l-[0.16vw] border-[#d8ad66]/80 pl-[1vw]">Accès par entreprise et par rôle</div>
          </div>
        </div>
        <div className="flex items-end justify-between text-[1.5vw] uppercase tracking-[0.18em] text-white/70">
          <span>Présentation générale MAXIMUS</span>
          <span>01 / 30</span>
        </div>
      </div>
    </div>
  );
}
