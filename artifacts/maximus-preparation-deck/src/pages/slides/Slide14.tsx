import { DeckPage } from '../SlideLayout';

export default function Slide14() {
  return (
    <DeckPage section="07 — E-COMMERCE · 3/4" title="Suivre la commande de sa création à sa livraison" subtitle="L’équipe sait où en est la commande et peut faire avancer son traitement." page="14">
      <div className="flex h-full flex-col justify-center">
        <div className="grid grid-cols-5 gap-[1vw]">
          <div className="border border-white/12 bg-surface/80 p-[1.5vw]"><span className="text-[1.5vw] font-bold text-accent">01</span><h3 className="mt-[1vh] font-display text-[2.15vw] font-semibold">Nouvelle</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.2] text-muted">La commande arrive dans l’espace entreprise.</p></div>
          <div className="border border-white/12 bg-surface/80 p-[1.5vw]"><span className="text-[1.5vw] font-bold text-accent">02</span><h3 className="mt-[1vh] font-display text-[2.15vw] font-semibold">Confirmée</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.2] text-muted">L’équipe vérifie la demande avant préparation.</p></div>
          <div className="border border-white/12 bg-surface/80 p-[1.5vw]"><span className="text-[1.5vw] font-bold text-accent">03</span><h3 className="mt-[1vh] font-display text-[2.15vw] font-semibold">En préparation</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.2] text-muted">Les articles sont rassemblés et préparés.</p></div>
          <div className="border border-white/12 bg-surface/80 p-[1.5vw]"><span className="text-[1.5vw] font-bold text-accent">04</span><h3 className="mt-[1vh] font-display text-[2.15vw] font-semibold">Expédiée</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.2] text-muted">La livraison ou le retrait est en cours.</p></div>
          <div className="border border-accent/35 bg-accent/10 p-[1.5vw]"><span className="text-[1.5vw] font-bold text-accent">05</span><h3 className="mt-[1vh] font-display text-[2.15vw] font-semibold">Livrée / annulée</h3><p className="mt-[0.8vh] text-[2vw] leading-[1.2] text-muted">Le statut final reste visible dans l’historique.</p></div>
        </div>
        <div className="mt-[3vh] grid grid-cols-3 gap-[1vw] border-t border-accent/35 pt-[2vh]">
          <p className="text-[2vw] leading-[1.25] text-muted">Commandes et clients consultables depuis le tableau de gestion.</p>
          <p className="text-[2vw] leading-[1.25] text-muted">Des profils employés et managers distinguent traitement et configuration.</p>
          <p className="text-[2vw] leading-[1.25] text-muted">Les documents de commande conservent les détails et tarifs convenus.</p>
        </div>
      </div>
    </DeckPage>
  );
}