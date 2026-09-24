import { DeckPage } from '../SlideLayout';

export default function Slide3() {
  return (
    <DeckPage section="02 — CATALOGUE STANDARD" title="Les sept modules disponibles" subtitle="Sept modules métier, à combiner selon les priorités de l’entreprise." page="03">
      <div className="grid h-full grid-cols-4 grid-rows-2 gap-[1.2vw]">
        <div className="flex flex-col justify-center border border-white/12 bg-surface/80 p-[1.2vw]"><div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">01</div><h3 className="mt-[0.7vh] font-display text-[2vw] font-semibold leading-[1.05]">Gestion commerciale</h3><p className="mt-[0.6vh] text-[2vw] leading-[1.1] text-muted">Clients, ventes et achats.</p></div>
        <div className="flex flex-col justify-center border border-white/12 bg-surface/80 p-[1.2vw]"><div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">02</div><h3 className="mt-[0.7vh] font-display text-[2vw] font-semibold leading-[1.05]">Gestion de stock</h3><p className="mt-[0.6vh] text-[2vw] leading-[1.1] text-muted">Articles, mouvements, niveaux.</p></div>
        <div className="flex flex-col justify-center border border-accent/40 bg-accent/10 p-[1.2vw]"><div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">03</div><h3 className="mt-[0.7vh] font-display text-[2vw] font-semibold leading-[1.05]">E-commerce</h3><p className="mt-[0.6vh] text-[2vw] leading-[1.1] text-muted">Boutique, produits, commandes.</p></div>
        <div className="flex flex-col justify-center border border-white/12 bg-surface/80 p-[1.2vw]"><div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">04</div><h3 className="mt-[0.7vh] font-display text-[2vw] font-semibold leading-[1.05]">Présences</h3><p className="mt-[0.6vh] text-[2vw] leading-[1.1] text-muted">Pointages, horaires, congés.</p></div>
        <div className="flex flex-col justify-center border border-white/12 bg-surface/80 p-[1.2vw]"><div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">05</div><h3 className="mt-[0.7vh] font-display text-[2vw] font-semibold leading-[1.05]">Paie</h3><p className="mt-[0.6vh] text-[2vw] leading-[1.1] text-muted">Bénéficiaires et virements.</p></div>
        <div className="flex flex-col justify-center border border-white/12 bg-surface/80 p-[1.2vw]"><div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">06</div><h3 className="mt-[0.7vh] font-display text-[2vw] font-semibold leading-[1.05]">Transport</h3><p className="mt-[0.6vh] text-[2vw] leading-[1.1] text-muted">Courses, chauffeurs, véhicules.</p></div>
        <div className="col-span-2 flex flex-col justify-center border border-white/12 bg-surface/80 p-[1.2vw]"><div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">07</div><h3 className="mt-[0.7vh] font-display text-[2vw] font-semibold leading-[1.05]">Immobilier</h3><p className="mt-[0.6vh] text-[2vw] leading-[1.1] text-muted">Biens, annonces et visites.</p></div>
      </div>
    </DeckPage>
  );
}