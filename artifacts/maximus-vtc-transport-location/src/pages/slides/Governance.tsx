export default function Governance() {
  return (
    <div className='deck-bg deck-grid relative w-screen h-screen overflow-hidden text-text'>
      <div className='absolute left-[7vw] top-[7vh] h-[0.22vh] w-[4vw] bg-accent' />
      <span className='absolute right-[7vw] top-[6.8vh] font-body text-[1.5vw] font-semibold tracking-[0.14em] text-muted'>08 / 10</span>
      <main className='relative z-10 flex h-full flex-col px-[8vw] pb-[8vh] pt-[12vh]'>
        <h1 className='max-w-[80vw] font-display text-[3.65vw] font-semibold leading-[1.04] tracking-[-0.04em] text-balance'>Des règles opérationnelles visibles et contrôlées</h1>
        <div className='mt-[7vh] grid flex-1 grid-cols-2 grid-rows-2 gap-[1.4vw]'>
          <section className='flex items-start gap-[1.7vw] border border-white/10 bg-surface/85 p-[2vw]'>
            <span className='mt-[0.5vh] h-[1.2vw] w-[1.2vw] shrink-0 border border-accent/80 bg-accent/15' />
            <p className='font-body text-[2vw] font-medium leading-[1.28] text-pretty'>Chauffeurs et véhicules ne sont affectés qu’en fonction de leur disponibilité.</p>
          </section>
          <section className='flex items-start gap-[1.7vw] border border-white/10 bg-surface/85 p-[2vw]'>
            <span className='mt-[0.5vh] h-[1.2vw] w-[1.2vw] shrink-0 border border-teal/80 bg-teal/15' />
            <p className='font-body text-[2vw] font-medium leading-[1.28] text-pretty'>Les changements d’état suivent le cycle de la course.</p>
          </section>
          <section className='flex items-start gap-[1.7vw] border border-white/10 bg-surface/85 p-[2vw]'>
            <span className='mt-[0.5vh] h-[1.2vw] w-[1.2vw] shrink-0 border border-accent/80 bg-accent/15' />
            <p className='font-body text-[2vw] font-medium leading-[1.28] text-pretty'>Le code de prise en charge confirme le démarrage.</p>
          </section>
          <section className='flex items-start gap-[1.7vw] border border-accent/30 bg-accent/10 p-[2vw]'>
            <span className='mt-[0.5vh] h-[1.2vw] w-[1.2vw] shrink-0 border border-accent/80 bg-accent/15' />
            <p className='font-body text-[2vw] font-medium leading-[1.28] text-pretty'>Les rôles et permissions peuvent suivre les responsabilités de l’entreprise.</p>
          </section>
        </div>
      </main>
    </div>
  );
}