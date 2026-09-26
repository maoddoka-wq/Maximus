export default function Operations() {
  return (
    <div className='deck-bg deck-grid relative w-screen h-screen overflow-hidden text-text'>
      <div className='absolute left-[7vw] top-[7vh] h-[0.22vh] w-[4vw] bg-accent' />
      <span className='absolute right-[7vw] top-[6.8vh] font-body text-[1.5vw] font-semibold tracking-[0.14em] text-muted'>03 / 10</span>
      <main className='relative z-10 flex h-full flex-col px-[8vw] pb-[8vh] pt-[12vh]'>
        <h1 className='max-w-[80vw] font-display text-[3.6vw] font-semibold leading-[1.04] tracking-[-0.04em] text-balance'>Un poste de pilotage pour l’exploitation VTC</h1>
        <div className='mt-[7vh] grid flex-1 grid-cols-2 grid-rows-2 gap-[1.5vw]'>
          <section className='flex items-end justify-between border border-white/10 bg-surface/85 p-[2.4vw]'>
            <p className='max-w-[31vw] font-display text-[2.35vw] font-medium leading-[1.22] text-pretty'>Courses du jour et historique des statuts.</p>
            <span className='mb-[0.3vh] h-[4.5vh] w-[0.22vw] bg-accent' />
          </section>
          <section className='flex items-end justify-between border border-white/10 bg-surface/85 p-[2.4vw]'>
            <p className='max-w-[31vw] font-display text-[2.35vw] font-medium leading-[1.22] text-pretty'>Chauffeurs actifs et véhicules disponibles.</p>
            <span className='mb-[0.3vh] h-[4.5vh] w-[0.22vw] bg-teal' />
          </section>
          <section className='flex items-end justify-between border border-white/10 bg-surface/85 p-[2.4vw]'>
            <p className='max-w-[31vw] font-display text-[2.35vw] font-medium leading-[1.22] text-pretty'>Recettes suivies par période.</p>
            <span className='mb-[0.3vh] h-[4.5vh] w-[0.22vw] bg-accent' />
          </section>
          <section className='flex items-end justify-between border border-accent/30 bg-accent/10 p-[2.4vw]'>
            <p className='max-w-[31vw] font-display text-[2.35vw] font-medium leading-[1.22] text-pretty'>Tarifs et paramètres de course configurables par l’entreprise.</p>
            <span className='mb-[0.3vh] h-[4.5vh] w-[0.22vw] bg-accent' />
          </section>
        </div>
      </main>
    </div>
  );
}