import { DeckPage } from '../SlideLayout';

export default function Slide2() {
  return (
    <DeckPage section="01 — LA PLATEFORME" title="Un socle commun, configuré selon chaque entreprise" subtitle="MAXIMUS rassemble les opérations clés sans imposer le même parcours à toutes les organisations." page="02">
      <div className="grid h-full grid-cols-3 gap-[1.4vw]">
        <div className="flex flex-col justify-between border border-white/12 bg-surface/80 p-[2.2vw]"><span className="font-display text-[3.4vw] font-semibold text-accent">01</span><div><h3 className="font-display text-[2.5vw] font-semibold">Un espace de travail</h3><p className="mt-[1.5vh] text-[2vw] leading-[1.3] text-muted">Les équipes suivent leurs activités et leurs données dans un environnement d’entreprise dédié.</p></div></div>
        <div className="flex flex-col justify-between border border-white/12 bg-surface/80 p-[2.2vw]"><span className="font-display text-[3.4vw] font-semibold text-accent">02</span><div><h3 className="font-display text-[2.5vw] font-semibold">Des modules choisis</h3><p className="mt-[1.5vh] text-[2vw] leading-[1.3] text-muted">L’entreprise retient les modules, packs et fonctions utiles à son fonctionnement.</p></div></div>
        <div className="flex flex-col justify-between border border-accent/35 bg-accent/10 p-[2.2vw]"><span className="font-display text-[3.4vw] font-semibold text-accent">03</span><div><h3 className="font-display text-[2.5vw] font-semibold">Des accès adaptés</h3><p className="mt-[1.5vh] text-[2vw] leading-[1.3] text-muted">Chaque rôle voit les écrans et les actions autorisés par l’entreprise.</p></div></div>
      </div>
    </DeckPage>
  );
}