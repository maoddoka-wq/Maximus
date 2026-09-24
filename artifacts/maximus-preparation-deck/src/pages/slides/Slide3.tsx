import { DeckPage } from '../SlideLayout';

export default function Slide3() {
  return (
    <DeckPage section="02 — CATALOGUE STANDARD" title="Les sept modules disponibles" subtitle="Chaque module couvre un périmètre métier distinct. Une entreprise peut en retenir un seul ou en combiner plusieurs." page="03">
      <div className="grid h-full grid-cols-4 grid-rows-2 gap-[1.2vw]">
        <div className="border border-white/12 bg-surface/80 p-[1.7vw]"><div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">01</div><h3 className="mt-[1.3vh] font-display text-[2.15vw] font-semibold">Gestion commerciale</h3><p className="mt-[1vh] text-[2vw] leading-[1.24] text-muted">Clients, ventes, achats et suivi commercial.</p></div>
        <div className="border border-white/12 bg-surface/80 p-[1.7vw]"><div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">02</div><h3 className="mt-[1.3vh] font-display text-[2.15vw] font-semibold">Gestion de stock</h3><p className="mt-[1vh] text-[2vw] leading-[1.24] text-muted">Articles, mouvements, inventaires et seuils.</p></div>
        <div className="border border-accent/40 bg-accent/10 p-[1.7vw]"><div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">03</div><h3 className="mt-[1.3vh] font-display text-[2.15vw] font-semibold">E-commerce</h3><p className="mt-[1vh] text-[2vw] leading-[1.24] text-muted">Boutique publique, clients et commandes.</p></div>
        <div className="border border-white/12 bg-surface/80 p-[1.7vw]"><div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">04</div><h3 className="mt-[1.3vh] font-display text-[2.15vw] font-semibold">Présences</h3><p className="mt-[1vh] text-[2vw] leading-[1.24] text-muted">Pointages, horaires, absences et congés.</p></div>
        <div className="border border-white/12 bg-surface/80 p-[1.7vw]"><div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">05</div><h3 className="mt-[1.3vh] font-display text-[2.15vw] font-semibold">Paie</h3><p className="mt-[1vh] text-[2vw] leading-[1.24] text-muted">Bénéficiaires, préparation et virements.</p></div>
        <div className="border border-white/12 bg-surface/80 p-[1.7vw]"><div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">06</div><h3 className="mt-[1.3vh] font-display text-[2.15vw] font-semibold">Transport</h3><p className="mt-[1vh] text-[2vw] leading-[1.24] text-muted">Courses Taxi, chauffeurs et véhicules.</p></div>
        <div className="col-span-2 border border-white/12 bg-surface/80 p-[1.7vw]"><div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">07</div><h3 className="mt-[1.3vh] font-display text-[2.15vw] font-semibold">Immobilier</h3><p className="mt-[1vh] text-[2vw] leading-[1.24] text-muted">Biens, annonces, prospects et demandes de visite.</p></div>
      </div>
    </DeckPage>
  );
}