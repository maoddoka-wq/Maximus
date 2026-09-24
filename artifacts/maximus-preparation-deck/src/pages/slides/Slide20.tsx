import { DeckPage } from '../SlideLayout';

export default function Slide20() {
  return (
    <DeckPage section="09 — PAIE · 2/3" title="Préparer une campagne de paiement avant exécution" subtitle="Les équipes peuvent vérifier les bénéficiaires, les montants et les validations attendues dans un même parcours." page="20">
      <div className="grid h-full grid-cols-4 gap-[1.15vw]">
        <div className="flex flex-col justify-between border border-white/12 bg-surface/80 p-[1.7vw]"><span className="font-display text-[3vw] font-semibold text-accent">01</span><div><h3 className="font-display text-[2.15vw] font-semibold">Sélectionner</h3><p className="mt-[1vh] text-[2vw] leading-[1.24] text-muted">Choisir les personnes et la période concernées.</p></div></div>
        <div className="flex flex-col justify-between border border-white/12 bg-surface/80 p-[1.7vw]"><span className="font-display text-[3vw] font-semibold text-accent">02</span><div><h3 className="font-display text-[2.15vw] font-semibold">Préparer</h3><p className="mt-[1vh] text-[2vw] leading-[1.24] text-muted">Saisir les données de paiement prévues pour la campagne.</p></div></div>
        <div className="flex flex-col justify-between border border-white/12 bg-surface/80 p-[1.7vw]"><span className="font-display text-[3vw] font-semibold text-accent">03</span><div><h3 className="font-display text-[2.15vw] font-semibold">Vérifier</h3><p className="mt-[1vh] text-[2vw] leading-[1.24] text-muted">Contrôler les montants, coordonnées et autorisations.</p></div></div>
        <div className="flex flex-col justify-between border border-accent/35 bg-accent/10 p-[1.7vw]"><span className="font-display text-[3vw] font-semibold text-accent">04</span><div><h3 className="font-display text-[2.15vw] font-semibold">Valider</h3><p className="mt-[1vh] text-[2vw] leading-[1.24] text-muted">Faire approuver la campagne par le rôle habilité.</p></div></div>
      </div>
    </DeckPage>
  );
}