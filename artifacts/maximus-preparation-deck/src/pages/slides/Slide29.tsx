import { DeckPage } from '../SlideLayout';

export default function Slide29() {
  return (
    <DeckPage section="12 — SOCLE TRANSVERSE · 2/3" title="Déployer par étapes plutôt que tout activer d’un coup" subtitle="Valider les parcours, les rôles et les données avant d’élargir l’usage." page="29">
      <div className="grid h-full min-h-0 grid-cols-4 grid-rows-[minmax(0,1fr)_auto] gap-[1.15vw]">
        <div className="flex min-h-0 flex-col justify-between border border-white/12 bg-surface/80 p-[1.4vw]"><span className="font-display text-[3vw] font-semibold text-accent">01</span><div><h3 className="font-display text-[2.2vw] font-semibold">Cadrer</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.18] text-muted">Choisir un processus prioritaire.</p></div></div>
        <div className="flex min-h-0 flex-col justify-between border border-white/12 bg-surface/80 p-[1.4vw]"><span className="font-display text-[3vw] font-semibold text-accent">02</span><div><h3 className="font-display text-[2.2vw] font-semibold">Configurer</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.18] text-muted">Sélectionner modules, packs, données et rôles.</p></div></div>
        <div className="flex min-h-0 flex-col justify-between border border-white/12 bg-surface/80 p-[1.4vw]"><span className="font-display text-[3vw] font-semibold text-accent">03</span><div><h3 className="font-display text-[2.2vw] font-semibold">Piloter</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.18] text-muted">Tester les parcours avec une équipe pilote.</p></div></div>
        <div className="flex min-h-0 flex-col justify-between border border-accent/35 bg-accent/10 p-[1.4vw]"><span className="font-display text-[3vw] font-semibold text-accent">04</span><div><h3 className="font-display text-[2.2vw] font-semibold">Étendre</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.18] text-muted">Former l’équipe et élargir le périmètre.</p></div></div>
        <div className="col-span-4 border-t border-accent/35 pt-[1vh] text-[2vw] leading-[1.15] text-muted">Valider avant le lancement les règles locales, taxes, paiements et responsabilités.</div>
      </div>
    </DeckPage>
  );
}