const base = import.meta.env.BASE_URL;

export default function Slide1() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute inset-y-0 right-0 w-[50vw]">
        <img
          src={`${base}merchant-hero.png`}
          crossOrigin="anonymous"
          className="h-full w-full object-cover object-[70%_center]"
          alt="Commerçant dans sa boutique, smartphone en main"
        />
      </div>
      <div className="absolute inset-y-0 left-[49.5vw] w-[0.65vw] bg-primary" />
      <div className="absolute left-[7vw] top-[7vh] flex items-center gap-[1.6vw]">
        <img
          src={`${base}maximus-mark.svg`}
          crossOrigin="anonymous"
          className="h-[5.5vw] w-[5.5vw] rounded-[0.8rem]"
          alt="Emblème MAXIMUS"
        />
        <div>
          <p className="font-display text-[2vw] font-bold tracking-[0.08em]">
            MAXIMUS
          </p>
          <p className="mt-[0.6vh] font-mono text-[1.5vw] uppercase tracking-[0.1em] text-muted">
            Présentation commerciale
          </p>
        </div>
      </div>
      <div className="absolute left-[7vw] top-[31vh] w-[41vw]">
        <p className="font-display text-[7vw] font-black leading-[0.9] tracking-[-0.07em] text-primary">
          MAXIMUS
        </p>
        <h1 className="mt-[3.5vh] max-w-[39vw] text-balance font-display text-[3.6vw] font-bold leading-[1.04] tracking-[-0.045em]">
          Le centre de pilotage de vos ventes
        </h1>
        <p className="mt-[2.5vh] max-w-[36vw] text-pretty text-[2vw] leading-[1.35] text-muted">
          Une boutique publique, la vente au comptoir et vos rapports réunis au
          même endroit.
        </p>
      </div>
      <div className="absolute bottom-[8vh] left-[7vw] flex items-center gap-[1.1vw] font-mono text-[1.5vw] uppercase tracking-[0.08em] text-text">
        <span>Boutique</span>
        <span className="text-primary">/</span>
        <span>Comptoir</span>
        <span className="text-primary">/</span>
        <span>Rapports</span>
      </div>
    </div>
  );
}
