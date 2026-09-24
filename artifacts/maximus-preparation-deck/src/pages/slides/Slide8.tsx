import { DeckPage } from '../SlideLayout';

export default function Slide8() {
  return (
    <DeckPage section="05 — GESTION COMMERCIALE · 3/3" title="Une gestion qui garde les responsabilités lisibles" subtitle="La configuration commerciale distingue les opérations visibles, les actions autorisées et les règles propres à l’entreprise." page="08">
      <div className="grid h-full grid-cols-[1.12fr_0.88fr] gap-[2vw]">
        <div className="flex flex-col justify-between border border-white/12 bg-surface/80 p-[2.1vw]">
          <div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Exemples de profils</div>
          <div className="border-b border-white/15 pb-[1.1vh]"><h3 className="font-display text-[2.2vw] font-semibold">Consultation</h3><p className="mt-[0.4vh] text-[2vw] text-muted">Consulter les clients et les indicateurs autorisés.</p></div>
          <div className="border-b border-white/15 pb-[1.1vh]"><h3 className="font-display text-[2.2vw] font-semibold">Employé commercial</h3><p className="mt-[0.4vh] text-[2vw] text-muted">Créer et suivre les ventes qui lui sont confiées.</p></div>
          <div><h3 className="font-display text-[2.2vw] font-semibold">Manager commercial</h3><p className="mt-[0.4vh] text-[2vw] text-muted">Piloter clients, ventes, produits, achats et rapports de l’équipe.</p></div>
        </div>
        <div className="flex flex-col justify-center border border-accent/35 bg-accent/10 p-[2.2vw]">
          <h3 className="font-display text-[2.6vw] font-semibold leading-[1.15]">À paramétrer avec l’entreprise</h3>
          <div className="mt-[2vh] space-y-[1.4vh] text-[2vw] leading-[1.28] text-muted">
            <p>Types de documents, devise et règles de prix.</p>
            <p>Étapes de validation et rôles responsables.</p>
            <p>Pièces à produire et indicateurs à suivre.</p>
          </div>
        </div>
      </div>
    </DeckPage>
  );
}
