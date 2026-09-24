export default function NSGEcommerce() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[9vh] text-[1.5vw] font-semibold uppercase tracking-[0.2em] text-muted">
        09 — OPTION CONDITIONNELLE
      </div>
      <div className="relative flex h-full w-full items-center gap-[7vw] px-[9vw] py-[12vh]">
        <div className="w-[31vw]">
          <p className="font-display text-[8vw] font-semibold leading-none tracking-[-0.08em] text-accent">05</p>
          <p className="mt-[2vh] text-[1.5vw] font-semibold uppercase tracking-[0.18em] text-muted">E-COMMERCE</p>
          <div className="mt-[2.5vh] inline-flex border border-accent/40 bg-accent/10 px-[1vw] py-[0.9vh] text-[1.4vw] font-semibold uppercase tracking-[0.14em] text-accent">
            À décider
          </div>
        </div>
        <div className="max-w-[51vw]">
          <h2 className="font-display text-[3.8vw] font-semibold leading-[1.02] tracking-[-0.055em]">
            Une vitrine seulement si la vente directe est prévue
          </h2>
          <p className="mt-[2vh] text-[1.9vw] leading-[1.3] text-muted">
            Le module e-commerce peut présenter un catalogue public et recevoir des commandes en ligne.
          </p>
          <div className="mt-[3vh] space-y-[1.5vh] text-[1.9vw] leading-[1.25]">
            <p><span className="mr-[0.8vw] text-accent">+</span>À envisager si NSG vend des produits agricoles directement à des clients.</p>
            <p><span className="mr-[0.8vw] text-accent">=</span>Utile pour une vitrine et un parcours de commande en ligne.</p>
            <p><span className="mr-[0.8vw] text-muted">—</span>Non prioritaire si les ventes restent exclusivement gérées en relation B2B.</p>
          </div>
          <p className="mt-[2.5vh] border-l-[0.25vw] border-accent pl-[1.2vw] text-[1.6vw] leading-[1.24] text-muted">
            Décision à prendre après confirmation des canaux de vente de NSG.
          </p>
        </div>
        <div className="absolute bottom-[4vh] left-[8vw] right-[8vw] flex justify-between text-[1.4vw] uppercase tracking-[0.16em] text-muted">
          <span>Ne fait pas partie du socle recommandé</span>
          <span>09 / 12</span>
        </div>
      </div>
    </div>
  );
}