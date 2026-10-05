const base = import.meta.env.BASE_URL;

export default function Slide8() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[7vw] top-[8vh] flex items-center gap-[1.5vw]">
        <img
          src={`${base}maximus-mark.svg`}
          crossOrigin="anonymous"
          className="h-[5.5vw] w-[5.5vw] rounded-[0.8rem]"
          alt="Emblème MAXIMUS"
        />
        <p className="font-display text-[2vw] font-bold tracking-[0.08em]">
          MAXIMUS
        </p>
      </div>
      <div className="absolute left-[7vw] top-[29vh] w-[59vw]">
        <p className="font-mono text-[1.5vw] uppercase tracking-[0.14em] text-primary">
          À découvrir ensemble
        </p>
        <h1 className="mt-[2.3vh] text-balance font-display text-[5.2vw] font-bold leading-[0.98] tracking-[-0.06em]">
          Une démonstration adaptée à votre commerce
        </h1>
        <p className="mt-[3vh] max-w-[48vw] text-pretty text-[2.3vw] leading-[1.3] text-muted">
          Découvrons comment MAXIMUS peut accompagner votre boutique, vos ventes
          au comptoir et votre suivi quotidien.
        </p>
      </div>
      <div className="absolute right-[7vw] top-[34vh] flex h-[39vh] w-[22vw] flex-col justify-between rounded-[0.8rem] bg-primary p-[2.3vw] text-bg">
        <p className="font-mono text-[1.5vw] uppercase tracking-[0.12em]">
          MAXIMUS
        </p>
        <div>
          <p className="font-display text-[3.1vw] font-bold leading-[1.02] tracking-[-0.05em]">
            Vos ventes, mieux pilotées.
          </p>
          <div className="mt-[2.5vh] h-[0.6vh] w-[6vw] rounded-full bg-bg" />
        </div>
        <p className="font-mono text-[1.5vw] uppercase tracking-[0.1em]">
          Boutique / Comptoir / Rapports
        </p>
      </div>
      <div className="absolute bottom-[5vh] left-[7vw] right-[7vw] flex justify-between border-t border-border pt-[1.7vh] font-mono text-[1.5vw] uppercase tracking-[0.08em] text-muted">
        <span>MAXIMUS · Centre de pilotage des ventes</span>
        <span>08 / 08</span>
      </div>
    </div>
  );
}
