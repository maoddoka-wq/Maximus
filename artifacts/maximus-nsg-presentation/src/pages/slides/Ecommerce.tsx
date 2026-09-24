export default function Ecommerce() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[10vh] text-[1.5vw] font-semibold uppercase tracking-[0.2em] text-accent">
        05 — MODULE MÉTIER
      </div>
      <div className="relative flex h-full w-full items-center gap-[8vw] px-[9vw] py-[12vh]">
        <div className="w-[31vw]">
          <p className="font-display text-[10vw] font-semibold leading-none tracking-[-0.08em] text-accent">02</p>
          <p className="mt-[2vh] text-[1.6vw] font-semibold uppercase tracking-[0.2em] text-muted">
            VITRINE · CATALOGUE · COMMANDES
          </p>
        </div>
        <div className="max-w-[48vw]">
          <h2 className="font-display text-[4.2vw] font-semibold leading-[1.02] tracking-[-0.055em]">
            E-commerce
          </h2>
          <p className="mt-[2vh] text-[2vw] leading-[1.3] text-muted">
            Une boutique publique reliée à la gestion du catalogue et des commandes clients.
          </p>
          <div className="mt-[4vh] grid grid-cols-2 gap-[1.2vw]">
            <div className="border border-white/10 bg-surface/85 p-[1.7vw]">
              <h3 className="font-display text-[2.2vw] font-semibold">Catalogue</h3>
              <p className="mt-[1vh] text-[2vw] leading-[1.25] text-muted">Produits et informations de la vitrine.</p>
            </div>
            <div className="border border-white/10 bg-surface/85 p-[1.7vw]">
              <h3 className="font-display text-[2.2vw] font-semibold">Commandes</h3>
              <p className="mt-[1vh] text-[2vw] leading-[1.25] text-muted">Suivi du traitement des commandes clients.</p>
            </div>
          </div>
        </div>
        <div className="absolute bottom-[5vh] left-[8vw] right-[8vw] flex justify-between text-[1.5vw] uppercase tracking-[0.16em] text-muted">
          <span>MAXIMUS ERP</span>
          <span>05 / 09</span>
        </div>
      </div>
    </div>
  );
}