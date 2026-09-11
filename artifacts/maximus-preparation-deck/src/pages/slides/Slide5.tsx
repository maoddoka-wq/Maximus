export default function Slide5() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text font-body">
      <div className="absolute left-[8vw] top-[11vh] text-[1.5vw] font-semibold uppercase tracking-[0.22em] text-accent">04 — Modules</div>
      <div className="absolute bottom-[-14vw] right-[-8vw] h-[43vw] w-[43vw] rounded-full border-[0.08vw] border-accent/20" />
      <div className="relative flex h-full w-full flex-col px-[8vw] py-[10vh]">
        <h2 className="max-w-[70vw] font-display text-[3.8vw] font-semibold leading-[1.02] tracking-[-0.055em] text-balance">Les modules au cœur de l’activité</h2>
        <div className="mt-[4.5vh] grid flex-1 grid-cols-3 grid-rows-2 gap-[1.2vw]">
          <div className="border border-white/12 bg-surface/75 p-[1.8vw]"><div className="flex items-center justify-between"><span className="font-display text-[2.4vw] font-semibold">Stock</span><span className="text-[1.5vw] text-accent">01</span></div><p className="mt-[3vh] text-[1.8vw] leading-[1.2] text-muted">produits, mouvements, inventaires et seuils</p></div>
          <div className="border border-white/12 bg-surface/75 p-[1.8vw]"><div className="flex items-center justify-between"><span className="font-display text-[2.4vw] font-semibold">Commerce</span><span className="text-[1.5vw] text-accent">02</span></div><p className="mt-[3vh] text-[1.8vw] leading-[1.2] text-muted">ventes, encaissements et suivi opérationnel</p></div>
          <div className="border border-white/12 bg-surface/75 p-[1.8vw]"><div className="flex items-center justify-between"><span className="font-display text-[2.4vw] font-semibold">E-commerce</span><span className="text-[1.5vw] text-accent">03</span></div><p className="mt-[3vh] text-[1.8vw] leading-[1.2] text-muted">boutique publique, panier et commandes</p></div>
          <div className="border border-white/12 bg-surface/75 p-[1.8vw]"><div className="flex items-center justify-between"><span className="font-display text-[2.4vw] font-semibold">Présences</span><span className="text-[1.5vw] text-accent">04</span></div><p className="mt-[3vh] text-[1.8vw] leading-[1.2] text-muted">workflows, pointages et historique</p></div>
          <div className="border border-white/12 bg-surface/75 p-[1.8vw]"><div className="flex items-center justify-between"><span className="font-display text-[2.4vw] font-semibold">Paie</span><span className="text-[1.5vw] text-accent">05</span></div><p className="mt-[3vh] text-[1.8vw] leading-[1.2] text-muted">profils, comptes et règlements sécurisés</p></div>
          <div className="border border-accent/45 bg-accent/10 p-[1.8vw]"><div className="flex items-center justify-between"><span className="font-display text-[2.4vw] font-semibold">Comptabilité</span><span className="text-[1.5vw] text-accent">06</span></div><p className="mt-[3vh] text-[1.8vw] leading-[1.2] text-muted">suivi des opérations financières</p></div>
        </div>
        <div className="flex justify-between text-[1.5vw] uppercase tracking-[0.18em] text-muted"><span>MAXIMUS ERP</span><span>05 / 10</span></div>
      </div>
    </div>
  );
}
