import { DeckPage } from '../SlideLayout';

export default function Slide16() {
  return (
    <DeckPage section="08 — PRÉSENCES · 1/3" title="Enregistrer les arrivées et les départs" subtitle="Un parcours de pointage simple, associé aux comptes des employés et aux données de l’entreprise." page="16">
      <div className="grid h-full grid-cols-[0.75fr_1.25fr] gap-[2vw]">
        <div className="flex flex-col items-center justify-center border border-accent/35 bg-accent/10 text-center">
          <div className="flex h-[18vw] w-[18vw] items-center justify-center border-[0.45vw] border-accent">
            <div className="grid h-[12vw] w-[12vw] grid-cols-3 grid-rows-3 gap-[0.5vw]">
              <span className="bg-accent" /><span className="bg-transparent" /><span className="bg-accent" />
              <span className="bg-transparent" /><span className="bg-accent" /><span className="bg-transparent" />
              <span className="bg-accent" /><span className="bg-transparent" /><span className="bg-accent" />
            </div>
          </div>
          <span className="mt-[1.8vh] text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent">QR du jour</span>
        </div>
        <div className="flex flex-col justify-center gap-[1.6vh]">
          <div className="border-b border-white/15 pb-[1.5vh]"><span className="text-[1.5vw] font-bold text-accent">01</span><h3 className="mt-[0.6vh] font-display text-[2.3vw] font-semibold">Le gérant affiche le QR code</h3><p className="mt-[0.5vh] text-[2vw] leading-[1.22] text-muted">Le pointage s’ouvre pour la journée dans l’espace Présences.</p></div>
          <div className="border-b border-white/15 pb-[1.5vh]"><span className="text-[1.5vw] font-bold text-accent">02</span><h3 className="mt-[0.6vh] font-display text-[2.3vw] font-semibold">L’employé scanne avec son compte</h3><p className="mt-[0.5vh] text-[2vw] leading-[1.22] text-muted">Chaque entrée est attribuée à l’identité connectée.</p></div>
          <div><span className="text-[1.5vw] font-bold text-accent">03</span><h3 className="mt-[0.6vh] font-display text-[2.3vw] font-semibold">Arrivée puis départ</h3><p className="mt-[0.5vh] text-[2vw] leading-[1.22] text-muted">Les événements alimentent l’historique journalier de l’équipe.</p></div>
        </div>
      </div>
    </DeckPage>
  );
}