export default function Rollout() {
  return (
    <div className='deck-bg deck-grid relative w-screen h-screen overflow-hidden text-text'>
      <div className='absolute left-[7vw] top-[7vh] h-[0.22vh] w-[4vw] bg-accent' />
      <span className='absolute right-[7vw] top-[6.8vh] font-body text-[1.5vw] font-semibold tracking-[0.14em] text-muted'>09 / 10</span>
      <main className='relative z-10 flex h-full flex-col px-[8vw] pb-[8vh] pt-[12vh]'>
        <h1 className='max-w-[80vw] font-display text-[3.65vw] font-semibold leading-[1.04] tracking-[-0.04em] text-balance'>Un déploiement progressif adapté à votre organisation</h1>
        <div className='mt-[8vh] grid flex-1 grid-cols-4 gap-[1.2vw]'>
          <section className='flex flex-col justify-between border-t-[0.28vh] border-accent bg-surface/80 p-[1.8vw]'>
            <span className='font-display text-[4.8vw] font-semibold leading-none tracking-[-0.06em] text-accent'>01</span>
            <p className='font-body text-[2vw] font-medium leading-[1.24] text-pretty'>Cadrer les sites, les équipes, les tarifs et les responsabilités.</p>
          </section>
          <section className='flex flex-col justify-between border-t-[0.28vh] border-teal bg-surface/80 p-[1.8vw]'>
            <span className='font-display text-[4.8vw] font-semibold leading-none tracking-[-0.06em] text-teal'>02</span>
            <p className='font-body text-[2vw] font-medium leading-[1.24] text-pretty'>Piloter sur un périmètre défini avec des chauffeurs et véhicules représentatifs.</p>
          </section>
          <section className='flex flex-col justify-between border-t-[0.28vh] border-accent bg-surface/80 p-[1.8vw]'>
            <span className='font-display text-[4.8vw] font-semibold leading-none tracking-[-0.06em] text-accent'>03</span>
            <p className='font-body text-[2vw] font-medium leading-[1.24] text-pretty'>Examiner les demandes, les courses, les recettes et la disponibilité.</p>
          </section>
          <section className='flex flex-col justify-between border-t-[0.28vh] border-teal bg-surface/80 p-[1.8vw]'>
            <span className='font-display text-[4.8vw] font-semibold leading-none tracking-[-0.06em] text-teal'>04</span>
            <p className='font-body text-[2vw] font-medium leading-[1.24] text-pretty'>Étendre par étapes après validation du pilote.</p>
          </section>
        </div>
      </main>
    </div>
  );
}