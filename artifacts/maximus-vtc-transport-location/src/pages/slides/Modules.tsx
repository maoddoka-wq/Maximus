export default function Modules() {
  return (
    <div className='deck-bg deck-grid relative w-screen h-screen overflow-hidden text-text'>
      <div className='absolute left-[7vw] top-[7vh] h-[0.22vh] w-[4vw] bg-accent' />
      <span className='absolute right-[7vw] top-[6.8vh] font-body text-[1.5vw] font-semibold tracking-[0.14em] text-muted'>02 / 10</span>
      <main className='relative z-10 flex h-full flex-col px-[8vw] pb-[8vh] pt-[12vh]'>
        <h1 className='max-w-[76vw] font-display text-[3.7vw] font-semibold leading-[1.03] tracking-[-0.04em] text-balance'>Deux parcours complémentaires, deux cycles distincts</h1>
        <div className='mt-[8vh] grid flex-1 grid-cols-2 gap-[2vw]'>
          <section className='flex flex-col justify-between border border-white/10 bg-surface/85 p-[2.5vw]'>
            <span className='font-body text-[1.5vw] font-bold uppercase tracking-[0.17em] text-accent'>TRANSPORT</span>
            <p className='max-w-[35vw] font-display text-[2.35vw] font-medium leading-[1.23] text-pretty'>Transport : demandes, chauffeurs, véhicules, affectations et suivi des statuts.</p>
            <div className='h-[0.2vh] w-[5vw] bg-accent/80' />
          </section>
          <section className='flex flex-col justify-between border border-white/10 bg-surface/85 p-[2.5vw]'>
            <span className='font-body text-[1.5vw] font-bold uppercase tracking-[0.17em] text-teal'>LOCATION</span>
            <p className='max-w-[35vw] font-display text-[2.35vw] font-medium leading-[1.23] text-pretty'>Location : catalogue de véhicules, dates souhaitées et demande de contact.</p>
            <div className='h-[0.2vh] w-[5vw] bg-teal/80' />
          </section>
        </div>
        <p className='mt-[3vh] border-t border-white/10 pt-[2.2vh] font-body text-[2vw] font-medium leading-[1.3] text-pretty text-muted'>Un même environnement MAXIMUS, sans confondre une course VTC et une demande de location.</p>
      </main>
    </div>
  );
}