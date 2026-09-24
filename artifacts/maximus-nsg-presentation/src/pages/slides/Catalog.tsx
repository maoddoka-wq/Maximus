export default function Catalog() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[10vh] text-[1.5vw] font-semibold uppercase tracking-[0.2em] text-accent">
        03 — CATALOGUE
      </div>
      <div className="relative flex h-full w-full flex-col px-[8vw] pt-[16vh] pb-[8vh]">
        <h2 className="max-w-[70vw] font-display text-[3.8vw] font-semibold leading-[1.02] tracking-[-0.055em]">
          Modules disponibles
        </h2>
        <p className="mt-[1.8vh] text-[2vw] text-muted">
          Six domaines de gestion présentés dans cette vue générale.
        </p>
        <div className="mt-[4vh] grid flex-1 grid-cols-3 grid-rows-2 gap-[1.2vw]">
          <div className="border border-white/10 bg-surface/85 p-[1.7vw]">
            <p className="text-[1.5vw] font-semibold uppercase tracking-[0.16em] text-accent">01</p>
            <h3 className="mt-[1.5vh] font-display text-[2.3vw] font-semibold">Gestion commerciale</h3>
            <p className="mt-[1.4vh] text-[2vw] leading-[1.22] text-muted">Clients, ventes, achats et commandes.</p>
          </div>
          <div className="border border-white/10 bg-surface/85 p-[1.7vw]">
            <p className="text-[1.5vw] font-semibold uppercase tracking-[0.16em] text-accent">02</p>
            <h3 className="mt-[1.5vh] font-display text-[2.3vw] font-semibold">E-commerce</h3>
            <p className="mt-[1.4vh] text-[2vw] leading-[1.22] text-muted">Boutique publique, catalogue et commandes.</p>
          </div>
          <div className="border border-white/10 bg-surface/85 p-[1.7vw]">
            <p className="text-[1.5vw] font-semibold uppercase tracking-[0.16em] text-accent">03</p>
            <h3 className="mt-[1.5vh] font-display text-[2.3vw] font-semibold">Gestion de stock</h3>
            <p className="mt-[1.4vh] text-[2vw] leading-[1.22] text-muted">Articles, mouvements et inventaires.</p>
          </div>
          <div className="border border-white/10 bg-surface/85 p-[1.7vw]">
            <p className="text-[1.5vw] font-semibold uppercase tracking-[0.16em] text-accent">04</p>
            <h3 className="mt-[1.5vh] font-display text-[2.3vw] font-semibold">Immobilier</h3>
            <p className="mt-[1.4vh] text-[2vw] leading-[1.22] text-muted">Biens, annonces, prospects et visites.</p>
          </div>
          <div className="border border-white/10 bg-surface/85 p-[1.7vw]">
            <p className="text-[1.5vw] font-semibold uppercase tracking-[0.16em] text-accent">05</p>
            <h3 className="mt-[1.5vh] font-display text-[2.3vw] font-semibold">Présences</h3>
            <p className="mt-[1.4vh] text-[2vw] leading-[1.22] text-muted">Pointages, absences et horaires.</p>
          </div>
          <div className="border border-accent/35 bg-accent/10 p-[1.7vw]">
            <p className="text-[1.5vw] font-semibold uppercase tracking-[0.16em] text-accent">06</p>
            <h3 className="mt-[1.5vh] font-display text-[2.3vw] font-semibold">Paie</h3>
            <p className="mt-[1.4vh] text-[2vw] leading-[1.22] text-muted">Bénéficiaires et préparation des salaires.</p>
          </div>
        </div>
        <div className="flex justify-between pt-[2vh] text-[1.5vw] uppercase tracking-[0.16em] text-muted">
          <span>MAXIMUS ERP</span>
          <span>03 / 09</span>
        </div>
      </div>
    </div>
  );
}