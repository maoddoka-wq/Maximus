import { DeckPage } from '../SlideLayout';

export default function Slide29() {
  return (
    <DeckPage section="12 — SOCLE TRANSVERSE · 2/3" title="Déployer par étapes plutôt que tout activer d’un coup" subtitle="Un démarrage progressif aide à valider les parcours métier, les rôles et les données de référence." page="29">
      <div className="grid h-full grid-cols-4 gap-[1.15vw]">
        <div className="flex flex-col justify-between border border-white/12 bg-surface/80 p-[1.7vw]"><span className="font-display text-[3vw] font-semibold text-accent">01</span><div><h3 className="font-display text-[2.2vw] font-semibold">Cadrer</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.24] text-muted">Choisir un processus et un résultat prioritaire.</p></div></div>
        <div className="flex flex-col justify-between border border-white/12 bg-surface/80 p-[1.7vw]"><span className="font-display text-[3vw] font-semibold text-accent">02</span><div><h3 className="font-display text-[2.2vw] font-semibold">Configurer</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.24] text-muted">Retenir modules, packs, données et rôles.</p></div></div>
        <div className="flex flex-col justify-between border border-white/12 bg-surface/80 p-[1.7vw]"><span className="font-display text-[3vw] font-semibold text-accent">03</span><div><h3 className="font-display text-[2.2vw] font-semibold">Piloter</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.24] text-muted">Tester sur un périmètre représentatif et corriger les écarts.</p></div></div>
        <div className="flex flex-col justify-between border border-accent/35 bg-accent/10 p-[1.7vw]"><span className="font-display text-[3vw] font-semibold text-accent">04</span><div><h3 className="font-display text-[2.2vw] font-semibold">Étendre</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.24] text-muted">Former les utilisateurs puis activer les priorités suivantes.</p></div></div>
        <div className="col-span-4 border-t border-accent/35 pt-[1.2vh] text-[2vw] leading-[1.22] text-muted">Les règles locales, les intégrations de paiement, les taxes et les responsabilités opérationnelles sont validées avec l’entreprise avant mise en service.</div>
      </div>
    </DeckPage>
  );
}