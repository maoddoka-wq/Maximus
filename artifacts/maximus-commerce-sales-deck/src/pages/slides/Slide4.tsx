export default function Slide4() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[7vw] top-[7vh]">
        <p className="font-mono text-[1.5vw] uppercase tracking-[0.14em] text-primary">
          Votre présence en ligne
        </p>
        <h1 className="mt-[2.2vh] text-balance font-display text-[4vw] font-bold leading-[1.02] tracking-[-0.05em]">
          Une boutique publique, même sans site
        </h1>
        <p className="mt-[1.8vh] max-w-[75vw] text-pretty text-[2vw] leading-[1.3] text-muted">
          MAXIMUS vous permet de présenter vos produits dans une vitrine
          accessible à vos clients.
        </p>
      </div>
      <div className="absolute left-[7vw] top-[37vh] h-[49vh] w-[46vw] overflow-hidden rounded-[0.8rem] border border-border bg-surface">
        <div className="flex h-[7vh] items-center justify-between border-b border-border px-[2vw]">
          <p className="font-mono text-[1.5vw] uppercase tracking-[0.1em] text-muted">
            Boutique publique
          </p>
          <p className="font-mono text-[1.5vw] text-primary">
            Votre commerce
          </p>
        </div>
        <div className="px-[2.4vw] pt-[3vh]">
          <p className="font-mono text-[1.5vw] uppercase tracking-[0.12em] text-primary">
            Vitrine en ligne
          </p>
          <h2 className="mt-[1.2vh] font-display text-[2.7vw] font-bold leading-[1.05] tracking-[-0.04em]">
            Vos produits, à portée de vos clients
          </h2>
          <div className="mt-[2.7vh] grid grid-cols-3 gap-[1.2vw]">
            <div className="rounded-[0.8rem] border border-border bg-secondary p-[1.1vw]">
              <div className="h-[11vh] rounded-[0.5rem] bg-bg" />
              <p className="mt-[1.4vh] text-[2vw] font-semibold">Catalogue</p>
            </div>
            <div className="rounded-[0.8rem] border border-border bg-secondary p-[1.1vw]">
              <div className="h-[11vh] rounded-[0.5rem] bg-bg" />
              <p className="mt-[1.4vh] text-[2vw] font-semibold">
                Nouveautés
              </p>
            </div>
            <div className="rounded-[0.8rem] border border-border bg-secondary p-[1.1vw]">
              <div className="h-[11vh] rounded-[0.5rem] bg-bg" />
              <p className="mt-[1.4vh] text-[2vw] font-semibold">
                Sélection
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute left-[59vw] top-[42vh] w-[33vw]">
        <p className="font-mono text-[1.5vw] uppercase tracking-[0.12em] text-primary">
          Sans site à créer
        </p>
        <h2 className="mt-[1.5vh] font-display text-[3vw] font-bold leading-[1.06] tracking-[-0.04em]">
          Une adresse publique pour votre boutique
        </h2>
        <p className="mt-[2vh] text-[2vw] leading-[1.35] text-muted">
          Présentez vos produits en ligne et donnez à vos clients un accès
          direct à votre vitrine.
        </p>
        <div className="mt-[3vh] flex items-center gap-[1vw] border-t border-border pt-[2.3vh]">
          <div className="h-[1.1vh] w-[3.5vw] rounded-full bg-primary" />
          <p className="text-[2vw] font-semibold">Une boutique à votre image</p>
        </div>
      </div>
      <div className="absolute bottom-[5vh] left-[7vw] right-[7vw] flex justify-between border-t border-border pt-[1.7vh] font-mono text-[1.5vw] uppercase tracking-[0.08em] text-muted">
        <span>MAXIMUS · Centre de pilotage des ventes</span>
        <span>04 / 08</span>
      </div>
    </div>
  );
}
