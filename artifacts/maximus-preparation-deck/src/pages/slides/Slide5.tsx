import { DeckPage } from '../SlideLayout';

export default function Slide5() {
  return (
    <DeckPage section="04 — ORGANISATION ET ACCÈS" title="Les bons écrans pour les bonnes responsabilités" subtitle="Une entreprise organise son espace de travail et délègue les actions sans partager tous les droits à tout le monde." page="05">
      <div className="grid h-full grid-cols-2 gap-[2vw]">
        <div className="border border-white/12 bg-surface/80 p-[2.2vw]">
          <div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Structure de l’entreprise</div>
          <div className="mt-[2vh] space-y-[1.7vh] text-[2vw] leading-[1.28]">
            <p><span className="text-accent">01</span> Unités et équipes métier</p>
            <p><span className="text-accent">02</span> Employés rattachés à leur organisation</p>
            <p><span className="text-accent">03</span> Responsables et managers désignés</p>
            <p><span className="text-accent">04</span> Modules attribués au périmètre de l’entreprise</p>
          </div>
        </div>
        <div className="border border-accent/35 bg-accent/10 p-[2.2vw]">
          <div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Droits opérationnels</div>
          <div className="mt-[2vh] space-y-[1.7vh] text-[2vw] leading-[1.28]">
            <p>Consultation, création ou modification, selon la fonction.</p>
            <p>Profils adaptés : employé, responsable ou manager.</p>
            <p>Accès limité aux fonctions activées pour l’entreprise et le rôle.</p>
            <p>Les données d’une entreprise restent dans son propre périmètre.</p>
          </div>
        </div>
      </div>
    </DeckPage>
  );
}
