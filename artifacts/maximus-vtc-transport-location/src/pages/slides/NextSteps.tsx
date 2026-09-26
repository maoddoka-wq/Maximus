export default function NextSteps() {
  return (
    <div className='deck-bg deck-grid relative w-screen h-screen overflow-hidden text-text'>
      <div className='absolute left-[7vw] top-[7vh] h-[0.22vh] w-[4vw] bg-accent' />
      <span className='absolute right-[7vw] top-[6.8vh] font-body text-[1.45vw] font-semibold tracking-[0.14em] text-muted'>10 / 10</span>
      <main className='relative z-10 flex h-full flex-col justify-center px-[8vw] py-[12vh]'>
        <p className='font-body text-[1.5vw] font-bold uppercase tracking-[0.18em] text-accent'>MAXIMUS · TRANSPORT &amp; LOCATION</p>
        <h1 className='mt-[2vh] max-w-[78vw] font-display text-[4.1vw] font-semibold leading-[1.02] tracking-[-0.045em] text-balance'>Décisions proposées pour démarrer</h1>
        <div className='mt-[7vh] grid grid-cols-2 gap-x-[4vw] gap-y-[2.4vh]'>
          <p className='border-t border-white/15 pt-[1.7vh] font-body text-[1.85vw] font-medium leading-[1.28] text-pretty'>Confirmer le périmètre : Transport, Location ou les deux.</p>
          <p className='border-t border-white/15 pt-[1.7vh] font-body text-[1.85vw] font-medium leading-[1.28] text-pretty'>Désigner les référents exploitation, flotte et informatique.</p>
          <p className='border-t border-white/15 pt-[1.7vh] font-body text-[1.85vw] font-medium leading-[1.28] text-pretty'>Choisir le périmètre du pilote et les indicateurs de suivi.</p>
          <p className='border-t border-white/15 pt-[1.7vh] font-body text-[1.85vw] font-medium leading-[1.28] text-pretty'>Planifier un atelier de cadrage et une démonstration sur vos parcours réels.</p>
        </div>
      </main>
    </div>
  );
}