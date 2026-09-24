import { DeckPage } from '../SlideLayout';

export default function Slide30() {
  return (
    <DeckPage section="12 — SOCLE TRANSVERSE · 3/3" title="MAXIMUS s’adapte à votre activité" subtitle="La prochaine étape consiste à choisir le périmètre qui répond à vos priorités." page="30">
      <div className="grid h-full grid-cols-[1.05fr_0.95fr] gap-[2vw]">
        <div className="flex flex-col justify-center">
          <div className="font-display text-[5.5vw] font-semibold leading-[0.95] tracking-[-0.08em]">Votre métier.<br /><span className="text-accent">Votre sélection.</span></div>
          <p className="mt-[2.5vh] max-w-[50vw] text-[2.1vw] leading-[1.3] text-muted">Les modules et fonctionnalités sont choisis avec chaque entreprise, puis ajustés aux personnes qui les utilisent.</p>
        </div>
        <div className="flex flex-col justify-center border border-accent/35 bg-accent/10 p-[2.2vw]">
          <div className="text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">Pour préparer la démonstration</div>
          <div className="mt-[1.6vh] space-y-[1.3vh] text-[2vw] leading-[1.28]">
            <p>1. Choisir les trois priorités de l’entreprise.</p>
            <p>2. Identifier les équipes et responsables concernés.</p>
            <p>3. Sélectionner les modules et fonctions à montrer.</p>
            <p>4. Valider les limites, données et intégrations à prévoir.</p>
          </div>
        </div>
      </div>
    </DeckPage>
  );
}