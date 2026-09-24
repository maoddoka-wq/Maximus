import { DeckPage } from '../SlideLayout';

export default function Slide9() {
  return (
    <DeckPage section="06 — GESTION DE STOCK · 1/3" title="Un référentiel clair avant de déplacer les articles" subtitle="Le module organise les produits et les informations nécessaires au suivi des quantités." page="09">
      <div className="grid h-full grid-cols-[0.8fr_1.2fr] gap-[2vw]">
        <div className="flex flex-col justify-center border border-accent/35 bg-accent/10 p-[2.5vw]">
          <div className="font-display text-[5.2vw] font-semibold leading-[0.95] tracking-[-0.07em] text-accent">ARTICLES</div>
          <p className="mt-[2vh] text-[2vw] leading-[1.3] text-muted">Une base commune pour les entrées, les sorties, les demandes et les inventaires.</p>
        </div>
        <div className="grid grid-cols-2 gap-[1.2vw]">
          <div className="border border-white/12 bg-surface/80 p-[1.8vw]"><h3 className="font-display text-[2.2vw] font-semibold">Fiches produit</h3><p className="mt-[1.2vh] text-[2vw] leading-[1.28] text-muted">Identifier les articles et les informations utiles à leur suivi.</p></div>
          <div className="border border-white/12 bg-surface/80 p-[1.8vw]"><h3 className="font-display text-[2.2vw] font-semibold">Référentiels</h3><p className="mt-[1.2vh] text-[2vw] leading-[1.28] text-muted">Structurer les catégories et les références selon les besoins.</p></div>
          <div className="border border-white/12 bg-surface/80 p-[1.8vw]"><h3 className="font-display text-[2.2vw] font-semibold">Seuils d’alerte</h3><p className="mt-[1.2vh] text-[2vw] leading-[1.28] text-muted">Repérer les quantités qui demandent une vérification ou un réapprovisionnement.</p></div>
          <div className="border border-white/12 bg-surface/80 p-[1.8vw]"><h3 className="font-display text-[2.2vw] font-semibold">Utilisateurs</h3><p className="mt-[1.2vh] text-[2vw] leading-[1.28] text-muted">Réserver les opérations aux personnes autorisées.</p></div>
        </div>
      </div>
    </DeckPage>
  );
}