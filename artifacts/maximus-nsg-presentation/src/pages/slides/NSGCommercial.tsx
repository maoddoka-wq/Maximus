export default function NSGCommercial() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-body text-text">
      <div className="absolute left-[8vw] top-[9vh] text-[1.5vw] font-semibold uppercase tracking-[0.2em] text-accent">
        04 — MODULE PRIORITAIRE
      </div>
      <div className="relative flex h-full w-full flex-col px-[8vw] pt-[15vh] pb-[7vh]">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[1.5vw] font-semibold uppercase tracking-[0.18em] text-accent">01 / GESTION COMMERCIALE</p>
            <h2 className="mt-[1vh] font-display text-[3.8vw] font-semibold leading-[1.02] tracking-[-0.055em]">
              Structurer la relation client
            </h2>
          </div>
          <p className="font-display text-[7vw] font-semibold leading-none tracking-[-0.08em] text-accent/90">01</p>
        </div>
        <p className="mt-[1.6vh] max-w-[68vw] text-[1.9vw] leading-[1.25] text-muted">
          Le socle commercial MAXIMUS peut rassembler les informations clients et le suivi des opérations commerciales de NSG.
        </p>
        <div className="mt-[3vh] grid flex-1 grid-cols-4 gap-[1vw]">
          <div className="border-t-[0.25vw] border-accent bg-surface/80 px-[1.4vw] py-[2vh]">
            <h3 className="font-display text-[2.15vw] font-semibold">Clients</h3>
            <p className="mt-[1vh] text-[1.8vw] leading-[1.23] text-muted">Fiches et historique commercial.</p>
          </div>
          <div className="border-t-[0.25vw] border-accent bg-surface/80 px-[1.4vw] py-[2vh]">
            <h3 className="font-display text-[2.15vw] font-semibold">Devis & commandes</h3>
            <p className="mt-[1vh] text-[1.8vw] leading-[1.23] text-muted">Formaliser les offres et commandes.</p>
          </div>
          <div className="border-t-[0.25vw] border-accent bg-surface/80 px-[1.4vw] py-[2vh]">
            <h3 className="font-display text-[2.15vw] font-semibold">Ventes & factures</h3>
            <p className="mt-[1vh] text-[1.8vw] leading-[1.23] text-muted">Suivre les ventes et leur facturation.</p>
          </div>
          <div className="border-t-[0.25vw] border-teal bg-surface/80 px-[1.4vw] py-[2vh]">
            <h3 className="font-display text-[2.15vw] font-semibold">Achats & rapports</h3>
            <p className="mt-[1vh] text-[1.8vw] leading-[1.23] text-muted">Suivre fournisseurs, achats et indicateurs.</p>
          </div>
        </div>
        <div className="mt-[2vh] flex items-center justify-between border border-white/10 bg-surface/55 px-[2vw] py-[1.6vh]">
          <span className="text-[1.8vw] font-semibold">Exemple de suivi</span>
          <span className="text-[1.8vw] text-muted">Client</span>
          <span className="text-[1.8vw] text-accent">→</span>
          <span className="text-[1.8vw] text-muted">Devis</span>
          <span className="text-[1.8vw] text-accent">→</span>
          <span className="text-[1.8vw] text-muted">Commande / vente</span>
          <span className="text-[1.8vw] text-accent">→</span>
          <span className="text-[1.8vw] text-muted">Facture et rapport</span>
        </div>
        <div className="flex justify-between pt-[1.5vh] text-[1.4vw] uppercase tracking-[0.16em] text-muted">
          <span>Le suivi commercial ne remplace pas un dossier métier spécialisé</span>
          <span>04 / 12</span>
        </div>
      </div>
    </div>
  );
}