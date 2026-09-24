const base = import.meta.env.BASE_URL;

export default function NSGProfile() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[9vh] text-[1.5vw] font-semibold uppercase tracking-[0.2em] text-accent">
        03 — PROFIL D’ACTIVITÉ
      </div>
      <div className="relative grid h-full w-full grid-cols-2 gap-[4vw] px-[8vw] pt-[16vh] pb-[8vh]">
        <div className="flex flex-col justify-center">
          <h2 className="font-display text-[3.8vw] font-semibold leading-[1.02] tracking-[-0.055em]">
            Une activité aux opérations variées
          </h2>
          <p className="mt-[1.8vh] text-[2vw] leading-[1.3] text-muted">
            Cinq domaines d’activité ressortent du profil transmis.
          </p>
          <div className="mt-[3.5vh] space-y-[1.6vh] text-[2vw] leading-[1.24]">
            <p><span className="mr-[0.7vw] text-accent">01</span>Transit et formalités douanières</p>
            <p><span className="mr-[0.7vw] text-accent">02</span>Importation et exportation</p>
            <p><span className="mr-[0.7vw] text-accent">03</span>Transit sous-régional et manutention</p>
            <p><span className="mr-[0.7vw] text-accent">04</span>Exportation de produits agricoles</p>
            <p><span className="mr-[0.7vw] text-accent">05</span>Conseil en chaîne logistique</p>
          </div>
        </div>
        <div className="relative min-h-0 overflow-hidden border border-white/10 bg-surface">
          <img
              src={`${base}maximus-hero.png`}
            crossOrigin="anonymous"
            className="absolute inset-0 h-full w-full object-cover"
              alt="Illustration de l’interface MAXIMUS"
          />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(18,39,58,0.94)_0%,rgba(18,39,58,0.08)_70%)]" />
          <div className="absolute bottom-[3vh] left-[2vw] right-[2vw]">
            <p className="text-[1.5vw] font-semibold uppercase tracking-[0.18em] text-[#e4bd83]">NÉMADI SERVICES GROUP</p>
            <p className="mt-[0.8vh] font-display text-[2.6vw] font-semibold leading-[1.1] text-white">
              Un socle de gestion interne, en complément des outils métier spécialisés.
            </p>
          </div>
        </div>
        <div className="absolute bottom-[4vh] left-[8vw] right-[8vw] flex justify-between text-[1.4vw] uppercase tracking-[0.16em] text-muted">
          <span>Source : profil d’entreprise transmis</span>
          <span>03 / 25</span>
        </div>
      </div>
    </div>
  );
}