export default function Slide9() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text font-body">
      <div className="absolute right-0 top-0 h-full w-[30vw] bg-primary/40" />
      <div className="absolute right-[8vw] top-[11vh] text-[1.5vw] font-semibold uppercase tracking-[0.22em] text-accent">08 — Production</div>
      <div className="relative flex h-full w-full flex-col px-[8vw] py-[10vh]">
        <h2 className="max-w-[78vw] font-display text-[3.8vw] font-semibold leading-[1.02] tracking-[-0.055em] text-balance">Une base technique prête pour la production</h2>
        <div className="mt-[5vh] grid flex-1 grid-cols-[1.65fr_0.85fr] gap-[6vw]">
          <div className="grid grid-cols-2 gap-x-[4vw] gap-y-[2.6vh] pt-[1vh]">
            <div className="border-t-[0.08vw] border-accent/55 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">Frontend React et API Laravel en migration progressive</div>
            <div className="border-t-[0.08vw] border-white/15 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">PostgreSQL comme base de production</div>
            <div className="border-t-[0.08vw] border-white/15 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">Déploiement Render avec migrations et contrôle de santé</div>
            <div className="border-t-[0.08vw] border-white/15 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">Fichiers persistants et ressources publiques protégées</div>
            <div className="border-t-[0.08vw] border-white/15 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">Domaines personnalisés vérifiés par DNS</div>
            <div className="border-t-[0.08vw] border-accent/55 pt-[1.8vh] text-[2.05vw] leading-[1.2] text-pretty">Isolation serveur : le client ne peut pas changer son entreprise</div>
          </div>
          <div className="flex flex-col justify-center border-l-[0.16vw] border-accent pl-[3vw]">
            <div className="text-[1.5vw] uppercase tracking-[0.2em] text-accent">Chaîne de confiance</div>
            <div className="mt-[3vh] border border-white/15 bg-surface/80 p-[1.8vw]"><div className="font-display text-[2.5vw] font-semibold">React</div><div className="mt-[1vh] h-[0.14vw] w-full bg-white/15" /><div className="mt-[1.6vh] font-display text-[2.5vw] font-semibold">Laravel</div><div className="mt-[1vh] h-[0.14vw] w-full bg-white/15" /><div className="mt-[1.6vh] font-display text-[2.5vw] font-semibold">PostgreSQL</div><div className="mt-[1vh] h-[0.14vw] w-full bg-accent" /><div className="mt-[1.6vh] font-display text-[2.5vw] font-semibold text-accent">Render</div></div>
          </div>
        </div>
        <div className="flex justify-between text-[1.5vw] uppercase tracking-[0.18em] text-muted"><span>MAXIMUS ERP</span><span>09 / 10</span></div>
      </div>
    </div>
  );
}
