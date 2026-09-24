export default function RealEstate() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[10vh] text-[1.5vw] font-semibold uppercase tracking-[0.2em] text-accent">
        07 — MODULE MÉTIER
      </div>
      <div className="relative flex h-full w-full flex-col px-[8vw] pt-[16vh] pb-[8vh]">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[1.6vw] font-semibold uppercase tracking-[0.18em] text-accent">04 — IMMOBILIER</p>
            <h2 className="mt-[1.8vh] font-display text-[4vw] font-semibold leading-[1.02] tracking-[-0.055em]">
              Gestion immobilière
            </h2>
          </div>
          <p className="font-display text-[8vw] font-semibold leading-none tracking-[-0.08em] text-accent/90">04</p>
        </div>
        <p className="mt-[2vh] max-w-[64vw] text-[2vw] leading-[1.3] text-muted">
          Du suivi des biens à la publication des annonces et des demandes de visite.
        </p>
        <div className="mt-[5vh] grid flex-1 grid-cols-4 gap-[1vw]">
          <div className="border-t-[0.25vw] border-accent bg-surface/75 px-[1.5vw] py-[2.4vh]">
            <h3 className="font-display text-[2.3vw] font-semibold">Biens</h3>
            <p className="mt-[1.5vh] text-[2vw] leading-[1.25] text-muted">Gérer les informations du patrimoine.</p>
          </div>
          <div className="border-t-[0.25vw] border-accent bg-surface/75 px-[1.5vw] py-[2.4vh]">
            <h3 className="font-display text-[2.3vw] font-semibold">Annonces</h3>
            <p className="mt-[1.5vh] text-[2vw] leading-[1.25] text-muted">Préparer et publier les offres immobilières.</p>
          </div>
          <div className="border-t-[0.25vw] border-accent bg-surface/75 px-[1.5vw] py-[2.4vh]">
            <h3 className="font-display text-[2.3vw] font-semibold">Prospects</h3>
            <p className="mt-[1.5vh] text-[2vw] leading-[1.25] text-muted">Suivre les contacts intéressés.</p>
          </div>
          <div className="border-t-[0.25vw] border-teal bg-surface/75 px-[1.5vw] py-[2.4vh]">
            <h3 className="font-display text-[2.3vw] font-semibold">Visites</h3>
            <p className="mt-[1.5vh] text-[2vw] leading-[1.25] text-muted">Organiser le suivi des demandes de visite.</p>
          </div>
        </div>
        <div className="flex justify-between pt-[2vh] text-[1.5vw] uppercase tracking-[0.16em] text-muted">
          <span>MAXIMUS ERP</span>
          <span>07 / 09</span>
        </div>
      </div>
    </div>
  );
}